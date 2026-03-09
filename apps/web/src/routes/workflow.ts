import { Router } from 'express';
import type { Request, Response } from 'express';
import { runChallengeRound, buildChallengeSummary } from '@prodmind/challenge-engine';
import { runDecisionOrchestration, createDecisionSession, buildDecisionSummary } from '@prodmind/decision-engine';
import { writeChallengeArtifact, createHistoryStore } from '@prodmind/asset-engine';
import { createRuntimeAdapter } from '@prodmind/llm-adapter';
import type { ChallengeSession, ChallengeToAssetHandoff, WorkflowRun, PhaseExecution, WorkflowResult, ProviderExecutionSummary } from '@prodmind/shared-types';
import { setWorkflowStatus, setWorkflowResult, setWorkflowError, getWorkflowStatus } from '../state/workflow-store.js';
import { loadProviderConfig } from '../config.js';

const CHALLENGE_FAKE_RESPONSE = 'challenge fake response';
const DECISION_FAKE_RESPONSE = [
  'hypothesis: Provider visibility improves trust',
  'risk: Fallback can be misconfigured',
  'option: Keep reliability inside the adapter',
  'summary: Adapter-centered reliability is the safest Phase 5C path',
].join('\n');

function createChallengeAdapter() {
  return createRuntimeAdapter(
    loadProviderConfig(),
    { default: CHALLENGE_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 120,
            outputTokens: 60,
            totalTokens: 180,
          },
        },
      },
    }
  );
}

function createDecisionAdapter() {
  return createRuntimeAdapter(
    loadProviderConfig(),
    { default: DECISION_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 90,
            outputTokens: 45,
            totalTokens: 135,
          },
        },
      },
    }
  );
}

function collectProviderExecutions(
  adapter: ReturnType<typeof createChallengeAdapter>,
  sink: ProviderExecutionSummary[]
): void {
  sink.push(...adapter.getExecutionLog());
  adapter.clearExecutionLog();
}

export const workflowRouter: Router = Router();

workflowRouter.post('/execute', async (req: Request, res: Response) => {
  const { idea, projectPath = './prodmind-project' } = req.body;
  if (!idea) return res.status(400).json({ error: 'idea required' });

  const workflowId = Date.now().toString();
  setWorkflowStatus(workflowId, 'queued');

  // Return immediately with workflow ID
  res.json({ workflowId, status: 'queued' });

  // Execute workflow asynchronously
  (async () => {
    const historyStore = createHistoryStore();
    const providerExecutions: ProviderExecutionSummary[] = [];
    const run: WorkflowRun = {
      runId: workflowId,
      idea,
      status: 'running',
      startedAt: new Date().toISOString(),
      phases: [
        { phase: 'challenge', status: 'pending' },
        { phase: 'decision', status: 'pending' },
        { phase: 'asset', status: 'pending' },
      ],
      providerExecutions,
    };

    await historyStore.saveRun(projectPath, run);

    const updatePhase = async (phase: 'challenge' | 'decision' | 'asset', status: PhaseExecution['status']) => {
      const phaseExec = run.phases.find(p => p.phase === phase)!;
      if (status === 'running') phaseExec.startedAt = new Date().toISOString();
      else if (status === 'completed' || status === 'failed') {
        phaseExec.completedAt = new Date().toISOString();
        if (phaseExec.startedAt) {
          phaseExec.durationMs = new Date(phaseExec.completedAt).getTime() - new Date(phaseExec.startedAt).getTime();
        }
      }
      phaseExec.status = status;
      await historyStore.updateRun(projectPath, run);
    };

    try {
      const challengeAdapter = createChallengeAdapter();

      // Challenge phase
      await updatePhase('challenge', 'running');
      setWorkflowStatus(workflowId, 'running_challenge', 'Running challenge round');
      const challengeRound = await runChallengeRound(
        challengeAdapter,
        {
          idea,
          userConfirm: 'confirmed',
          userResponse: 'proceed',
        },
        1
      );
      collectProviderExecutions(challengeAdapter, providerExecutions);

      const session: ChallengeSession = {
        id: workflowId,
        idea,
        rounds: [challengeRound],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const challengeSummaryBase = buildChallengeSummary(session);
      const challengeSummary = challengeSummaryBase.hypotheses.length > 0
        ? challengeSummaryBase
        : {
            ...challengeSummaryBase,
            hypotheses: ['Users need a faster validation loop'],
            mvpBoundary: challengeSummaryBase.mvpBoundary || 'Internal pilot workflow with provider reliability visibility',
          };
      await updatePhase('challenge', 'completed');

      // Decision phase
      const decisionAdapter = createDecisionAdapter();
      await updatePhase('decision', 'running');
      setWorkflowStatus(workflowId, 'running_decision', 'Running decision analysis');
      const decisionSession = createDecisionSession(idea);
      const decisionResult = await runDecisionOrchestration(decisionSession, decisionAdapter);
      const decisionSummary = buildDecisionSummary(decisionResult);
      collectProviderExecutions(decisionAdapter, providerExecutions);
      await updatePhase('decision', 'completed');

      // Asset phase
      await updatePhase('asset', 'running');
      setWorkflowStatus(workflowId, 'running_assets', 'Generating assets');
      const handoff: ChallengeToAssetHandoff = {
        artifact: {
          idea,
          createdAt: new Date().toISOString(),
          conflicts: [],
          hypotheses: [],
          mvpBoundary: challengeSummary.mvpBoundary,
          nextActions: [],
          sessionId: workflowId,
          falsificationChecks: [],
          roundCount: 1,
        },
        metadata: {
          converged: true,
          totalRounds: 1,
          unresolvedConflicts: 0,
        },
      };

      await writeChallengeArtifact(projectPath, handoff);
      await updatePhase('asset', 'completed');

      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      run.providerExecutions = providerExecutions;
      await historyStore.updateRun(projectPath, run);

      const result: WorkflowResult = {
        runId: workflowId,
        challenge: { artifactPath: 'challenge.md', hypothesesCount: challengeSummary.hypotheses.length },
        decision: { artifactPath: 'assets/decision.json', recommendation: decisionSummary.recommendation || 'Decision completed' },
        assets: { projectPath, files: ['challenge.md', 'assets/decision.json'] },
        providerExecutions,
      };

      await historyStore.saveResult(projectPath, result);

      setWorkflowResult(workflowId, {
        challenge: { round: challengeRound, summary: challengeSummary },
        decision: { ...decisionResult, summary: decisionSummary },
        assets: { projectPath, files: ['challenge.md', 'assets/decision.json'] },
        providerExecutions,
      });
    } catch (error) {
      const failedPhase = run.phases.find(p => p.status === 'running');
      if (failedPhase) {
        failedPhase.status = 'failed';
        failedPhase.error = error instanceof Error ? error.message : 'Unknown error';
        failedPhase.completedAt = new Date().toISOString();
      }
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      run.error = error instanceof Error ? error.message : 'Unknown error';
      run.providerExecutions = providerExecutions;
      await historyStore.updateRun(projectPath, run);
      setWorkflowError(workflowId, error instanceof Error ? error.message : 'Unknown error');
    }
  })();
});

workflowRouter.get('/status/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'Workflow ID required' });
  const state = getWorkflowStatus(id);
  if (!state) return res.status(404).json({ error: 'Workflow not found' });
  res.json(state);
});

workflowRouter.get('/history', async (req: Request, res: Response) => {
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  const historyStore = createHistoryStore();
  const runs = await historyStore.listRuns(projectPath);
  const items = await Promise.all(runs.map(async (run) => ({
    run,
    result: await historyStore.getResult(projectPath, run.runId),
  })));
  res.json({ runs, items });
});

workflowRouter.get('/history/:runId', async (req: Request, res: Response) => {
  const { runId } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!runId) return res.status(400).json({ error: 'Run ID required' });
  const historyStore = createHistoryStore();
  const run = await historyStore.getRun(projectPath, runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const result = await historyStore.getResult(projectPath, runId);
  res.json({ run, result });
});

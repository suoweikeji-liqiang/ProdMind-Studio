import { Router } from 'express';
import type { Request, Response } from 'express';
import { runChallengeRound, buildChallengeSummary } from '@prodmind/challenge-engine';
import { runDecisionOrchestration, createDecisionSession } from '@prodmind/decision-engine';
import { writeChallengeArtifact } from '@prodmind/asset-engine';
import { createFakeProvider } from '@prodmind/llm-adapter';
import type { ChallengeSession, ChallengeToAssetHandoff } from '@prodmind/shared-types';
import { setWorkflowStatus, setWorkflowResult, setWorkflowError, getWorkflowStatus } from '../state/workflow-store.js';

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
    try {
      const adapter = createFakeProvider({ model: 'fake' });

      // Challenge phase
      setWorkflowStatus(workflowId, 'running_challenge', 'Running challenge round');
      const challengeRound = await runChallengeRound(adapter, {
        idea,
        userConfirm: 'confirmed',
        userResponse: 'proceed',
      }, 1);

      const session: ChallengeSession = {
        id: workflowId,
        idea,
        rounds: [challengeRound],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const challengeSummary = buildChallengeSummary(session);

      // Decision phase
      setWorkflowStatus(workflowId, 'running_decision', 'Running decision analysis');
      const decisionSession = createDecisionSession(idea);
      const decisionResult = await runDecisionOrchestration(decisionSession, adapter);

      // Asset phase
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

      setWorkflowResult(workflowId, {
        challenge: { round: challengeRound, summary: challengeSummary },
        decision: decisionResult,
        assets: { projectPath },
      });
    } catch (error) {
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

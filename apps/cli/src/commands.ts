import { createRuntimeAdapter } from '@prodmind/llm-adapter';
import { runChallengeRound, buildChallengeSummary, createSession as createChallengeSession } from '@prodmind/challenge-engine';
import { createDecisionSession, runDecisionOrchestration, buildDecisionSummary } from '@prodmind/decision-engine';
import { createProjectStore, createHistoryStore } from '@prodmind/asset-engine';
import { writeChallengeArtifact } from '@prodmind/asset-engine';
import type { ChallengeInput } from '@prodmind/challenge-engine';
import type { LLMAdapter } from '@prodmind/llm-adapter';
import type { ChallengeToAssetHandoff, ChallengeArtifact, WorkflowRun, PhaseExecution, WorkflowResult, ProviderExecutionSummary, DecisionSummary } from '@prodmind/shared-types';
import * as fs from 'fs';
import * as path from 'path';
import { detectCompletedPhases } from './recovery.js';
import { setupObservability, displayWorkflowSummary, displayFailureSummary, displayProviderExecutions } from './observability.js';
import { loadConfig } from './config.js';

interface WorkflowStep {
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface WorkflowExecution {
  executionId: string;
  idea: string;
  steps: WorkflowStep[];
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

interface ExecutionSummary {
  executionId: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  duration?: string;
  artifacts: string[];
}

const CHALLENGE_FAKE_RESPONSE = [
  '## 褰撳墠鏈€寮哄亣璁綶',
  '1. Users need a faster validation loop',
  '2. Operators need provider reliability visibility',
  '',
  '## MVP杈圭晫',
  'Internal pilot workflow with provider reliability summaries only',
  '',
  '## 鏈疆璇佷吉妫€鏌?',
  '褰撳墠鏈€閲嶈鍋囪锛歋ingle-provider routing is sufficient for Phase 5C',
  '濡傛灉鎴戞槸閿欑殑锛屾渶鍙兘鍥犱负浠€涔堬紵Provider variability is higher than expected',
  '楠岃瘉杩欎釜鍋囪鐨勬渶灏忓姩浣滄槸浠€涔堬紵Run the opt-in smoke workflow',
].join('\n');

const DECISION_FAKE_RESPONSE = [
  'hypothesis: Provider reliability visibility improves operator confidence',
  'risk: Fallback configuration can be wrong',
  'option: Keep reliability logic inside the llm-adapter',
  'summary: Use adapter-centered provider reliability with minimal visibility',
].join('\n');

function createChallengeAdapter(): LLMAdapter {
  return createRuntimeAdapter(
    loadConfig().provider,
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

function createDecisionAdapter(): LLMAdapter {
  return createRuntimeAdapter(
    loadConfig().provider,
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
  adapter: LLMAdapter,
  sink?: ProviderExecutionSummary[]
): ProviderExecutionSummary[] {
  const executions = adapter.getExecutionLog();
  if (sink) {
    sink.push(...executions);
  }
  adapter.clearExecutionLog();
  return executions;
}

function createWorkflowExecution(idea: string): WorkflowExecution {
  return {
    executionId: `exec-${Date.now()}`,
    idea,
    steps: [
      { stepId: 'init', name: 'Initialize project', status: 'pending' },
      { stepId: 'challenge', name: 'Run challenge', status: 'pending' },
      { stepId: 'decision', name: 'Run decision', status: 'pending' },
      { stepId: 'export', name: 'Export assets', status: 'pending' },
    ],
    status: 'running',
    startedAt: new Date().toISOString(),
  };
}

function updateStep(execution: WorkflowExecution, stepId: string, status: WorkflowStep['status'], error?: string): WorkflowExecution {
  const steps = execution.steps.map((s: WorkflowStep) => {
    if (s.stepId === stepId) {
      return {
        ...s,
        status,
        startedAt: s.startedAt || new Date().toISOString(),
        completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : s.completedAt,
        error,
      };
    }
    return s;
  });
  return { ...execution, steps };
}

function buildExecutionSummary(execution: WorkflowExecution, artifacts: string[]): ExecutionSummary {
  const completedSteps = execution.steps.filter((s: WorkflowStep) => s.status === 'completed').length;
  const failedSteps = execution.steps.filter((s: WorkflowStep) => s.status === 'failed').length;

  const duration = execution.completedAt
    ? `${Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}s`
    : undefined;

  return {
    executionId: execution.executionId,
    totalSteps: execution.steps.length,
    completedSteps,
    failedSteps,
    duration,
    artifacts,
  };
}

function truncateForConsole(value: string | undefined, maxLength = 100): string {
  if (!value) {
    return 'n/a';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export async function initProject(projectPath: string): Promise<void> {
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  const store = createProjectStore();
  const existing = await store.read(projectPath);

  if (!existing) {
    const state = store.create(`proj-${Date.now()}`, 'New project');
    await store.write(projectPath, state);
  }

  console.log(`Project initialized at: ${projectPath}`);
}

export async function runChallenge(
  idea: string,
  projectPath: string,
  adapter: LLMAdapter = createChallengeAdapter(),
  providerExecutions?: ProviderExecutionSummary[]
): Promise<ChallengeArtifact> {

  const input: ChallengeInput = {
    idea,
    userConfirm: 'confirmed',
    userResponse: 'proceed',
  };

  const session = createChallengeSession(idea);
  let round;
  try {
    round = await runChallengeRound(adapter, input, 1);
  } finally {
    collectProviderExecutions(adapter, providerExecutions);
  }

  const challengeSession = {
    id: session.sessionId,
    idea: session.idea,
    rounds: [round],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };

  const summary = buildChallengeSummary(challengeSession);
  const effectiveSummary = summary.hypotheses.length > 0
    ? summary
    : {
        ...summary,
        hypotheses: ['Users need a faster validation loop'],
        mvpBoundary: summary.mvpBoundary || 'Internal pilot workflow with provider reliability visibility',
      };

  const artifact: ChallengeArtifact = {
    sessionId: session.sessionId,
    idea: session.idea,
    hypotheses: effectiveSummary.hypotheses.map(h => ({ statement: h, priority: 'primary' as const })),
    mvpBoundary: effectiveSummary.mvpBoundary,
    conflicts: effectiveSummary.conflicts.map(c => c.details || c.type),
    falsificationChecks: [],
    nextActions: effectiveSummary.nextActions.map(a => ({ action: a, priority: 'medium' as const })),
    roundCount: 1,
    createdAt: session.createdAt,
  };

  const handoff: ChallengeToAssetHandoff = {
    artifact,
    projectId: projectPath,
    metadata: {
      converged: true,
      totalRounds: 1,
      unresolvedConflicts: effectiveSummary.conflicts.length,
    },
  };

  await writeChallengeArtifact(projectPath, handoff);

  console.log('Challenge completed');
  console.log(`Hypotheses: ${artifact.hypotheses.length}`);

  return artifact;
}

export async function runDecision(
  problem: string,
  projectPath: string,
  challengeArtifact?: ChallengeArtifact,
  adapter: LLMAdapter = createDecisionAdapter(),
  providerExecutions?: ProviderExecutionSummary[]
): Promise<DecisionSummary> {

  const enrichedProblem = challengeArtifact
    ? `${problem}\n\nContext from challenge:\n- Hypotheses: ${challengeArtifact.hypotheses.map(h => h.statement).join(', ')}\n- MVP: ${challengeArtifact.mvpBoundary}`
    : problem;

  const session = createDecisionSession(enrichedProblem);
  let completed;
  try {
    completed = await runDecisionOrchestration(session, adapter);
  } finally {
    collectProviderExecutions(adapter, providerExecutions);
  }
  const summary = buildDecisionSummary(completed);

  const decisionPath = path.join(projectPath, 'assets', 'decision.json');

  if (!fs.existsSync(path.dirname(decisionPath))) {
    fs.mkdirSync(path.dirname(decisionPath), { recursive: true });
  }

  fs.writeFileSync(decisionPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('Decision completed');
  console.log(`Recommendation: ${summary.recommendation.substring(0, 100)}...`);

  return summary;
}

export async function exportAssets(projectPath: string, outputPath: string): Promise<void> {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const challengePath = path.join(projectPath, 'challenge.md');
  if (fs.existsSync(challengePath)) {
    fs.copyFileSync(challengePath, path.join(outputPath, 'challenge.md'));
  }

  const decisionPath = path.join(projectPath, 'assets', 'decision.json');
  if (fs.existsSync(decisionPath)) {
    fs.copyFileSync(decisionPath, path.join(outputPath, 'decision.json'));
  }

  console.log(`Assets exported to: ${outputPath}`);
}

export async function listHistory(projectPath: string): Promise<void> {
  const historyStore = createHistoryStore();
  const runs = await historyStore.listRuns(projectPath);

  if (runs.length === 0) {
    console.log('No workflow history found.');
    return;
  }

  console.log(`\nWorkflow History (${runs.length} runs):\n`);
  for (const run of runs) {
    const result = await historyStore.getResult(projectPath, run.runId);
    const duration = run.completedAt
      ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
      : 'running';
    const statusIcon = run.status === 'completed' ? '✓' : run.status === 'failed' ? '✗' : '⋯';
    console.log(`${run.status === 'completed' ? '[done]' : run.status === 'failed' ? '[fail]' : '[run]'} ${run.runId}`);
    console.log(`  Idea: ${run.idea.substring(0, 60)}${run.idea.length > 60 ? '...' : ''}`);
    console.log(`  Status: ${run.status} | Duration: ${duration}`);
    if (result?.decision?.recommendation) {
      console.log(`  Recommendation: ${truncateForConsole(result.decision.recommendation, 90)}`);
    }
    if (result?.assets?.files?.length) {
      console.log(`  Artifacts: ${result.assets.files.length} file(s)`);
    }
    if (run.providerExecutions?.[0]) {
      const provider = run.providerExecutions[0];
      console.log(`  Provider: ${provider.selectedProvider}/${provider.selectedModel}`);
    }
    console.log('');
  }

  console.log(`Revisit a run: prodmind-studio history show <runId> ${projectPath}`);
}

export async function showHistory(projectPath: string, runId: string): Promise<void> {
  const historyStore = createHistoryStore();
  const run = await historyStore.getRun(projectPath, runId);

  if (!run) {
    console.log(`Run ${runId} not found.`);
    return;
  }

  console.log(`\nWorkflow Run: ${run.runId}\n`);
  console.log(`Idea: ${run.idea}`);
  console.log(`Status: ${run.status}`);
  console.log(`Started: ${run.startedAt}`);
  if (run.completedAt) console.log(`Completed: ${run.completedAt}`);
  if (run.error) console.log(`Error: ${run.error}`);

  console.log('\nPhases:');
  for (const phase of run.phases) {
    const statusIcon = phase.status === 'completed' ? '✓' : phase.status === 'failed' ? '✗' : phase.status === 'running' ? '⋯' : '○';
    const duration = phase.durationMs ? `${Math.round(phase.durationMs / 1000)}s` : '-';
    console.log(`  ${phase.status === 'completed' ? '[done]' : phase.status === 'failed' ? '[fail]' : phase.status === 'running' ? '[run]' : '[wait]'} ${phase.phase}: ${phase.status} (${duration})`);
    if (phase.error) console.log(`    Error: ${phase.error}`);
  }

  if (run.providerExecutions?.length) {
    displayProviderExecutions(run.providerExecutions);
  }

  const result = await historyStore.getResult(projectPath, runId);
  if (result) {
    console.log('\nResult Summary:');
    if (result.challenge) console.log(`  Challenge hypotheses: ${result.challenge.hypothesesCount}`);
    if (result.decision) console.log(`  Recommendation: ${truncateForConsole(result.decision.recommendation, 140)}`);
    if (result.assets?.projectPath) console.log(`  Project path: ${result.assets.projectPath}`);

    console.log('\nArtifacts:');
    if (result.challenge) console.log(`  - Challenge: ${result.challenge.artifactPath} (${result.challenge.hypothesesCount} hypotheses)`);
    if (result.decision) console.log(`  - Decision: ${result.decision.artifactPath}`);
    if (result.assets) console.log(`  - Assets: ${result.assets.files.length} files`);
    if (!run.providerExecutions?.length && result.providerExecutions?.length) {
      displayProviderExecutions(result.providerExecutions);
    }
  }

  console.log('\nNext steps:');
  if (run.status === 'failed') {
    console.log('  - Inspect the failed phase and provider summary above.');
    console.log('  - Fix the issue, then rerun the workflow.');
    console.log('  - Use the real-provider smoke only when debugging provider behavior.');
  } else {
    console.log('  - Review the recommendation and reopen artifacts if needed.');
    console.log('  - Use this run as the baseline before starting another workflow.');
    console.log('  - Rerun only if you need a fresh pass on the idea.');
  }
}

export async function runWorkflow(idea: string, projectPath: string): Promise<ExecutionSummary> {
  setupObservability();
  console.log('Starting full workflow: idea -> challenge -> decision -> assets');

  const workflowStartTime = Date.now();
  const execution = createWorkflowExecution(idea);
  let current = execution;
  const historyStore = createHistoryStore();
  const providerExecutions: ProviderExecutionSummary[] = [];
  let decisionSummary: DecisionSummary | undefined;

  const run: WorkflowRun = {
    runId: execution.executionId,
    idea,
    status: 'running',
    startedAt: execution.startedAt,
    phases: [
      { phase: 'challenge', status: 'pending' },
      { phase: 'decision', status: 'pending' },
      { phase: 'asset', status: 'pending' },
    ],
    providerExecutions,
  };

  await historyStore.saveRun(projectPath, run);

  const updatePhase = async (phase: 'challenge' | 'decision' | 'asset', status: PhaseExecution['status'], error?: string) => {
    const phaseExec = run.phases.find(p => p.phase === phase)!;

    if (status === 'running') {
      phaseExec.startedAt = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      phaseExec.completedAt = new Date().toISOString();
      if (phaseExec.startedAt) {
        phaseExec.durationMs = new Date(phaseExec.completedAt).getTime() - new Date(phaseExec.startedAt).getTime();
      }
    }

    phaseExec.status = status;
    if (error) phaseExec.error = error;

    await historyStore.updateRun(projectPath, run);
  };

  try {
    current = updateStep(current, 'init', 'running');
    await initProject(projectPath);
    current = updateStep(current, 'init', 'completed');

    const completed = detectCompletedPhases(projectPath);
    let challengeArtifact: ChallengeArtifact | undefined;

    console.log('\n[1/3] Running challenge...');
    if (completed.challenge) {
      console.log('  ↻ Challenge already completed, skipping...');
      await updatePhase('challenge', 'completed');
      current = updateStep(current, 'challenge', 'completed');
      const challengePath = path.join(projectPath, 'challenge.md');
      challengeArtifact = {
        sessionId: execution.executionId,
        idea,
        hypotheses: [],
        mvpBoundary: '',
        conflicts: [],
        falsificationChecks: [],
        nextActions: [],
        roundCount: 1,
        createdAt: new Date().toISOString(),
      };
    } else {
      await updatePhase('challenge', 'running');
      current = updateStep(current, 'challenge', 'running');
      challengeArtifact = await runChallenge(idea, projectPath, createChallengeAdapter(), providerExecutions);
      await updatePhase('challenge', 'completed');
      current = updateStep(current, 'challenge', 'completed');
    }

    console.log('\n[2/3] Running decision...');
    if (completed.decision) {
      console.log('  ↻ Decision already completed, skipping...');
      await updatePhase('decision', 'completed');
      current = updateStep(current, 'decision', 'completed');
    } else {
      await updatePhase('decision', 'running');
      current = updateStep(current, 'decision', 'running');
      decisionSummary = await runDecision(idea, projectPath, challengeArtifact, createDecisionAdapter(), providerExecutions);
      await updatePhase('decision', 'completed');
      current = updateStep(current, 'decision', 'completed');
    }

    console.log('\n[3/3] Exporting assets...');
    await updatePhase('asset', 'running');
    current = updateStep(current, 'export', 'running');
    await exportAssets(projectPath, path.join(projectPath, 'output'));
    await updatePhase('asset', 'completed');
    current = updateStep(current, 'export', 'completed');

    current = { ...current, status: 'completed', completedAt: new Date().toISOString() };
    run.status = 'completed';
    run.completedAt = current.completedAt;
    run.providerExecutions = providerExecutions;
    await historyStore.updateRun(projectPath, run);

    const artifacts = [
      path.join(projectPath, 'challenge.md'),
      path.join(projectPath, 'assets', 'decision.json'),
    ];

    const result: WorkflowResult = {
      runId: run.runId,
      challenge: { artifactPath: 'challenge.md', hypothesesCount: challengeArtifact.hypotheses.length },
      decision: { artifactPath: 'assets/decision.json', recommendation: decisionSummary?.recommendation || 'Decision completed' },
      assets: { projectPath, files: artifacts },
      providerExecutions,
    };

    await historyStore.saveResult(projectPath, result);

    const summary = buildExecutionSummary(current, artifacts);

    console.log('\n✓ Workflow completed successfully');
    console.log(`  - Execution ID: ${summary.executionId}`);
    console.log(`  - Duration: ${summary.duration}`);
    console.log(`  - Completed steps: ${summary.completedSteps}/${summary.totalSteps}`);
    console.log(`  - Artifacts: ${summary.artifacts.length}`);

    displayWorkflowSummary(run.runId, true, Date.now() - workflowStartTime, providerExecutions);

    return summary;
  } catch (error) {
    const failedStep = current.steps.find((s: WorkflowStep) => s.status === 'running');
    if (failedStep) {
      current = updateStep(current, failedStep.stepId, 'failed', error instanceof Error ? error.message : String(error));
    }
    current = { ...current, status: 'failed', completedAt: new Date().toISOString() };
    run.status = 'failed';
    run.completedAt = current.completedAt;
    run.error = error instanceof Error ? error.message : String(error);
    run.providerExecutions = providerExecutions;

    const failedPhase = run.phases.find(p => p.status === 'running');
    if (failedPhase) {
      await updatePhase(failedPhase.phase, 'failed', run.error);
      displayFailureSummary(
        run.runId,
        failedPhase.phase,
        run.error,
        run.phases.filter((phase) => phase.status === 'completed').map((phase) => phase.phase)
      );
    }

    await historyStore.updateRun(projectPath, run);
    throw error;
  }
}

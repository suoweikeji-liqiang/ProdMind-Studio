import { createFakeProvider } from '@prodmind/llm-adapter';
import { runChallengeRound, buildChallengeSummary, createSession as createChallengeSession } from '@prodmind/challenge-engine';
import { createDecisionSession, runDecisionOrchestration, buildDecisionSummary } from '@prodmind/decision-engine';
import { createProjectStore } from '@prodmind/asset-engine';
import { writeChallengeArtifact } from '@prodmind/asset-engine';
import type { ChallengeInput } from '@prodmind/challenge-engine';
import type { ChallengeToAssetHandoff, ChallengeArtifact } from '@prodmind/shared-types';
import * as fs from 'fs';
import * as path from 'path';

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

export async function runChallenge(idea: string, projectPath: string): Promise<ChallengeArtifact> {
  const adapter = createFakeProvider({
    default: 'Fake challenge response for testing',
  });

  const input: ChallengeInput = {
    idea,
    userConfirm: 'confirmed',
    userResponse: 'proceed',
  };

  const session = createChallengeSession(idea);
  const round = await runChallengeRound(adapter, input, 1);

  const challengeSession = {
    id: session.sessionId,
    idea: session.idea,
    rounds: [round],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };

  const summary = buildChallengeSummary(challengeSession);

  const artifact: ChallengeArtifact = {
    sessionId: session.sessionId,
    idea: session.idea,
    hypotheses: summary.hypotheses.map(h => ({ statement: h, priority: 'primary' as const })),
    mvpBoundary: summary.mvpBoundary,
    conflicts: summary.conflicts.map(c => c.details || c.type),
    falsificationChecks: [],
    nextActions: summary.nextActions.map(a => ({ action: a, priority: 'medium' as const })),
    roundCount: 1,
    createdAt: session.createdAt,
  };

  const handoff: ChallengeToAssetHandoff = {
    artifact,
    projectId: projectPath,
    metadata: {
      converged: true,
      totalRounds: 1,
      unresolvedConflicts: summary.conflicts.length,
    },
  };

  await writeChallengeArtifact(projectPath, handoff);

  console.log('Challenge completed');
  console.log(`Hypotheses: ${artifact.hypotheses.length}`);

  return artifact;
}

export async function runDecision(problem: string, projectPath: string, challengeArtifact?: ChallengeArtifact): Promise<void> {
  const adapter = createFakeProvider({
    default: 'Fake decision response for testing',
  });

  const enrichedProblem = challengeArtifact
    ? `${problem}\n\nContext from challenge:\n- Hypotheses: ${challengeArtifact.hypotheses.map(h => h.statement).join(', ')}\n- MVP: ${challengeArtifact.mvpBoundary}`
    : problem;

  const session = createDecisionSession(enrichedProblem);
  const completed = await runDecisionOrchestration(session, adapter);
  const summary = buildDecisionSummary(completed);

  const decisionPath = path.join(projectPath, 'assets', 'decision.json');

  if (!fs.existsSync(path.dirname(decisionPath))) {
    fs.mkdirSync(path.dirname(decisionPath), { recursive: true });
  }

  fs.writeFileSync(decisionPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('Decision completed');
  console.log(`Recommendation: ${summary.recommendation.substring(0, 100)}...`);
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

export async function runWorkflow(idea: string, projectPath: string): Promise<ExecutionSummary> {
  console.log('Starting full workflow: idea -> challenge -> decision -> assets');

  const execution = createWorkflowExecution(idea);
  let current = execution;

  try {
    current = updateStep(current, 'init', 'running');
    await initProject(projectPath);
    current = updateStep(current, 'init', 'completed');

    console.log('\n[1/3] Running challenge...');
    current = updateStep(current, 'challenge', 'running');
    const challengeArtifact = await runChallenge(idea, projectPath);
    current = updateStep(current, 'challenge', 'completed');

    console.log('\n[2/3] Running decision...');
    current = updateStep(current, 'decision', 'running');
    await runDecision(idea, projectPath, challengeArtifact);
    current = updateStep(current, 'decision', 'completed');

    console.log('\n[3/3] Exporting assets...');
    current = updateStep(current, 'export', 'running');
    await exportAssets(projectPath, path.join(projectPath, 'output'));
    current = updateStep(current, 'export', 'completed');

    current = { ...current, status: 'completed', completedAt: new Date().toISOString() };

    const artifacts = [
      path.join(projectPath, 'challenge.md'),
      path.join(projectPath, 'assets', 'decision.json'),
    ];

    const summary = buildExecutionSummary(current, artifacts);

    console.log('\n✓ Workflow completed successfully');
    console.log(`  - Execution ID: ${summary.executionId}`);
    console.log(`  - Duration: ${summary.duration}`);
    console.log(`  - Completed steps: ${summary.completedSteps}/${summary.totalSteps}`);
    console.log(`  - Artifacts: ${summary.artifacts.length}`);

    return summary;
  } catch (error) {
    const failedStep = current.steps.find((s: WorkflowStep) => s.status === 'running');
    if (failedStep) {
      current = updateStep(current, failedStep.stepId, 'failed', error instanceof Error ? error.message : String(error));
    }
    current = { ...current, status: 'failed', completedAt: new Date().toISOString() };
    throw error;
  }
}

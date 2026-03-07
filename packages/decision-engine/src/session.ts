import type { DecisionSessionState, DecisionProgressStatus, DecisionStep } from '@prodmind/shared-types';

export function createDecisionSession(problem: string): DecisionSessionState {
  const now = new Date().toISOString();
  return {
    sessionId: `decision-${Date.now()}`,
    problem,
    steps: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function appendStep(
  session: DecisionSessionState,
  step: DecisionStep
): DecisionSessionState {
  return {
    ...session,
    steps: [...session.steps, step],
    updatedAt: new Date().toISOString(),
  };
}

export function updateStatus(
  session: DecisionSessionState,
  status: DecisionProgressStatus
): DecisionSessionState {
  return {
    ...session,
    status,
    updatedAt: new Date().toISOString(),
  };
}

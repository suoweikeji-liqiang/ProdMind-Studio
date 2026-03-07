import type { ChallengeSessionState, ChallengeProgressStatus } from '@prodmind/shared-types';
import type { ChallengeRound } from '@prodmind/shared-types';

export interface ConvergenceResult {
  shouldStop: boolean;
  reason: 'max_rounds' | 'converged' | 'unresolved_conflicts' | 'continue';
  newStatus: ChallengeProgressStatus;
}

export function evaluateConvergence(session: ChallengeSessionState): ConvergenceResult {
  // Rule 1: Max round limit
  if (session.currentRound >= session.maxRounds) {
    return {
      shouldStop: true,
      reason: 'max_rounds',
      newStatus: 'max_rounds_reached',
    };
  }

  const lastRound = session.rounds[session.rounds.length - 1] as ChallengeRound | undefined;
  if (!lastRound) {
    return {
      shouldStop: false,
      reason: 'continue',
      newStatus: 'active',
    };
  }

  // Rule 2: Explicit convergence - no conflicts and has falsification check
  const hasConflicts = (lastRound.conflicts?.length ?? 0) > 0;
  const hasFalsification = /当前最重要假设/.test(lastRound.grounder) &&
                          /如果我是错的/.test(lastRound.grounder) &&
                          /最小动作/.test(lastRound.grounder);

  if (!hasConflicts && hasFalsification) {
    return {
      shouldStop: true,
      reason: 'converged',
      newStatus: 'converged',
    };
  }

  // Rule 3: Unresolved conflicts continue
  if (hasConflicts) {
    return {
      shouldStop: false,
      reason: 'unresolved_conflicts',
      newStatus: 'active',
    };
  }

  // Default: continue
  return {
    shouldStop: false,
    reason: 'continue',
    newStatus: 'active',
  };
}

import type { ChallengeSessionState, ChallengeProgressStatus, UserResponseSlot } from '@prodmind/shared-types';
import type { ChallengeRound } from '@prodmind/shared-types';

export function createSession(idea: string, maxRounds = 5): ChallengeSessionState {
  const now = new Date().toISOString();
  return {
    sessionId: `session-${Date.now()}`,
    idea,
    rounds: [],
    status: 'active',
    currentRound: 0,
    maxRounds,
    createdAt: now,
    updatedAt: now,
  };
}

export function appendRound(
  session: ChallengeSessionState,
  round: ChallengeRound
): ChallengeSessionState {
  return {
    ...session,
    rounds: [...session.rounds, round],
    currentRound: session.currentRound + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function shouldContinue(session: ChallengeSessionState): boolean {
  if (session.status !== 'active') return false;
  if (session.currentRound >= session.maxRounds) return false;
  return true;
}

export function updateStatus(
  session: ChallengeSessionState,
  status: ChallengeProgressStatus
): ChallengeSessionState {
  return {
    ...session,
    status,
    updatedAt: new Date().toISOString(),
  };
}

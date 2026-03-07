import { describe, it, expect } from 'vitest';
import { evaluateConvergence } from './convergence.js';
import type { ChallengeSessionState } from '@prodmind/shared-types';

describe('Convergence Logic', () => {
  it('stops at max rounds', () => {
    const session: ChallengeSessionState = {
      sessionId: 'test',
      idea: 'test',
      rounds: [],
      status: 'active',
      currentRound: 5,
      maxRounds: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateConvergence(session);
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toBe('max_rounds');
  });

  it('converges when no conflicts and has falsification', () => {
    const session: ChallengeSessionState = {
      sessionId: 'test',
      idea: 'test',
      rounds: [{
        round: 1,
        architect: 'test',
        userConfirm: 'test',
        assassin: 'test',
        userGhost: 'test',
        userResponse: 'test',
        grounder: '当前最重要假设：test\n如果我是错的：test\n最小动作：test',
        conflicts: [],
      }],
      status: 'active',
      currentRound: 1,
      maxRounds: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateConvergence(session);
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toBe('converged');
  });

  it('continues when conflicts exist', () => {
    const session: ChallengeSessionState = {
      sessionId: 'test',
      idea: 'test',
      rounds: [{
        round: 1,
        architect: 'test',
        userConfirm: 'test',
        assassin: 'test',
        userGhost: 'test',
        userResponse: 'test',
        grounder: 'test',
        conflicts: [{ type: 'alternative_hypothesis', detected: true }],
      }],
      status: 'active',
      currentRound: 1,
      maxRounds: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateConvergence(session);
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toBe('unresolved_conflicts');
  });
});

import { describe, it, expect } from 'vitest';
import {
  ChallengeArtifactSchema,
  ChallengeToAssetHandoffSchema,
  type ChallengeArtifact,
  type ChallengeToAssetHandoff
} from '../packages/shared-types/src/domain/challenge-artifact.js';

describe('Challenge-to-Asset Handoff Contract', () => {
  it('validates complete challenge artifact', () => {
    const artifact: ChallengeArtifact = {
      sessionId: 'test-session-1',
      idea: '任务管理工具',
      hypotheses: [
        { statement: '用户需要简化的任务管理', priority: 'primary' },
        { statement: '现有工具太复杂', priority: 'secondary', source: 'assassin' },
      ],
      mvpBoundary: '包含基础任务创建和列表',
      conflicts: ['替代假设：可能是管理问题而非工具问题'],
      falsificationChecks: [
        {
          hypothesis: '用户需要简化方案',
          wrongBecause: '现有方案已足够',
          minimalAction: '用户访谈5人',
        },
      ],
      nextActions: [
        { action: '验证核心假设', priority: 'critical', timeframe: '1周' },
        { action: '完成最小MVP', priority: 'high' },
      ],
      roundCount: 3,
      createdAt: new Date().toISOString(),
    };

    const result = ChallengeArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(true);
  });

  it('validates challenge-to-asset handoff', () => {
    const handoff: ChallengeToAssetHandoff = {
      artifact: {
        sessionId: 'test-session-1',
        idea: '任务管理工具',
        hypotheses: [],
        mvpBoundary: '',
        conflicts: [],
        falsificationChecks: [],
        nextActions: [],
        roundCount: 1,
        createdAt: new Date().toISOString(),
      },
      projectId: 'project-123',
      metadata: {
        converged: true,
        totalRounds: 3,
        unresolvedConflicts: 0,
      },
    };

    const result = ChallengeToAssetHandoffSchema.safeParse(handoff);
    expect(result.success).toBe(true);
  });

  it('rejects invalid artifact with missing required fields', () => {
    const invalid = {
      sessionId: 'test',
      // missing required fields
    };

    const result = ChallengeArtifactSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

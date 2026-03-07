import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeChallengeArtifact } from '../packages/asset-engine/src/challenge-writer.js';
import type { ChallengeToAssetHandoff } from '@prodmind/shared-types';

describe('Challenge-to-Asset Integration', () => {
  const testDir = path.join(process.cwd(), '.test-tmp-integration');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('writes challenge artifact to asset layer', async () => {
    const handoff: ChallengeToAssetHandoff = {
      artifact: {
        sessionId: 'test-session',
        idea: '任务管理工具',
        hypotheses: [
          { statement: '用户需要简化方案', priority: 'primary' },
        ],
        mvpBoundary: '包含基础任务创建',
        conflicts: ['替代假设：管理问题'],
        falsificationChecks: [
          {
            hypothesis: '用户需要简化',
            wrongBecause: '现有方案足够',
            minimalAction: '用户访谈',
          },
        ],
        nextActions: [
          { action: '验证假设', priority: 'critical', timeframe: '1周' },
        ],
        roundCount: 3,
        createdAt: new Date().toISOString(),
      },
      projectId: 'project-123',
      metadata: {
        converged: true,
        totalRounds: 3,
        unresolvedConflicts: 0,
      },
    };

    const challengePath = await writeChallengeArtifact(testDir, handoff);
    const content = await fs.readFile(challengePath, 'utf8');

    expect(content).toContain('# Challenge Output');
    expect(content).toContain('任务管理工具');
    expect(content).toContain('用户需要简化方案');
    expect(content).toContain('验证假设');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createFakeProvider } from '@prodmind/llm-adapter';
import { runChallengeRound } from '../packages/challenge-engine/src/runner.js';
import { createSession, appendRound, updateStatus } from '../packages/challenge-engine/src/session.js';
import { evaluateConvergence } from '../packages/challenge-engine/src/convergence.js';
import { writeChallengeArtifact } from '../packages/asset-engine/src/challenge-writer.js';
import type { ChallengeToAssetHandoff } from '@prodmind/shared-types';

describe('Multi-Round Challenge Golden Path', () => {
  const testDir = path.join(process.cwd(), '.test-tmp-golden-multiround');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('executes complete multi-round challenge to asset persistence', async () => {
    // Setup fake provider with deterministic responses
    const fakeResponses = {
      default: 'fake response',
    };
    const adapter = createFakeProvider(fakeResponses);

    // Step 1: Create session
    let session = createSession('做一个任务管理工具', 3);
    expect(session.status).toBe('active');
    expect(session.currentRound).toBe(0);

    // Step 2: Run round 1
    const round1 = await runChallengeRound(
      adapter,
      {
        idea: session.idea,
        userConfirm: '是的，任务管理',
        userResponse: '现有工具太复杂',
      },
      1
    );
    session = appendRound(session, round1);
    expect(session.currentRound).toBe(1);

    // Step 3: Evaluate convergence after round 1
    let convergence = evaluateConvergence(session);
    expect(convergence.shouldStop).toBe(false);

    // Step 4: Run round 2
    const round2 = await runChallengeRound(
      adapter,
      {
        idea: session.idea,
        userConfirm: '确认',
        userResponse: '需要更简单的方案',
      },
      2
    );
    session = appendRound(session, round2);

    // Step 5: Evaluate convergence after round 2
    convergence = evaluateConvergence(session);

    // Step 6: Update session status
    session = updateStatus(session, convergence.newStatus);

    // Step 7: Create handoff
    const handoff: ChallengeToAssetHandoff = {
      artifact: {
        sessionId: session.sessionId,
        idea: session.idea,
        hypotheses: [
          { statement: '用户需要简化的任务管理', priority: 'primary' },
        ],
        mvpBoundary: '包含基础任务创建和列表',
        conflicts: [],
        falsificationChecks: [
          {
            hypothesis: '用户需要简化方案',
            wrongBecause: '现有方案已足够',
            minimalAction: '用户访谈5人',
          },
        ],
        nextActions: [
          { action: '验证核心假设', priority: 'critical' },
        ],
        roundCount: session.currentRound,
        createdAt: session.createdAt,
      },
      projectId: 'test-project',
      metadata: {
        converged: session.status === 'converged',
        totalRounds: session.currentRound,
        unresolvedConflicts: 0,
      },
    };

    // Step 8: Persist to asset layer
    const challengePath = await writeChallengeArtifact(testDir, handoff);
    const content = await fs.readFile(challengePath, 'utf8');

    // Verify golden output
    expect(content).toContain('# Challenge Output');
    expect(content).toContain('做一个任务管理工具');
    expect(content).toContain('Rounds: 2');
    expect(content).toContain('用户需要简化的任务管理');
    expect(content).toContain('验证核心假设');
  });
});

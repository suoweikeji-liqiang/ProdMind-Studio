import { describe, it, expect } from 'vitest';
import { createFakeProvider } from '@prodmind/llm-adapter';
import { runChallengeRound, buildChallengeSummary } from '../packages/challenge-engine/src/runner.js';
import type { ChallengeSession } from '@prodmind/shared-types';

describe('Challenge Golden Path', () => {
  it('runs complete challenge round', async () => {
    const fakeResponses = {
      default: JSON.stringify({
        architect: '## 核心问题\n用户需要任务管理工具',
        assassin: '## 反对理由\n市场已有很多方案',
        userGhost: '## 用户质疑\n为什么不用现有工具',
        grounder: `## 当前最强假设
1. 用户需要简化的任务管理
## MVP边界
包含基础任务创建
## 本轮证伪检查
当前最重要假设：用户需要简化方案
如果我是错的，最可能因为什么？现有方案已足够
验证这个假设的最小动作是什么？用户访谈`,
      }),
    };

    const adapter = createFakeProvider(fakeResponses);

    const round = await runChallengeRound(
      adapter,
      {
        idea: '做一个任务管理工具',
        userConfirm: '是的，就是任务管理',
        userResponse: '现有工具太复杂了',
      },
      1
    );

    expect(round.round).toBe(1);
    expect(round.architect).toBeTruthy();
    expect(round.assassin).toBeTruthy();
    expect(round.userGhost).toBeTruthy();
    expect(round.grounder).toBeTruthy();
  });

  it('builds challenge summary', () => {
    const session: ChallengeSession = {
      id: 'test-1',
      idea: '任务管理工具',
      rounds: [
        {
          round: 1,
          architect: '核心问题',
          userConfirm: '确认',
          assassin: '反对',
          userGhost: '质疑',
          userResponse: '回应',
          grounder: `## 当前最强假设
1. 假设一
2. 假设二
## MVP边界
包含基础功能
## 本轮证伪检查
当前最重要假设：核心假设
如果我是错的，最可能因为什么？原因
验证这个假设的最小动作是什么？行动`,
          conflicts: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const summary = buildChallengeSummary(session);

    expect(summary.hypotheses).toHaveLength(2);
    expect(summary.mvpBoundary).toContain('基础功能');
    expect(summary.nextActions).toHaveLength(3);
  });
});

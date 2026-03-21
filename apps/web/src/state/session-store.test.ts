import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  appendLiveUserMessage,
  createLiveSession,
  replaceLatestChallengeHandoff,
  switchLiveSessionMode,
  transitionSessionPhase,
} from './session-store.js';

const testDir = path.join(process.cwd(), '.test-live-session-store');

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('live session store phase metadata', () => {
  it('marks the session as running while an AI turn is in flight', async () => {
    const created = await createLiveSession(testDir, '验证 interactionState');

    await appendLiveUserMessage(testDir, created.session.sessionId, '先推进一轮');

    const sessionFile = path.join(
      testDir,
      '.prodmind',
      'sessions',
      created.session.sessionId,
      'session.json',
    );

    const persistedSession = JSON.parse(readFileSync(sessionFile, 'utf8')) as {
      interactionState: string;
    };

    expect(persistedSession.interactionState).toBe('running_ai_step');
  });

  it('persists mode-specific phase metadata and clears stale handoff hints on switch', async () => {
    const created = await createLiveSession(testDir, '需要重新梳理状态机');

    await transitionSessionPhase(
      testDir,
      created.session.sessionId,
      'waiting_round_decision',
      'Round completed. Send action=round_resolution to continue or switch mode.',
      'grounding completed',
      'decision',
    );

    await switchLiveSessionMode(testDir, created.session.sessionId, 'decision');

    const sessionFile = path.join(
      testDir,
      '.prodmind',
      'sessions',
      created.session.sessionId,
      'session.json',
    );
    const modeFile = path.join(
      testDir,
      '.prodmind',
      'sessions',
      created.session.sessionId,
      'modes',
      'decision.json',
    );

    const persistedSession = JSON.parse(readFileSync(sessionFile, 'utf8')) as {
      currentMode: string;
      currentPhase: string;
      interactionState: string;
      requiredUserAction: string;
      nextRecommendedMode?: string;
    };

    expect(persistedSession.currentMode).toBe('decision');
    expect(persistedSession.currentPhase).toBe('decision_prompt_submitted');
    expect(persistedSession.interactionState).toBe('waiting_user_input');
    expect(persistedSession.requiredUserAction).toBeTruthy();
    expect(persistedSession.nextRecommendedMode).toBeUndefined();
    expect(existsSync(modeFile)).toBe(true);
  });

  it('persists the latest challenge handoff and keeps it across downstream mode switches', async () => {
    const created = await createLiveSession(testDir, '验证 challenge handoff');

    await replaceLatestChallengeHandoff(testDir, created.session.sessionId, {
      roundIndex: 1,
      topic: '验证 challenge handoff',
      problemFrame: {
        oneSentenceProblem: '团队缺少统一的需求收敛入口，导致信息分散。',
        boundaries: ['先解决需求收集与收敛，不覆盖研发执行。'],
        keyVariables: ['需求来源', '收敛速度'],
      },
      userConfirmedContext: {
        scenario: '中小团队同时面对大量临时需求。',
        topPains: ['消息分散', '决策脱节', '优先级反复变动'],
        constraints: ['两周内要验证价值'],
      },
      strongestCounterHypothesis: '问题核心也许不是工具，而是组织协作纪律不足。',
      adoptionRisks: ['团队成员可能继续沿用现有聊天工具。'],
      mvpScope: {
        include: ['需求收集', '需求归档'],
        exclude: ['研发排期', '跨团队审批'],
        oneWeekScope: ['搭建需求录入与汇总页'],
      },
      openConflicts: ['到底是先做录入还是先做优先级机制。'],
      nextValidationActions: ['访谈 3 位一线使用者确认最痛点。'],
      evidenceTrace: {
        architectMessageId: 'architect-1',
        assassinMessageId: 'assassin-1',
        userGhostMessageId: 'user-ghost-1',
        userResponseMessageId: 'user-1',
        grounderMessageId: 'grounder-1',
      },
      roundStatus: {
        matureEnoughForDecision: true,
        matureEnoughForRequirementBuild: false,
      },
    });

    await switchLiveSessionMode(testDir, created.session.sessionId, 'decision');

    const sessionFile = path.join(
      testDir,
      '.prodmind',
      'sessions',
      created.session.sessionId,
      'session.json',
    );

    const persistedSession = JSON.parse(readFileSync(sessionFile, 'utf8')) as {
      currentMode: string;
      latestChallengeHandoff?: {
        topic: string;
        roundStatus: {
          matureEnoughForDecision: boolean;
          matureEnoughForRequirementBuild: boolean;
        };
      };
    };

    expect(persistedSession.currentMode).toBe('decision');
    expect(persistedSession.latestChallengeHandoff?.topic).toBe('验证 challenge handoff');
    expect(persistedSession.latestChallengeHandoff?.roundStatus.matureEnoughForDecision).toBe(true);
    expect(persistedSession.latestChallengeHandoff?.roundStatus.matureEnoughForRequirementBuild).toBe(false);
  });
});

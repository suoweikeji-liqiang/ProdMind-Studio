import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  appendLiveUserMessage,
  createLiveSession,
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
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ArtifactVersion,
  ConversationEvent,
  ConversationSession,
  ModeState,
} from '@prodmind/shared-types';
import { createSessionStore } from './session-store.js';

describe('SessionStore', () => {
  const testDir = path.join(process.cwd(), '.test-session-store');
  const store = createSessionStore();

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('creates and loads a persisted session', async () => {
    const session: ConversationSession = {
      sessionId: 'session-1',
      topic: 'Test the new session store',
      status: 'active',
      currentMode: 'challenge',
      sharedContext: {
        hardConstraints: ['No collaboration'],
        confirmedFacts: ['Web is primary'],
        sourceReferences: [],
      },
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:01.000Z',
      lastActiveAt: '2026-03-10T00:00:02.000Z',
    };

    await store.saveSession(testDir, session);
    const loaded = await store.getSession(testDir, session.sessionId);

    expect(loaded).toEqual(session);
  });

  it('lists sessions ordered by most recent activity', async () => {
    const older: ConversationSession = {
      sessionId: 'session-older',
      topic: 'Earlier topic',
      status: 'active',
      currentMode: 'challenge',
      sharedContext: {
        hardConstraints: [],
        confirmedFacts: [],
        sourceReferences: [],
      },
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:01.000Z',
      lastActiveAt: '2026-03-10T00:00:02.000Z',
    };
    const newer: ConversationSession = {
      ...older,
      sessionId: 'session-newer',
      topic: 'Later topic',
      updatedAt: '2026-03-10T00:10:01.000Z',
      lastActiveAt: '2026-03-10T00:10:02.000Z',
    };

    await store.saveSession(testDir, older);
    await store.saveSession(testDir, newer);

    const sessions = await store.listSessions(testDir);

    expect(sessions.map((session) => session.sessionId)).toEqual(['session-newer', 'session-older']);
  });

  it('appends and lists timeline events', async () => {
    const event: ConversationEvent = {
      type: 'user_message',
      eventId: 'event-1',
      sessionId: 'session-1',
      mode: 'challenge',
      timestamp: '2026-03-10T00:00:00.000Z',
      content: 'Pressure-test this topic.',
    };

    await store.appendEvent(testDir, event);
    const events = await store.listEvents(testDir, 'session-1');

    expect(events).toEqual([event]);
  });

  it('keeps mode state isolated by mode file', async () => {
    const challengeState: ModeState = {
      mode: 'challenge',
      roleSet: [{ roleId: 'architect', roleName: '架构师' }],
      messages: [],
      draftArtifacts: ['challenge-summary'],
      finalArtifacts: [],
    };

    const decisionState: ModeState = {
      mode: 'decision',
      roleSet: [{ roleId: 'decider', roleName: '裁决官' }],
      messages: [],
      draftSummary: {
        summary: 'Current leaning favors the conversation-first shell.',
        updatedAt: '2026-03-10T00:00:05.000Z',
      },
      draftArtifacts: [],
      finalArtifacts: ['decision-v1'],
    };

    await store.saveModeState(testDir, 'session-1', challengeState);
    await store.saveModeState(testDir, 'session-1', decisionState);

    const loadedChallenge = await store.getModeState(testDir, 'session-1', 'challenge');
    const loadedDecision = await store.getModeState(testDir, 'session-1', 'decision');

    expect(loadedChallenge?.draftArtifacts).toEqual(['challenge-summary']);
    expect(loadedDecision?.finalArtifacts).toEqual(['decision-v1']);
  });

  it('saves and retrieves a draft artifact', async () => {
    const draft = {
      title: 'Spec Draft',
      body: 'Draft content',
    };

    await store.saveDraftArtifact(testDir, 'session-1', 'requirement-build', 'spec', draft);
    const loaded = await store.getDraftArtifact(testDir, 'session-1', 'requirement-build', 'spec');

    expect(loaded).toEqual(draft);
  });

  it('lists draft artifacts for one mode without mixing other files', async () => {
    await store.saveDraftArtifact(testDir, 'session-1', 'requirement-build', 'spec', {
      title: 'Spec Draft',
      body: 'Draft spec content',
    });
    await store.saveDraftArtifact(testDir, 'session-1', 'requirement-build', 'tasks', {
      title: 'Tasks Draft',
      body: 'Draft tasks content',
    });

    const drafts = await store.listDraftArtifacts(testDir, 'session-1', 'requirement-build');

    expect(Object.keys(drafts).sort()).toEqual(['spec', 'tasks']);
    expect(drafts.spec).toEqual({
      title: 'Spec Draft',
      body: 'Draft spec content',
    });
  });

  it('finalizes artifact versions without overwriting earlier versions', async () => {
    const version1: ArtifactVersion = {
      artifactId: 'artifact-spec',
      sourceMode: 'requirement-build',
      artifactType: 'spec',
      version: 1,
      content: { title: 'Spec v1' },
      finalizedAt: '2026-03-10T00:00:10.000Z',
    };

    const version2: ArtifactVersion = {
      artifactId: 'artifact-spec',
      sourceMode: 'requirement-build',
      artifactType: 'spec',
      version: 2,
      content: { title: 'Spec v2' },
      finalizedAt: '2026-03-10T00:00:20.000Z',
      note: 'Expanded acceptance criteria',
    };

    await store.finalizeArtifact(testDir, 'session-1', version1);
    await store.saveDraftArtifact(testDir, 'session-1', 'requirement-build', 'spec', { title: 'Spec Draft v2' });
    await store.finalizeArtifact(testDir, 'session-1', version2);

    const versions = await store.listArtifactVersions(testDir, 'session-1', 'requirement-build', 'spec');
    const draft = await store.getDraftArtifact(testDir, 'session-1', 'requirement-build', 'spec');

    expect(versions.map((item) => item.version)).toEqual([1, 2]);
    expect(versions[0]?.content).toEqual({ title: 'Spec v1' });
    expect(versions[1]?.note).toBe('Expanded acceptance criteria');
    expect(draft).toEqual({ title: 'Spec Draft v2' });
  });
});

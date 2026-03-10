import { createSessionStore } from '@prodmind/asset-engine';
import type {
  ConversationEvent,
  ConversationMode,
  ConversationSession,
  DraftSummary,
  ModeMessage,
  ModeState,
  RoleIdentity,
} from '@prodmind/shared-types';

export interface LiveSessionState {
  session: ConversationSession;
  modeStates: Partial<Record<ConversationMode, ModeState>>;
}

const liveSessions = new Map<string, LiveSessionState>();
const persistence = createSessionStore();

function nowIso(): string {
  return new Date().toISOString();
}

function createEmptyModeState(mode: ConversationMode): ModeState {
  return {
    mode,
    roleSet: [],
    messages: [],
    draftArtifacts: [],
    finalArtifacts: [],
  };
}

async function loadModeStates(projectPath: string, sessionId: string): Promise<Partial<Record<ConversationMode, ModeState>>> {
  const modes: ConversationMode[] = ['challenge', 'decision', 'requirement-build'];
  const entries = await Promise.all(
    modes.map(async (mode) => [mode, await persistence.getModeState(projectPath, sessionId, mode)] as const)
  );

  return entries.reduce<Partial<Record<ConversationMode, ModeState>>>((accumulator, [mode, state]) => {
    if (state) {
      accumulator[mode] = state;
    }
    return accumulator;
  }, {});
}

export async function createLiveSession(projectPath: string, topic: string): Promise<LiveSessionState> {
  const timestamp = nowIso();
  const session: ConversationSession = {
    sessionId: Date.now().toString(),
    topic,
    status: 'active',
    currentMode: 'challenge',
    sharedContext: {
      hardConstraints: [],
      confirmedFacts: [],
      sourceReferences: [],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  };

  const initialModeState = createEmptyModeState('challenge');
  await persistence.saveSession(projectPath, session);
  await persistence.saveModeState(projectPath, session.sessionId, initialModeState);

  const liveState: LiveSessionState = {
    session,
    modeStates: { challenge: initialModeState },
  };
  liveSessions.set(session.sessionId, liveState);
  return liveState;
}

export async function getLiveSession(projectPath: string, sessionId: string): Promise<LiveSessionState | null> {
  const existing = liveSessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const session = await persistence.getSession(projectPath, sessionId);
  if (!session) {
    return null;
  }

  const modeStates = await loadModeStates(projectPath, sessionId);
  const liveState: LiveSessionState = { session, modeStates };
  liveSessions.set(sessionId, liveState);
  return liveState;
}

export async function switchLiveSessionMode(projectPath: string, sessionId: string, mode: ConversationMode): Promise<LiveSessionState | null> {
  const existing = await getLiveSession(projectPath, sessionId);
  if (!existing) {
    return null;
  }

  const previousMode = existing.session.currentMode;
  const timestamp = nowIso();
  const updatedSession: ConversationSession = {
    ...existing.session,
    currentMode: mode,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  };
  existing.session = updatedSession;
  existing.modeStates[mode] = existing.modeStates[mode] ?? createEmptyModeState(mode);

  const event: ConversationEvent = {
    type: 'mode_switched',
    eventId: `${sessionId}-mode-${Date.now()}`,
    sessionId,
    mode,
    timestamp,
    fromMode: previousMode,
    toMode: mode,
  };

  await persistence.saveSession(projectPath, updatedSession);
  await persistence.appendEvent(projectPath, event);
  liveSessions.set(sessionId, existing);
  return existing;
}

export async function appendLiveUserMessage(projectPath: string, sessionId: string, content: string): Promise<{ state: LiveSessionState; event: ConversationEvent } | null> {
  const existing = await getLiveSession(projectPath, sessionId);
  if (!existing) {
    return null;
  }

  const mode = existing.session.currentMode;
  const modeState = existing.modeStates[mode] ?? createEmptyModeState(mode);
  const message: ModeMessage = {
    speaker: 'user',
    content,
    timestamp: nowIso(),
  };
  const updatedModeState: ModeState = {
    ...modeState,
    messages: [...modeState.messages, message],
  };

  const updatedSession: ConversationSession = {
    ...existing.session,
    updatedAt: nowIso(),
    lastActiveAt: nowIso(),
  };

  const event: ConversationEvent = {
    type: 'user_message',
    eventId: `${sessionId}-message-${Date.now()}`,
    sessionId,
    mode,
    timestamp: message.timestamp,
    content,
  };

  existing.session = updatedSession;
  existing.modeStates[mode] = updatedModeState;

  await persistence.saveSession(projectPath, updatedSession);
  await persistence.saveModeState(projectPath, sessionId, updatedModeState);
  await persistence.appendEvent(projectPath, event);

  liveSessions.set(sessionId, existing);
  return { state: existing, event };
}

export async function appendLiveRoleMessages(
  projectPath: string,
  sessionId: string,
  messages: ModeMessage[],
  options: {
    roleSet?: RoleIdentity[];
    draftSummary?: DraftSummary;
  } = {}
): Promise<{ state: LiveSessionState; events: ConversationEvent[] } | null> {
  const existing = await getLiveSession(projectPath, sessionId);
  if (!existing) {
    return null;
  }

  const mode = existing.session.currentMode;
  const modeState = existing.modeStates[mode] ?? createEmptyModeState(mode);
  const updatedModeState: ModeState = {
    ...modeState,
    roleSet: options.roleSet ?? modeState.roleSet,
    draftSummary: options.draftSummary ?? modeState.draftSummary,
    messages: [...modeState.messages, ...messages],
  };

  const timestamp = nowIso();
  const updatedSession: ConversationSession = {
    ...existing.session,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  };

  const roleEvents: ConversationEvent[] = messages
    .filter(message => message.speaker === 'role' && message.roleId && message.roleName)
    .map((message, index) => ({
      type: 'role_message' as const,
      eventId: `${sessionId}-role-${Date.now()}-${index}`,
      sessionId,
      mode,
      timestamp: message.timestamp,
      roleId: message.roleId!,
      roleName: message.roleName!,
      content: message.content,
    }));

  const draftEvent = options.draftSummary
    ? [{
        type: 'draft_updated' as const,
        eventId: `${sessionId}-draft-${Date.now()}`,
        sessionId,
        mode,
        timestamp,
        summary: options.draftSummary.summary,
      }]
    : [];

  existing.session = updatedSession;
  existing.modeStates[mode] = updatedModeState;

  await persistence.saveSession(projectPath, updatedSession);
  await persistence.saveModeState(projectPath, sessionId, updatedModeState);

  for (const event of [...roleEvents, ...draftEvent]) {
    await persistence.appendEvent(projectPath, event);
  }

  liveSessions.set(sessionId, existing);
  return {
    state: existing,
    events: [...roleEvents, ...draftEvent],
  };
}

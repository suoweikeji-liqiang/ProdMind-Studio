import { createHistoryStore, createSessionStore } from '@prodmind/asset-engine';
import type {
  ArtifactVersion,
  ConversationEvent,
  ConversationMode,
  ConversationSession,
  ModeState,
} from '@prodmind/shared-types';
import type { LiveSessionState } from '../../state/session-store.js';
import { getLiveSession } from '../../state/session-store.js';
import { isChallengeInterruptPhase } from './challenge-helpers.js';
import { loadModeArtifacts } from './requirement-helpers.js';

const sessionPersistence = createSessionStore();

function hasCompletedChallengeRound(state: LiveSessionState): boolean {
  return (state.modeStates.challenge?.messages ?? []).some(
    (message) => message.speaker === 'role' && message.roleId === 'grounder',
  );
}

function hasDecisionVerdict(state: LiveSessionState): boolean {
  return (state.modeStates.decision?.messages ?? []).some(
    (message) => message.speaker === 'role' && message.roleId === 'verdict',
  );
}

export function buildSessionGuidance(state: LiveSessionState): {
  modeTransitionWarning?: string;
  recommendedRollbackMode?: ConversationMode;
} {
  if (
    state.session.currentMode === 'decision'
    && !hasCompletedChallengeRound(state)
    && !state.session.latestChallengeHandoff?.roundStatus.matureEnoughForDecision
  ) {
    return {
      modeTransitionWarning: '质疑模式尚未完成至少一轮问题定义与质疑回应，现在切到裁决模式会让比较框架不稳定。',
      recommendedRollbackMode: 'challenge',
    };
  }

  if (
    state.session.currentMode === 'requirement-build'
    && !hasDecisionVerdict(state)
    && !state.session.latestChallengeHandoff?.roundStatus.matureEnoughForRequirementBuild
  ) {
    return {
      modeTransitionWarning: '裁决模式还没有形成明确结论，现在进入需求共建模式，容易把未定方案过早沉淀成产物。',
      recommendedRollbackMode: 'decision',
    };
  }

  if (isChallengeInterruptPhase(state.session.currentPhase)) {
    if (state.session.currentPhase === 'waiting_tech_escape_response') {
      return {
        modeTransitionWarning: '系统检测到"技术先行"逃逸，建议先回应真实需求和验证路径，再继续收敛。',
      };
    }
    if (state.session.currentPhase === 'waiting_alternative_hypothesis_resolution') {
      return {
        modeTransitionWarning: '系统检测到更强的替代假设，建议先处理这个分歧，再决定是否进入下一模式。',
      };
    }
    return {
      modeTransitionWarning: '系统检测到伪共识，建议先明确仍然存在的分歧点。',
    };
  }

  return {};
}

export function buildSessionView(state: LiveSessionState) {
  return {
    ...state.session,
    ...buildSessionGuidance(state),
  };
}

export async function buildSessionHistoryView(projectPath: string, session: ConversationSession) {
  const liveState = (await getLiveSession(projectPath, session.sessionId)) ?? {
    session,
    modeStates: {},
  };
  const artifactSets = await Promise.all(
    (['challenge', 'decision', 'requirement-build'] as const).map((mode) => loadModeArtifacts(projectPath, session.sessionId, mode)),
  );
  const hasDraftArtifacts = artifactSets.some((artifacts) => Object.keys(artifacts.drafts ?? {}).length > 0);
  const hasFinalizedArtifacts = artifactSets.some((artifacts) => (
    Object.values(artifacts.finalized ?? {}).some((versions) => Array.isArray(versions) && versions.length > 0)
  ));

  return {
    ...buildSessionView(liveState),
    hasDraftArtifacts,
    hasFinalizedArtifacts,
  };
}

export async function loadReplayArtifacts(projectPath: string, sessionId: string) {
  return {
    challenge: await loadModeArtifacts(projectPath, sessionId, 'challenge'),
    decision: await loadModeArtifacts(projectPath, sessionId, 'decision'),
    'requirement-build': await loadModeArtifacts(projectPath, sessionId, 'requirement-build'),
  };
}

export async function buildReplayPayload(projectPath: string, sessionId: string) {
  const state = await getLiveSession(projectPath, sessionId);
  if (state) {
    return {
      source: 'session' as const,
      session: buildSessionView(state),
      events: await sessionPersistence.listEvents(projectPath, sessionId),
      modeStates: state.modeStates,
      artifacts: await loadReplayArtifacts(projectPath, sessionId),
    };
  }

  const historyStore = createHistoryStore();
  const legacyRun = await historyStore.getRun(projectPath, sessionId);
  if (!legacyRun) {
    return null;
  }

  return {
    source: 'legacy-workflow' as const,
    legacy: {
      run: legacyRun,
      result: await historyStore.getResult(projectPath, sessionId),
    },
  };
}

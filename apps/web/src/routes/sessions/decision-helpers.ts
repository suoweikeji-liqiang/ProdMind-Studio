import { createSessionStore } from '@prodmind/asset-engine';
import type {
  ChallengeHandoff,
  ConversationSession,
  DecisionFrame,
  ModeMessage,
  ModeState,
  TradeoffResult,
} from '@prodmind/shared-types';
import { DecisionFrameSchema, TradeoffResultSchema } from '@prodmind/shared-types';
import type { LiveSessionState } from '../../state/session-store.js';
import {
  getLiveSession,
  replaceLiveModeState,
  transitionSessionPhase,
} from '../../state/session-store.js';
import { DECISION_ROLE_SET } from './constants.js';
import { buildSharedContextPrompt, toUniqueStrings } from './shared-context.js';

const sessionPersistence = createSessionStore();

export function buildDecisionProblem(session: ConversationSession, content: string): string {
  const sharedContextPrompt = buildSharedContextPrompt(session.sharedContext);
  return [
    session.topic,
    '',
    `Latest user input: ${content}`,
    sharedContextPrompt,
  ].filter(Boolean).join('\n');
}

export function buildDecisionFrameFromChallengeHandoff(handoff: ChallengeHandoff): DecisionFrame {
  return {
    options: [
      `继续推进：${handoff.problemFrame.oneSentenceProblem}`,
      `先缩小范围并验证：${handoff.nextValidationActions[0] ?? '补一个最小验证动作'}`,
    ],
    criteria: toUniqueStrings([
      '问题是否足够真实且高频',
      '验证成本是否在当前约束内',
      ...handoff.userConfirmedContext.topPains.slice(0, 2),
    ]).slice(0, 4),
    constraints: toUniqueStrings([
      ...handoff.userConfirmedContext.constraints,
      ...handoff.problemFrame.boundaries,
    ]).slice(0, 5),
    assumptions: toUniqueStrings([
      handoff.strongestCounterHypothesis,
      ...handoff.openConflicts.slice(0, 2),
      ...handoff.nextValidationActions.slice(0, 1),
    ]).slice(0, 4),
  };
}

export function buildDecisionKickoffMessage(handoff: ChallengeHandoff, frame: DecisionFrame): ModeMessage {
  return {
    speaker: 'role',
    roleId: 'solution',
    roleName: '方案官',
    content: [
      '已承接质疑模式 handoff，并生成第一版裁决框架。',
      `问题定义：${handoff.problemFrame.oneSentenceProblem}`,
      `候选路径：${frame.options.join(' / ')}`,
      `比较维度：${frame.criteria.join(' / ')}`,
      `当前最强反设：${handoff.strongestCounterHypothesis}`,
      `未决冲突：${handoff.openConflicts.join(' / ') || '无'}`,
      `下一步验证动作：${handoff.nextValidationActions.join(' / ') || '待补充'}`,
    ].join('\n'),
    timestamp: new Date().toISOString(),
  };
}

export function buildDecisionFrameMessage(frame: DecisionFrame): ModeMessage {
  return {
    speaker: 'role',
    roleId: 'solution',
    roleName: '方案官',
    content: [
      '决策框架已生成：',
      `候选项: ${frame.options.join(' / ')}`,
      `比较维度: ${frame.criteria.join(' / ')}`,
      `约束: ${frame.constraints.join(' / ')}`,
      `假设: ${frame.assumptions.join(' / ')}`,
    ].join('\n'),
    timestamp: new Date().toISOString(),
  };
}

export function buildTradeoffMessage(tradeoff: TradeoffResult): ModeMessage {
  const analysisLines = Object.entries(tradeoff.analysis).map(([option, note]) => `${option}: ${note}`);
  return {
    speaker: 'role',
    roleId: 'tradeoff',
    roleName: '权衡官',
    content: [
      '权衡分析已完成：',
      ...analysisLines,
      `赢家: ${tradeoff.winners.join(' / ') || '无'}`,
      `落后项: ${tradeoff.losers.join(' / ') || '无'}`,
    ].join('\n'),
    timestamp: new Date().toISOString(),
  };
}

export function buildDecisionRecommendationMessage(recommendation: string): ModeMessage {
  return {
    speaker: 'role',
    roleId: 'verdict',
    roleName: '裁决官',
    content: recommendation,
    timestamp: new Date().toISOString(),
  };
}

export async function loadStoredDecisionFrame(projectPath: string, sessionId: string): Promise<DecisionFrame | null> {
  const raw = await sessionPersistence.getDraftArtifact(projectPath, sessionId, 'decision', 'frame');
  const parsed = DecisionFrameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function loadStoredTradeoff(projectPath: string, sessionId: string): Promise<TradeoffResult | null> {
  const raw = await sessionPersistence.getDraftArtifact(projectPath, sessionId, 'decision', 'tradeoff');
  const parsed = TradeoffResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function resolveDecisionAction(rawAction: string | undefined, currentPhase: string): 'decision_problem' | 'frame_correction' | 'priority_adjustment' | 'decision_resolution' {
  if (
    rawAction === 'decision_problem' ||
    rawAction === 'frame_correction' ||
    rawAction === 'priority_adjustment' ||
    rawAction === 'decision_resolution'
  ) {
    return rawAction;
  }

  if (currentPhase === 'waiting_user_frame_confirmation') {
    return 'frame_correction';
  }
  if (currentPhase === 'waiting_user_priority_adjustment') {
    return 'priority_adjustment';
  }
  if (currentPhase === 'waiting_decision_resolution') {
    return 'decision_resolution';
  }

  return 'decision_problem';
}

export async function seedDecisionModeFromChallengeHandoff(
  projectPath: string,
  sessionId: string,
  state: LiveSessionState,
): Promise<LiveSessionState | null> {
  const handoff = state.session.latestChallengeHandoff;
  const currentModeState = state.modeStates.decision ?? {
    mode: 'decision' as const,
    roleSet: [],
    messages: [],
    draftArtifacts: [],
    finalArtifacts: [],
  };

  if (!handoff || currentModeState.messages.length > 0) {
    return state;
  }

  const frame = buildDecisionFrameFromChallengeHandoff(handoff);
  await sessionPersistence.saveDraftArtifact(projectPath, sessionId, 'decision', 'frame', frame);

  const kickoffMessage = buildDecisionKickoffMessage(handoff, frame);
  const updatedModeState: ModeState = {
    ...currentModeState,
    mode: 'decision',
    roleSet: DECISION_ROLE_SET,
    messages: [...currentModeState.messages, kickoffMessage],
    draftSummary: {
      summary: '已承接质疑模式 handoff，等待你确认或修正裁决框架。',
      updatedAt: new Date().toISOString(),
    },
    draftArtifacts: Array.from(new Set([...currentModeState.draftArtifacts, 'frame'])),
    finalArtifacts: currentModeState.finalArtifacts,
  };

  const updated = await replaceLiveModeState(projectPath, sessionId, updatedModeState);
  if (!updated) {
    return null;
  }

  await sessionPersistence.appendEvent(projectPath, {
    type: 'role_message',
    eventId: `${sessionId}-decision-seed-${Date.now()}`,
    sessionId,
    mode: 'decision',
    timestamp: kickoffMessage.timestamp,
    roleId: kickoffMessage.roleId ?? 'solution',
    roleName: kickoffMessage.roleName ?? '方案官',
    content: kickoffMessage.content,
  });
  await sessionPersistence.appendEvent(projectPath, {
    type: 'draft_updated',
    eventId: `${sessionId}-decision-seed-draft-${Date.now()}`,
    sessionId,
    mode: 'decision',
    timestamp: new Date().toISOString(),
    summary: updatedModeState.draftSummary?.summary ?? '',
  });
  await transitionSessionPhase(
    projectPath,
    sessionId,
    'waiting_user_frame_confirmation',
    '请确认基于质疑收束生成的裁决框架，重点看未决冲突和下一步验证动作。',
    '已承接 challenge handoff 到裁决模式',
    handoff.roundStatus.matureEnoughForRequirementBuild ? 'requirement-build' : undefined,
  );

  return getLiveSession(projectPath, sessionId);
}

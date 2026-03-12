import { Router } from 'express';
import type { Request, Response } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runChallengeRound, runArchitectFraming, runGrounding, runObjectionGeneration } from '@prodmind/challenge-engine';
import {
  runDecisionFrameGeneration,
  runRecommendationSynthesis,
  runTradeoffAnalysis,
} from '@prodmind/decision-engine';
import { createRuntimeAdapter } from '@prodmind/llm-adapter';
import type { LLMAdapter } from '@prodmind/llm-adapter';
import { createAssetWriter, createHistoryStore, createProjectStore, createSessionStore } from '@prodmind/asset-engine';
import type {
  ArtifactVersion,
  ChallengeConflict,
  ConversationMode,
  ConversationSession,
  DecisionFrame,
  ModeMessage,
  ModeState,
  ProjectState,
  ProviderCapabilityProfile,
  ProviderExecutionSummary,
  RoleIdentity,
  SharedContext,
  TradeoffResult,
} from '@prodmind/shared-types';
import {
  ConversationModeSchema,
  DecisionFrameSchema,
  TradeoffResultSchema,
} from '@prodmind/shared-types';
import { loadProviderConfig } from '../config.js';
import {
  appendLiveRoleMessages,
  appendLiveUserMessage,
  createLiveSession,
  getLiveSession,
  type LiveSessionState,
  replaceLiveModeState,
  switchLiveSessionMode,
  transitionSessionPhase,
  updateLiveSessionSharedContext,
} from '../state/session-store.js';

export const sessionsRouter: Router = Router();
const sessionPersistence = createSessionStore();

const CHALLENGE_FAKE_RESPONSE = [
  '## 当前最强假设',
  '1. 用户需要围绕一个议题持续进行多轮对话。',
  '',
  '## MVP边界',
  '先聚焦中文 Web 会话、手动模式切换和完整过程沉淀。',
  '',
  '## 本轮证伪检查',
  '当前最重要假设：多角色可见发言会提升团队思考质量。',
  '如果我是错的：用户会觉得信息过载，不愿意继续多轮推进。',
  '最小动作：先在内部团队试跑 1 周，再根据使用反馈调节角色密度。',
].join('\n');

const DECISION_FAKE_FRAME: DecisionFrame = {
  options: ['buy an off-the-shelf system', 'build an internal system'],
  criteria: ['delivery speed', 'total cost', 'future extensibility'],
  constraints: ['limited implementation bandwidth', 'budget discipline'],
  assumptions: ['the company needs a shared management workflow soon'],
};

const DECISION_FAKE_TRADEOFF: TradeoffResult = {
  analysis: {
    'buy an off-the-shelf system': 'Ships faster and lowers delivery risk, but limits custom fit.',
    'build an internal system': 'Improves custom fit and control, but costs more time and coordination.',
  },
  winners: ['buy an off-the-shelf system'],
  losers: ['build an internal system'],
};

const DECISION_FAKE_RESPONSE = 'Recommendation: start with an off-the-shelf system, then only build custom modules where the workflow is truly strategic.';

const CHALLENGE_ROLE_SET: RoleIdentity[] = [
  { roleId: 'architect', roleName: '架构师' },
  { roleId: 'assassin', roleName: '刺客' },
  { roleId: 'userGhost', roleName: '用户幽灵' },
  { roleId: 'grounder', roleName: '锚点官' },
];

const DECISION_ROLE_SET: RoleIdentity[] = [
  { roleId: 'solution', roleName: '方案官' },
  { roleId: 'tradeoff', roleName: '权衡官' },
  { roleId: 'verdict', roleName: '裁决官' },
];

const REQUIREMENT_ROLE_SET: RoleIdentity[] = [
  { roleId: 'requirements', roleName: '需求师' },
  { roleId: 'user-representative', roleName: '用户代表' },
  { roleId: 'implementation', roleName: '实施工程师' },
  { roleId: 'acceptance', roleName: '验收官' },
];

const REQUIREMENT_ARTIFACT_TYPES = ['idea', 'spec', 'acceptance', 'tasks'] as const;
type ChallengeAction = 'raw_topic' | 'problem_correction' | 'objection_response' | 'round_resolution';
type DecisionAction = 'decision_problem' | 'frame_correction' | 'priority_adjustment' | 'decision_resolution';
type RequirementArtifactType = (typeof REQUIREMENT_ARTIFACT_TYPES)[number];
type RequirementAction = 'artifact_goal' | 'artifact_selection' | 'draft_revision' | 'finalization_note';
type SharedContextField = keyof SharedContext;

const CHALLENGE_INTERRUPT_PHASES = [
  'waiting_alternative_hypothesis_resolution',
  'waiting_false_consensus_break',
  'waiting_tech_escape_response',
] as const;

const CHALLENGE_MIN_RESPONSE_LENGTH = 50;
const CHALLENGE_MAX_ROUNDS = 5;
const CHALLENGE_INTERRUPT_FOCUS_ACTIONS: Record<(typeof CHALLENGE_INTERRUPT_PHASES)[number], string[]> = {
  waiting_alternative_hypothesis_resolution: ['accept', 'counter', 'verify'],
  waiting_false_consensus_break: ['broken_premise', 'name_gap', 'keep_pressing'],
  waiting_tech_escape_response: ['business_goal', 'user_problem', 'execution_constraint'],
};

interface RequirementDraftArtifact {
  artifactType: RequirementArtifactType;
  title: string;
  path: string;
  content: string;
  updatedAt: string;
}

const REQUIREMENT_ARTIFACT_TITLES: Record<RequirementArtifactType, string> = {
  idea: '想法草稿',
  spec: '规格草稿',
  acceptance: '验收草稿',
  tasks: '任务草稿',
};

const REQUIREMENT_ARTIFACT_LABELS: Record<RequirementArtifactType, string> = {
  idea: '想法',
  spec: '规格',
  acceptance: '验收',
  tasks: '任务',
};

const REQUIREMENT_ROLE_BY_ARTIFACT: Record<RequirementArtifactType, RoleIdentity> = {
  idea: { roleId: 'requirements', roleName: '需求师' },
  spec: { roleId: 'user-representative', roleName: '用户代表' },
  tasks: { roleId: 'implementation', roleName: '实施工程师' },
  acceptance: { roleId: 'acceptance', roleName: '验收官' },
};

async function writeRequirementDraftArtifact(
  projectDir: string,
  state: ProjectState,
  artifactType: RequirementArtifactType
): Promise<RequirementDraftArtifact> {
  await fs.mkdir(projectDir, { recursive: true });
  const writer = createAssetWriter();

  let artifactPath: string;
  if (artifactType === 'idea') {
    artifactPath = await writer.writeIdea(projectDir, state);
  } else if (artifactType === 'spec') {
    artifactPath = await writer.writeSpec(projectDir, state);
  } else if (artifactType === 'acceptance') {
    artifactPath = await writer.writeAcceptance(projectDir, state);
  } else {
    artifactPath = await writer.writeTasks(projectDir, state);
  }

  const content = await fs.readFile(artifactPath, 'utf8');
  return {
    artifactType,
    title: REQUIREMENT_ARTIFACT_TITLES[artifactType],
    path: artifactPath,
    content,
    updatedAt: new Date().toISOString(),
  };
}

const SHARED_CONTEXT_PREFIXES: Record<string, SharedContextField> = {
  fact: 'confirmedFacts',
  facts: 'confirmedFacts',
  '事实': 'confirmedFacts',
  constraint: 'hardConstraints',
  constraints: 'hardConstraints',
  '约束': 'hardConstraints',
  '限制': 'hardConstraints',
  source: 'sourceReferences',
  sources: 'sourceReferences',
  '参考': 'sourceReferences',
  '引用': 'sourceReferences',
};

function createChallengeAdapter() {
  return createRuntimeAdapter(
    loadProviderConfig(),
    { default: CHALLENGE_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 100,
            outputTokens: 80,
            totalTokens: 180,
          },
        },
      },
    }
  );
}

function createDecisionAdapter(): LLMAdapter {
  const config = loadProviderConfig();
  if (config.mode === 'fake') {
    const metadata: ProviderCapabilityProfile = {
      providerName: 'fake',
      modelName: 'fake-decision',
      enabled: true,
      capabilities: {
        structuredOutput: true,
        streaming: true,
      },
      reliability: {
        defaultTimeoutMs: 100,
        maxTimeoutMs: 100,
        defaultMaxRetries: 0,
        maxRetriesLimit: 0,
        fallbackEligible: false,
        fallbackMode: 'disabled',
      },
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
    };

    return {
      async streamText(messages, onToken) {
        const prompt = messages[messages.length - 1]?.content ?? '';
        const response = prompt.includes('decision judge')
          ? DECISION_FAKE_RESPONSE
          : 'Decision step complete.';
        for (const token of response) {
          onToken(token);
        }
        return response;
      },
      async generateStructured(messages, schema) {
        const prompt = messages[messages.length - 1]?.content ?? '';
        const payload = prompt.includes('structured decision frame')
          ? DECISION_FAKE_FRAME
          : DECISION_FAKE_TRADEOFF;
        return schema.parse(payload);
      },
      getMetadata() {
        return metadata;
      },
      getExecutionLog(): ProviderExecutionSummary[] {
        return [];
      },
      clearExecutionLog(): void {},
    };
  }

  return createRuntimeAdapter(
    config,
    { default: DECISION_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 90,
            outputTokens: 60,
            totalTokens: 150,
          },
        },
      },
    }
  );
}

function buildChallengeRoleMessages(round: Awaited<ReturnType<typeof runChallengeRound>>): ModeMessage[] {
  const timestamp = new Date().toISOString();

  return [
    { speaker: 'role', roleId: 'architect', roleName: '架构师', content: round.architect, timestamp },
    { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: round.assassin, timestamp },
    { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: round.userGhost, timestamp },
    { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: round.grounder, timestamp },
  ];
}

function buildChallengeDraftSummary(roundNumber: number, roleMessages: ModeMessage[], conflictCount: number): string {
  return `第 ${roundNumber} 轮 challenge 已完成，记录了 ${roleMessages.length} 个角色发言，当前发现 ${conflictCount} 个冲突信号。`;
}

function toAssistantContent(message: ModeMessage): string {
  if (message.roleName) {
    return `${message.roleName}: ${message.content}`;
  }

  return message.content;
}

function summarizeDraftContent(content: string, fallbackLabel: string): string {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.length > 0 ? lines.join('\n') : fallbackLabel;
}

function parseSharedContextPatch(content: string): Partial<SharedContext> {
  const patch: SharedContext = {
    hardConstraints: [],
    confirmedFacts: [],
    sourceReferences: [],
  };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(/^([A-Za-z]+|事实|约束|限制|参考|引用)\s*[:：]\s*(.+)$/u);
    if (!match) {
      continue;
    }

    const rawPrefix = match[1] ?? '';
    const key = SHARED_CONTEXT_PREFIXES[rawPrefix.toLowerCase()] ?? SHARED_CONTEXT_PREFIXES[rawPrefix];
    const value = match[2]?.trim();
    if (!key || !value) {
      continue;
    }

    patch[key].push(value);
  }

  return patch;
}

function hasSharedContextPatch(patch: Partial<SharedContext>): boolean {
  return Boolean(
    patch.confirmedFacts?.length ||
    patch.hardConstraints?.length ||
    patch.sourceReferences?.length
  );
}

function buildSharedContextSections(sharedContext: SharedContext): string[] {
  const sections: string[] = [];

  if (sharedContext.confirmedFacts.length > 0) {
    sections.push(`已确认事实：${sharedContext.confirmedFacts.join(' | ')}`);
  }
  if (sharedContext.hardConstraints.length > 0) {
    sections.push(`硬约束：${sharedContext.hardConstraints.join(' | ')}`);
  }
  if (sharedContext.sourceReferences.length > 0) {
    sections.push(`参考资料：${sharedContext.sourceReferences.join(' | ')}`);
  }

  return sections;
}

function buildSharedContextPrompt(sharedContext: SharedContext): string {
  const sections = buildSharedContextSections(sharedContext);
  if (sections.length === 0) {
    return '';
  }

  return ['共享底稿：', ...sections].join('\n');
}

function appendSharedContextSummary(summary: string, sharedContext: SharedContext): string {
  const sections = buildSharedContextSections(sharedContext);
  if (sections.length === 0) {
    return summary;
  }

  return [summary, '', '共享底稿', ...sections].join('\n');
}

function buildRequirementProjectState(session: ConversationSession, modeState: ModeState, latestInput: string): ProjectState {
  const projectStore = createProjectStore();
  const baseState = projectStore.create(session.sessionId, session.topic);
  const userTurns = modeState.messages.filter((message) => message.speaker === 'user').length;
  const sharedContextSections = buildSharedContextSections(session.sharedContext);
  const contextLines = [
    session.topic,
    ...(session.sharedContext.confirmedFacts.length > 0
      ? [`已确认事实：${session.sharedContext.confirmedFacts.join(' | ')}`]
      : []),
    ...(session.sharedContext.sourceReferences.length > 0
      ? [`参考资料：${session.sharedContext.sourceReferences.join(' | ')}`]
      : []),
  ];
  const boundaryLines = [
    '单议题会话，不考虑协同，产物通过草稿与定稿版本持续累积。',
    ...(session.sharedContext.hardConstraints.length > 0
      ? [`硬约束：${session.sharedContext.hardConstraints.join(' | ')}`]
      : []),
  ];

  return {
    ...baseState,
    updatedAt: new Date().toISOString(),
    clarityStage: userTurns > 1 ? 'structure' : 'direction',
    messages: modeState.messages.map((message) => ({
      role: message.speaker === 'user' ? 'user' : 'assistant',
      content: message.speaker === 'user' ? message.content : toAssistantContent(message),
      timestamp: message.timestamp,
    })),
    projection: {
      context: contextLines.join('\n'),
      actors: '公司内部需要系统化思考的使用者',
      intent: latestInput,
      mechanism: '通过中文多轮对话、模式切换和可见角色发言共同沉淀结构化需求资产。',
      boundary: boundaryLines.join('\n'),
    },
    lastCompression: {
      oneLiner: `${session.topic} 的需求草稿`,
      threeLiner: [
        `议题：${session.topic}`,
        `当前输入：${latestInput}`,
        ...(sharedContextSections.length > 0 ? [`共享底稿：${sharedContextSections.join('；')}`] : []),
        '目标：产出想法、规格、验收、任务四份可持续更新的草稿。',
      ].join('\n'),
      structured: JSON.stringify(
        {
          议题: session.topic,
          当前输入: latestInput,
          消息数: modeState.messages.length,
          当前模式: '需求共建模式',
          共享底稿: {
            硬约束: session.sharedContext.hardConstraints,
            已确认事实: session.sharedContext.confirmedFacts,
            参考资料: session.sharedContext.sourceReferences,
          },
        },
        null,
        2
      ),
    },
    lastBusinessAssumptions: [
      '使用者会先用多轮对话澄清问题，再手动定稿结构化产物。',
      ...session.sharedContext.confirmedFacts.map((fact) => `已确认事实：${fact}`),
      ...session.sharedContext.hardConstraints.map((constraint) => `硬约束：${constraint}`),
      ...session.sharedContext.sourceReferences.map((source) => `参考资料：${source}`),
    ],
    lastGuardWarnings: [],
  };
}

function buildRequirementRoleMessages(
  drafts: Record<RequirementArtifactType, { content: string }>
): ModeMessage[] {
  const timestamp = new Date().toISOString();

  return [
    {
      speaker: 'role',
      roleId: 'requirements',
      roleName: '需求师',
      content: `已整理想法草稿。\n${summarizeDraftContent(drafts.idea.content, '尚未形成想法草稿。')}`,
      timestamp,
    },
    {
      speaker: 'role',
      roleId: 'user-representative',
      roleName: '用户代表',
      content: `已补充规格草稿里的用户价值与使用方式。\n${summarizeDraftContent(drafts.spec.content, '尚未形成规格草稿。')}`,
      timestamp,
    },
    {
      speaker: 'role',
      roleId: 'implementation',
      roleName: '实施工程师',
      content: `已整理任务草稿里的实现拆分。\n${summarizeDraftContent(drafts.tasks.content, '尚未形成任务草稿。')}`,
      timestamp,
    },
    {
      speaker: 'role',
      roleId: 'acceptance',
      roleName: '验收官',
      content: `已补充验收草稿里的验收边界。\n${summarizeDraftContent(drafts.acceptance.content, '尚未形成验收草稿。')}`,
      timestamp,
    },
  ];
}

function buildRequirementDraftSummary(drafts: Record<RequirementArtifactType, { updatedAt: string }>): string {
  const artifactLabels = REQUIREMENT_ARTIFACT_TYPES.map((artifactType) => REQUIREMENT_ARTIFACT_LABELS[artifactType]).join(' / ');
  return `需求共建模式已更新 ${REQUIREMENT_ARTIFACT_TYPES.length} 份草稿：${artifactLabels}。最近更新时间 ${drafts.spec.updatedAt}。`;
}

function parseRequirementArtifactType(content: string): RequirementArtifactType | null {
  const normalized = content.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (REQUIREMENT_ARTIFACT_TYPES.includes(normalized as RequirementArtifactType)) {
    return normalized as RequirementArtifactType;
  }
  if (normalized.includes('idea') || normalized.includes('想法')) {
    return 'idea';
  }
  if (normalized.includes('spec') || normalized.includes('规格') || normalized.includes('规约')) {
    return 'spec';
  }
  if (normalized.includes('acceptance') || normalized.includes('验收')) {
    return 'acceptance';
  }
  if (normalized.includes('tasks') || normalized.includes('任务')) {
    return 'tasks';
  }

  return null;
}

function resolveRequirementAction(rawAction: string | undefined, currentPhase: string): RequirementAction {
  if (
    rawAction === 'artifact_goal' ||
    rawAction === 'artifact_selection' ||
    rawAction === 'draft_revision' ||
    rawAction === 'finalization_note'
  ) {
    return rawAction;
  }

  if (currentPhase === 'waiting_user_artifact_selection') {
    return 'artifact_selection';
  }
  if (currentPhase === 'waiting_user_draft_revision' || currentPhase === 'ready_for_downstream_or_finalize') {
    return 'draft_revision';
  }

  return 'artifact_goal';
}

function isChallengeInterruptPhase(currentPhase: string): currentPhase is (typeof CHALLENGE_INTERRUPT_PHASES)[number] {
  return CHALLENGE_INTERRUPT_PHASES.includes(currentPhase as (typeof CHALLENGE_INTERRUPT_PHASES)[number]);
}

function countCompletedChallengeRounds(messages: ModeMessage[]): number {
  return messages.filter((message) => message.speaker === 'role' && message.roleId === 'grounder').length;
}

function validateChallengeTurnInput(
  state: LiveSessionState,
  action: ChallengeAction,
  content: string,
  focusAction: string | undefined,
): { status: number; error: string } | null {
  const trimmed = content.trim();
  const phase = state.session.currentPhase;
  const messages = state.modeStates.challenge?.messages ?? [];

  if (action === 'objection_response') {
    if (trimmed.length < CHALLENGE_MIN_RESPONSE_LENGTH) {
      return {
        status: 400,
        error: `当前阶段的回应至少 ${CHALLENGE_MIN_RESPONSE_LENGTH} 字，避免一句话跳过关键质疑。`,
      };
    }

    if (isChallengeInterruptPhase(phase)) {
      const selectedAction = focusAction?.trim();
      if (!selectedAction) {
        return {
          status: 400,
          error: '当前中断态必须先选择一种处理路径，再提交回应。',
        };
      }

      if (!CHALLENGE_INTERRUPT_FOCUS_ACTIONS[phase].includes(selectedAction)) {
        return {
          status: 400,
          error: '当前中断态的处理路径无效，请重新选择一个明确动作。',
        };
      }
    }
  }

  if (action === 'round_resolution' && countCompletedChallengeRounds(messages) >= CHALLENGE_MAX_ROUNDS) {
    return {
      status: 409,
      error: `已达到质疑模式最大 ${CHALLENGE_MAX_ROUNDS} 轮，请改为切换模式或回看本轮结论。`,
    };
  }

  return null;
}

function resolveChallengeAction(rawAction: string | undefined, currentPhase: string): ChallengeAction {
  if (
    rawAction === 'raw_topic' ||
    rawAction === 'problem_correction' ||
    rawAction === 'objection_response' ||
    rawAction === 'round_resolution'
  ) {
    return rawAction;
  }

  if (currentPhase === 'waiting_user_problem_correction') {
    return 'problem_correction';
  }
  if (currentPhase === 'waiting_user_objection_response' || isChallengeInterruptPhase(currentPhase)) {
    return 'objection_response';
  }
  if (currentPhase === 'waiting_round_decision') {
    return 'round_resolution';
  }

  return 'raw_topic';
}

function chooseNextRequirementArtifact(existingDraftArtifacts: string[]): RequirementArtifactType {
  for (const artifactType of REQUIREMENT_ARTIFACT_TYPES) {
    if (!existingDraftArtifacts.includes(artifactType)) {
      return artifactType;
    }
  }
  const currentArtifact = existingDraftArtifacts[existingDraftArtifacts.length - 1];
  return parseRequirementArtifactType(currentArtifact ?? '') ?? 'spec';
}

function mergeRequirementDraftArtifacts(
  existingDraftArtifacts: string[],
  artifactType: RequirementArtifactType
): RequirementArtifactType[] {
  const set = new Set<RequirementArtifactType>();
  for (const artifact of existingDraftArtifacts) {
    const parsed = parseRequirementArtifactType(artifact);
    if (parsed) {
      set.add(parsed);
    }
  }
  set.add(artifactType);
  return REQUIREMENT_ARTIFACT_TYPES.filter((artifact) => set.has(artifact));
}

function buildRequirementGoalMessage(suggestedArtifact: RequirementArtifactType): ModeMessage {
  return {
    speaker: 'role',
    roleId: 'requirements',
    roleName: '需求师',
    content: `我已记录你的需求目标。建议先推进“${REQUIREMENT_ARTIFACT_LABELS[suggestedArtifact]}”这一层。请直接点击下方层级按钮，或回复想法 / 规格 / 验收 / 任务。`,
    timestamp: new Date().toISOString(),
  };
}

function buildRequirementRoleMessage(
  artifactType: RequirementArtifactType,
  draft: RequirementDraftArtifact,
  mode: 'selection' | 'revision'
): ModeMessage {
  const role = REQUIREMENT_ROLE_BY_ARTIFACT[artifactType];
  const actionLabel = mode === 'selection' ? '已生成' : '已更新';
  const artifactLabel = REQUIREMENT_ARTIFACT_LABELS[artifactType];
  return {
    speaker: 'role',
    roleId: role.roleId,
    roleName: role.roleName,
    content: `${actionLabel}${artifactLabel}草稿。\n${summarizeDraftContent(draft.content, `${artifactLabel}草稿待完善。`)}`,
    timestamp: new Date().toISOString(),
  };
}

function buildRequirementDraftSummaryByArtifact(
  artifactType: RequirementArtifactType,
  draft: RequirementDraftArtifact,
  mode: 'selection' | 'revision' | 'goal'
): string {
  if (mode === 'goal') {
    return '需求目标已记录，等待你选择要推进的草稿层。';
  }

  const actionLabel = mode === 'selection' ? '已生成' : '已更新';
  return `需求共建模式${actionLabel}${REQUIREMENT_ARTIFACT_LABELS[artifactType]}草稿。最近更新时间 ${draft.updatedAt}。`;
}

function buildDecisionProblem(session: ConversationSession, content: string): string {
  const sharedContextPrompt = buildSharedContextPrompt(session.sharedContext);
  return [
    session.topic,
    '',
    `Latest user input: ${content}`,
    sharedContextPrompt,
  ].filter(Boolean).join('\n');
}

function getInterruptTransition(conflicts: ChallengeConflict[] | undefined): {
  phase:
    | 'waiting_tech_escape_response'
    | 'waiting_alternative_hypothesis_resolution'
    | 'waiting_false_consensus_break';
  requiredUserAction: string;
  lastCompletedStep: string;
} | null {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  if (conflicts.some((conflict) => conflict.type === 'tech_escape')) {
    return {
      phase: 'waiting_tech_escape_response',
      requiredUserAction: '请正面回应这些质疑，不要把讨论逃到“技术自然会解决”上。',
      lastCompletedStep: '已检测到技术逃逸',
    };
  }

  if (conflicts.some((conflict) => conflict.type === 'alternative_hypothesis')) {
    return {
      phase: 'waiting_alternative_hypothesis_resolution',
      requiredUserAction: '请先处理更强的替代假设，再决定是否继续。',
      lastCompletedStep: '已检测到替代假设',
    };
  }

  if (conflicts.some((conflict) => conflict.type === 'consensus_alert')) {
    return {
      phase: 'waiting_false_consensus_break',
      requiredUserAction: '请打破这段伪共识，明确哪些前提仍然不成立。',
      lastCompletedStep: '已检测到伪共识',
    };
  }

  return null;
}

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

function buildSessionGuidance(state: LiveSessionState): {
  modeTransitionWarning?: string;
  recommendedRollbackMode?: ConversationMode;
} {
  if (state.session.currentMode === 'decision' && !hasCompletedChallengeRound(state)) {
    return {
      modeTransitionWarning: '质疑模式尚未完成至少一轮问题定义与质疑回应，现在切到裁决模式会让比较框架不稳定。',
      recommendedRollbackMode: 'challenge',
    };
  }

  if (state.session.currentMode === 'requirement-build' && !hasDecisionVerdict(state)) {
    return {
      modeTransitionWarning: '裁决模式还没有形成明确结论，现在进入需求共建模式，容易把未定方案过早沉淀成产物。',
      recommendedRollbackMode: 'decision',
    };
  }

  if (isChallengeInterruptPhase(state.session.currentPhase)) {
    if (state.session.currentPhase === 'waiting_tech_escape_response') {
      return {
        modeTransitionWarning: '系统检测到“技术先行”逃逸，建议先回应真实需求和验证路径，再继续收敛。',
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

function buildSessionView(state: LiveSessionState) {
  return {
    ...state.session,
    ...buildSessionGuidance(state),
  };
}

async function buildSessionHistoryView(projectPath: string, session: ConversationSession) {
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

function resolveDecisionAction(rawAction: string | undefined, currentPhase: string): DecisionAction {
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

function buildDecisionFrameMessage(frame: DecisionFrame): ModeMessage {
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

function buildTradeoffMessage(tradeoff: TradeoffResult): ModeMessage {
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

function buildDecisionRecommendationMessage(recommendation: string): ModeMessage {
  return {
    speaker: 'role',
    roleId: 'verdict',
    roleName: '裁决官',
    content: recommendation,
    timestamp: new Date().toISOString(),
  };
}

async function loadStoredDecisionFrame(projectPath: string, sessionId: string): Promise<DecisionFrame | null> {
  const raw = await sessionPersistence.getDraftArtifact(projectPath, sessionId, 'decision', 'frame');
  const parsed = DecisionFrameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function loadStoredTradeoff(projectPath: string, sessionId: string): Promise<TradeoffResult | null> {
  const raw = await sessionPersistence.getDraftArtifact(projectPath, sessionId, 'decision', 'tradeoff');
  const parsed = TradeoffResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function finalizeRequirementArtifacts(projectPath: string, sessionId: string, note?: string) {
  const state = await getLiveSession(projectPath, sessionId);
  if (!state) {
    return { error: 'Session not found', status: 404 as const };
  }
  if (state.session.currentMode !== 'requirement-build') {
    return { error: 'Artifacts can only be finalized in requirement-build mode', status: 400 as const };
  }

  const drafts = await sessionPersistence.listDraftArtifacts(projectPath, sessionId, 'requirement-build');
  if (Object.keys(drafts).length === 0) {
    return { error: 'No draft artifacts available', status: 400 as const };
  }

  const finalizedLabels: string[] = [];
  const finalizedArtifacts: RequirementArtifactType[] = [];
  for (const artifactType of REQUIREMENT_ARTIFACT_TYPES) {
    const draft = drafts[artifactType];
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      continue;
    }

    const previousVersions = await sessionPersistence.listArtifactVersions(projectPath, sessionId, 'requirement-build', artifactType);
    const nextVersion = previousVersions.length + 1;
    const artifact: ArtifactVersion = {
      artifactId: `${sessionId}-${artifactType}`,
      sourceMode: 'requirement-build',
      artifactType,
      version: nextVersion,
      content: draft as Record<string, unknown>,
      finalizedAt: new Date().toISOString(),
      ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
    };

    await sessionPersistence.finalizeArtifact(projectPath, sessionId, artifact);
    await sessionPersistence.appendEvent(projectPath, {
      type: 'artifact_finalized',
      eventId: `${sessionId}-${artifactType}-v${nextVersion}`,
      sessionId,
      mode: 'requirement-build',
      timestamp: artifact.finalizedAt,
      artifactId: artifact.artifactId,
      artifactType,
      version: nextVersion,
    });
    finalizedLabels.push(`${artifactType}:v${nextVersion}`);
    finalizedArtifacts.push(artifactType);
  }

  const modeState = state.modeStates['requirement-build'];
  if (!modeState) {
    return { error: 'Mode state not found', status: 404 as const };
  }

  const updated = await replaceLiveModeState(projectPath, sessionId, {
    ...modeState,
    draftSummary: {
      summary: finalizedLabels.length > 0
        ? `Finalized ${finalizedLabels.join(', ')}`
        : 'No requirement artifacts were finalized.',
      updatedAt: new Date().toISOString(),
    },
    draftArtifacts: Array.from(new Set([...modeState.draftArtifacts, ...finalizedArtifacts])),
    finalArtifacts: [...modeState.finalArtifacts, ...finalizedLabels],
  });

  if (!updated) {
    return { error: 'Session not found', status: 404 as const };
  }

  return {
    updated,
    artifacts: await loadModeArtifacts(projectPath, sessionId, 'requirement-build'),
  };
}

async function loadModeArtifacts(projectPath: string, sessionId: string, mode: ModeState['mode']) {
  if (mode !== 'requirement-build') {
    return {
      drafts: {} as Record<string, unknown>,
      finalized: {} as Record<string, ArtifactVersion[]>,
    };
  }

  const drafts = await sessionPersistence.listDraftArtifacts(projectPath, sessionId, mode);
  const finalizedEntries = await Promise.all(
    REQUIREMENT_ARTIFACT_TYPES.map(async (artifactType) => {
      const versions = await sessionPersistence.listArtifactVersions(projectPath, sessionId, mode, artifactType);
      return [artifactType, versions] as const;
    })
  );

  return {
    drafts,
    finalized: Object.fromEntries(finalizedEntries) as Record<string, ArtifactVersion[]>,
  };
}

async function loadReplayArtifacts(projectPath: string, sessionId: string) {
  return {
    'requirement-build': await loadModeArtifacts(projectPath, sessionId, 'requirement-build'),
  };
}

async function buildReplayPayload(projectPath: string, sessionId: string) {
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

sessionsRouter.post('/', async (req: Request, res: Response) => {
  const { topic, projectPath = './prodmind-project' } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'topic required' });
  }

  const state = await createLiveSession(projectPath, topic);
  return res.status(201).json({
    session: buildSessionView(state),
    modeState: state.modeStates[state.session.currentMode] ?? null,
  });
});

sessionsRouter.get('/', async (req: Request, res: Response) => {
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  const sessions = await sessionPersistence.listSessions(projectPath);

  return res.json({
    sessions: await Promise.all(sessions.map((session) => buildSessionHistoryView(projectPath, session))),
  });
});

sessionsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const state = await getLiveSession(projectPath, id);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    session: buildSessionView(state),
    modeState: state.modeStates[state.session.currentMode] ?? null,
    artifacts: await loadModeArtifacts(projectPath, id, state.session.currentMode),
  });
});

sessionsRouter.get('/:id/replay', async (req: Request, res: Response) => {
  const { id } = req.params;
  const projectPath = (req.query.projectPath as string) || './prodmind-project';
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const replay = await buildReplayPayload(projectPath, id);
  if (!replay) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json(replay);
});

sessionsRouter.post('/:id/mode', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mode, projectPath = './prodmind-project' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const parsed = ConversationModeSchema.safeParse(mode);
  if (!parsed.success) {
    return res.status(400).json({ error: 'valid mode required' });
  }

  const state = await switchLiveSessionMode(projectPath, id, parsed.data);
  if (!state) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({
    session: buildSessionView(state),
    modeState: state.modeStates[state.session.currentMode] ?? null,
    artifacts: await loadModeArtifacts(projectPath, id, state.session.currentMode),
  });
});

sessionsRouter.post('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, projectPath = './prodmind-project' } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }

  const currentState = await getLiveSession(projectPath, id);
  if (!currentState) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const challengeAction = currentState.session.currentMode === 'challenge'
    ? resolveChallengeAction(
      (req.body as Record<string, string>).action,
      currentState.session.currentPhase,
    )
    : null;

  if (challengeAction) {
    const validation = validateChallengeTurnInput(
      currentState,
      challengeAction,
      String(content),
      typeof req.body.focusAction === 'string' ? req.body.focusAction : undefined,
    );
    if (validation) {
      return res.status(validation.status).json({ error: validation.error });
    }
  }

  const initialResult = await appendLiveUserMessage(projectPath, id, content);
  if (!initialResult) {
    return res.status(404).json({ error: 'Session not found' });
  }

  let result = initialResult;
  const sharedContextPatch = parseSharedContextPatch(content);
  if (hasSharedContextPatch(sharedContextPatch)) {
    const updatedSharedContext = await updateLiveSessionSharedContext(projectPath, id, sharedContextPatch);
    if (!updatedSharedContext) {
      return res.status(404).json({ error: 'Session not found' });
    }

    result = {
      ...result,
      state: updatedSharedContext.state,
    };
  }

  if (result.state.session.currentMode !== 'challenge') {
    if (result.state.session.currentMode === 'decision') {
      try {
        const decisionAction = resolveDecisionAction(
          (req.body as Record<string, string>).action,
          result.state.session.currentPhase,
        );
        const adapter = createDecisionAdapter();

        if (decisionAction === 'decision_problem') {
          const frame = await runDecisionFrameGeneration(adapter, buildDecisionProblem(result.state.session, content));
          await sessionPersistence.saveDraftArtifact(projectPath, id, 'decision', 'frame', frame);

          const updated = await appendLiveRoleMessages(projectPath, id, [buildDecisionFrameMessage(frame)], {
            roleSet: DECISION_ROLE_SET,
            draftSummary: {
              summary: appendSharedContextSummary(
                '决策框架已生成，等待你确认或修正。',
                result.state.session.sharedContext,
              ),
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(
            projectPath,
            id,
            'waiting_user_frame_confirmation',
            '请确认或修正决策框架。',
            '决策框架已生成',
          );

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
          });
        }

        if (decisionAction === 'frame_correction') {
          const frame = await loadStoredDecisionFrame(projectPath, id);
          if (!frame) {
            return res.status(400).json({ error: 'decision frame missing; start with action=decision_problem' });
          }

          const tradeoff = await runTradeoffAnalysis(adapter, frame, content);
          await sessionPersistence.saveDraftArtifact(projectPath, id, 'decision', 'tradeoff', tradeoff);

          const updated = await appendLiveRoleMessages(projectPath, id, [buildTradeoffMessage(tradeoff)], {
            roleSet: DECISION_ROLE_SET,
            draftSummary: {
              summary: appendSharedContextSummary(
                '权衡分析已生成，等待你调整优先级。',
                result.state.session.sharedContext,
              ),
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(
            projectPath,
            id,
            'waiting_user_priority_adjustment',
            '请先调整优先级或权重，再进入推荐结论。',
            '权衡分析已完成',
          );

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
          });
        }

        if (decisionAction === 'priority_adjustment') {
          const frame = await loadStoredDecisionFrame(projectPath, id);
          const tradeoff = await loadStoredTradeoff(projectPath, id);
          if (!frame || !tradeoff) {
            return res.status(400).json({ error: 'decision frame/tradeoff missing; complete earlier steps first' });
          }

          const recommendation = await runRecommendationSynthesis(adapter, frame, tradeoff);
          const updated = await appendLiveRoleMessages(projectPath, id, [buildDecisionRecommendationMessage(recommendation)], {
            roleSet: DECISION_ROLE_SET,
            draftSummary: {
              summary: appendSharedContextSummary(recommendation, result.state.session.sharedContext),
              updatedAt: new Date().toISOString(),
            },
          });

          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

          await transitionSessionPhase(
            projectPath,
            id,
            'waiting_decision_resolution',
            '请审阅推荐结论，然后决定收束本模式还是切换模式。',
            '推荐结论已生成',
            'requirement-build',
          );

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
          });
        }

        await transitionSessionPhase(
          projectPath,
          id,
          'decision_prompt_submitted',
          '请输入下一个决策问题，或切换模式。',
          '已记录决策结论',
        );

        const finalState = await getLiveSession(projectPath, id);
        return res.status(200).json({
          session: buildSessionView(finalState!),
          modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
          event: result.event,
          artifacts: await loadModeArtifacts(projectPath, id, finalState!.session.currentMode),
        });
      } catch (error) {
        return res.status(502).json({
          error: error instanceof Error ? error.message : 'Decision turn failed',
        });
      }
    }

    if (result.state.session.currentMode === 'requirement-build') {
      try {
        const modeState = result.state.modeStates['requirement-build'];
        if (!modeState) {
          return res.status(404).json({ error: 'Mode state not found' });
        }

        const requirementAction = resolveRequirementAction(
          (req.body as Record<string, string>).action,
          result.state.session.currentPhase,
        );
        const draftDir = path.join(projectPath, '.prodmind', 'sessions', id, 'workspace', 'requirement-build', 'draft');

        if (requirementAction === 'artifact_goal') {
          const suggestedArtifact = parseRequirementArtifactType(content) ?? chooseNextRequirementArtifact(modeState.draftArtifacts);
          const goalMessage = buildRequirementGoalMessage(suggestedArtifact);
          const updated = await appendLiveRoleMessages(projectPath, id, [goalMessage], {
            roleSet: REQUIREMENT_ROLE_SET,
            draftSummary: {
              summary: '已记录产物目标，等待你选择要推进的产物层级。',
              updatedAt: new Date().toISOString(),
            },
          });
          if (!updated) {
            return res.status(404).json({ error: 'Session not found' });
          }

        await transitionSessionPhase(
          projectPath,
          id,
          'waiting_user_artifact_selection',
          '请选择要推进的产物层级：想法、规格、验收或任务。',
          '已记录产物目标',
        );

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: await loadModeArtifacts(projectPath, id, 'requirement-build'),
          });
        }

        if (requirementAction === 'finalization_note') {
          const finalized = await finalizeRequirementArtifacts(projectPath, id, content);
          if ('error' in finalized) {
            return res.status(finalized.status ?? 500).json({ error: finalized.error });
          }

          await transitionSessionPhase(
            projectPath,
            id,
            'artifact_finalized',
            '你可以继续发起新的产物目标，或切换模式。',
            '已完成产物定稿',
          );

          const finalState = await getLiveSession(projectPath, id);
          return res.status(200).json({
            session: buildSessionView(finalState!),
            modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
            event: result.event,
            artifacts: finalized.artifacts,
          });
        }

        const explicitArtifact = parseRequirementArtifactType(content);
        const artifactType = requirementAction === 'artifact_selection'
          ? explicitArtifact
          : explicitArtifact ?? parseRequirementArtifactType(modeState.draftArtifacts[modeState.draftArtifacts.length - 1] ?? '');
        if (!artifactType) {
          return res.status(400).json({
            error: '请选择要推进的草稿层级：想法、规格、验收或任务。',
          });
        }

        const projectState = buildRequirementProjectState(result.state.session, modeState, content);
        const draft = await writeRequirementDraftArtifact(draftDir, projectState, artifactType);
        await sessionPersistence.saveDraftArtifact(projectPath, id, 'requirement-build', artifactType, draft);

        const roleMessage = buildRequirementRoleMessage(
          artifactType,
          draft,
          requirementAction === 'artifact_selection' ? 'selection' : 'revision',
        );
        const updatedModeState: ModeState = {
          ...modeState,
          roleSet: REQUIREMENT_ROLE_SET,
          messages: [...modeState.messages, roleMessage],
          draftSummary: {
            summary: buildRequirementDraftSummaryByArtifact(
              artifactType,
              draft,
              requirementAction === 'artifact_selection' ? 'selection' : 'revision',
            ),
            updatedAt: new Date().toISOString(),
          },
          draftArtifacts: mergeRequirementDraftArtifacts(modeState.draftArtifacts, artifactType),
          finalArtifacts: modeState.finalArtifacts,
        };

        const updated = await replaceLiveModeState(projectPath, id, updatedModeState);
        if (!updated) {
          return res.status(404).json({ error: 'Session not found' });
        }

        await sessionPersistence.appendEvent(projectPath, {
          type: 'role_message',
          eventId: `${id}-requirement-role-${artifactType}-${Date.now()}`,
          sessionId: id,
          mode: 'requirement-build',
          timestamp: roleMessage.timestamp,
          roleId: roleMessage.roleId ?? 'unknown',
          roleName: roleMessage.roleName ?? 'system',
          content: roleMessage.content,
        });
        await sessionPersistence.appendEvent(projectPath, {
          type: 'draft_updated',
          eventId: `${id}-requirement-draft-${artifactType}-${Date.now()}`,
          sessionId: id,
          mode: 'requirement-build',
          timestamp: new Date().toISOString(),
          summary: updatedModeState.draftSummary?.summary ?? '',
        });

        await transitionSessionPhase(
          projectPath,
          id,
          requirementAction === 'artifact_selection'
            ? 'waiting_user_draft_revision'
            : 'ready_for_downstream_or_finalize',
          requirementAction === 'artifact_selection'
            ? '请先审阅草稿，再决定是否继续修订。'
            : '你可以继续修订草稿，或直接补充定稿备注。',
          requirementAction === 'artifact_selection'
            ? `已生成${REQUIREMENT_ARTIFACT_LABELS[artifactType]}草稿`
            : `已更新${REQUIREMENT_ARTIFACT_LABELS[artifactType]}草稿`,
        );

        const finalState = await getLiveSession(projectPath, id);
        return res.status(200).json({
          session: buildSessionView(finalState!),
          modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
          event: result.event,
          artifacts: await loadModeArtifacts(projectPath, id, 'requirement-build'),
        });
      } catch (error) {
        return res.status(502).json({
          error: error instanceof Error ? error.message : 'Requirement build turn failed',
        });
      }
    }


    return res.status(202).json({
      session: buildSessionView(result.state),
      modeState: result.state.modeStates[result.state.session.currentMode] ?? null,
      event: result.event,
    });
  }

  const action = challengeAction ?? resolveChallengeAction(
    (req.body as Record<string, string>).action,
    result.state.session.currentPhase,
  );
  const adapter = createChallengeAdapter();

  try {
    if (action === 'raw_topic') {
      const topic = [result.state.session.topic, content].filter(Boolean).join('\n');
      const { architect } = await runArchitectFraming(adapter, topic);
      const architectMessage: ModeMessage = {
        speaker: 'role',
        roleId: 'architect',
        roleName: '架构师',
        content: architect,
        timestamp: new Date().toISOString(),
      };
      const updated = await appendLiveRoleMessages(projectPath, id, [architectMessage], {
        roleSet: CHALLENGE_ROLE_SET,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await transitionSessionPhase(
        projectPath,
        id,
        'waiting_user_problem_correction',
        '请确认或修正问题定义。',
        '架构师已完成问题定义',
      );

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    if (action === 'problem_correction') {
      const challengeState = result.state.modeStates.challenge;
      const architectMessage = challengeState?.messages.find(
        (message) => message.speaker === 'role' && message.roleId === 'architect',
      );
      const architect = architectMessage?.content ?? result.state.session.topic;
      const { assassin, userGhost } = await runObjectionGeneration(adapter, architect, content);
      const timestamp = new Date().toISOString();
      const roleMessages: ModeMessage[] = [
        { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: assassin, timestamp },
        { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: userGhost, timestamp },
      ];
      const updated = await appendLiveRoleMessages(projectPath, id, roleMessages, {
        roleSet: CHALLENGE_ROLE_SET,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
      }

      await transitionSessionPhase(
        projectPath,
        id,
        'waiting_user_objection_response',
        '请直接回应当前轮中的关键质疑。',
        '反方质疑已生成',
      );

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    if (action === 'objection_response') {
      const challengeState = result.state.modeStates.challenge;
      const messages = challengeState?.messages ?? [];
      const architect = messages.find((message) => message.roleId === 'architect')?.content ?? result.state.session.topic;
      const assassin = messages.find((message) => message.roleId === 'assassin')?.content ?? '';
      const userGhost = messages.find((message) => message.roleId === 'userGhost')?.content ?? '';
      const userMessages = messages.filter((message) => message.speaker === 'user');
      const userConfirm = userMessages.at(-2)?.content ?? userMessages.at(-1)?.content ?? '';
      const { grounder, conflicts } = await runGrounding(adapter, architect, userConfirm, assassin, userGhost, content);
      const grounderMessage: ModeMessage = {
        speaker: 'role',
        roleId: 'grounder',
        roleName: '锚点官',
        content: grounder,
        timestamp: new Date().toISOString(),
      };

      const completedRoundCount = messages.filter(
        (message) => message.speaker === 'role' && message.roleId === 'grounder',
      ).length + 1;
      const roundRoleMessages = [
        ...messages.filter((message) => message.speaker === 'role'),
        grounderMessage,
      ];
      const draftSummary = {
        summary: buildChallengeDraftSummary(completedRoundCount, roundRoleMessages, conflicts?.length ?? 0),
        updatedAt: new Date().toISOString(),
      };

      const updated = await appendLiveRoleMessages(projectPath, id, [grounderMessage], {
        roleSet: CHALLENGE_ROLE_SET,
        draftSummary,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const interruptTransition = getInterruptTransition(conflicts);
      if (interruptTransition) {
        await transitionSessionPhase(
          projectPath,
          id,
          interruptTransition.phase,
          interruptTransition.requiredUserAction,
          interruptTransition.lastCompletedStep,
        );
      } else if (completedRoundCount >= CHALLENGE_MAX_ROUNDS) {
        await transitionSessionPhase(
          projectPath,
          id,
          'waiting_round_decision',
          `已达到质疑模式最大 ${CHALLENGE_MAX_ROUNDS} 轮，请改为切换模式或回看本轮结论。`,
          '已达到最大轮次',
          'decision',
        );
      } else {
        await transitionSessionPhase(
          projectPath,
          id,
          'waiting_round_decision',
          '本轮已完成。你可以进入下一轮追问，或切换到其他模式。',
          '本轮收束已完成',
          'decision',
        );
      }

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        conflicts,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    if (action === 'round_resolution') {
      await transitionSessionPhase(
        projectPath,
        id,
        'topic_submitted',
        '请输入下一轮要继续验证的追问、反例或修正；仍在当前会话里，不会新建会话。',
        '已初始化下一轮',
      );

      const finalState = await getLiveSession(projectPath, id);
      return res.status(200).json({
        session: buildSessionView(finalState!),
        modeState: finalState!.modeStates[finalState!.session.currentMode] ?? null,
        event: result.event,
        artifacts: await loadModeArtifacts(projectPath, id, 'challenge'),
      });
    }

    return res.status(400).json({ error: `Unknown challenge action: ${action}` });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Unknown error during challenge processing',
    });
  }


});

sessionsRouter.post('/:id/artifacts/finalize', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { projectPath = './prodmind-project', note } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const finalized = await finalizeRequirementArtifacts(projectPath, id, note);
  if ('error' in finalized) {
    return res.status(finalized.status ?? 500).json({ error: finalized.error });
  }

  await transitionSessionPhase(
    projectPath,
    id,
    'artifact_finalized',
    '你可以继续发起新的产物目标，或切换模式。',
    '已完成产物定稿',
  );

  const finalState = await getLiveSession(projectPath, id);

  return res.status(200).json({
    session: buildSessionView(finalState ?? finalized.updated),
    modeState: (finalState ?? finalized.updated).modeStates[(finalState ?? finalized.updated).session.currentMode] ?? null,
    artifacts: finalized.artifacts,
  });
});

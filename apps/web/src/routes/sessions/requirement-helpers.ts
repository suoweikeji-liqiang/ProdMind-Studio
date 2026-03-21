import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createAssetWriter,
  createProjectStore,
  createSessionStore,
} from '@prodmind/asset-engine';
import type {
  ArtifactVersion,
  ChallengeHandoff,
  ConversationSession,
  ModeMessage,
  ModeState,
  ProjectState,
} from '@prodmind/shared-types';
import type { LiveSessionState } from '../../state/session-store.js';
import {
  getLiveSession,
  replaceLiveModeState,
  transitionSessionPhase,
} from '../../state/session-store.js';
import {
  REQUIREMENT_ARTIFACT_LABELS,
  REQUIREMENT_ARTIFACT_TITLES,
  REQUIREMENT_ARTIFACT_TYPES,
  REQUIREMENT_ROLE_BY_ARTIFACT,
  REQUIREMENT_ROLE_SET,
  type RequirementAction,
  type RequirementArtifactType,
  type RequirementDraftArtifact,
} from './constants.js';
import { toAssistantContent, summarizeDraftContent } from './challenge-helpers.js';
import { buildSharedContextSections, toUniqueStrings } from './shared-context.js';

const sessionPersistence = createSessionStore();

export async function writeRequirementDraftArtifact(
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

export function buildRequirementProjectState(session: ConversationSession, modeState: ModeState, latestInput: string): ProjectState {
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

export function buildRequirementRoleMessages(
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

export function buildRequirementDraftSummary(drafts: Record<RequirementArtifactType, { updatedAt: string }>): string {
  const artifactLabels = REQUIREMENT_ARTIFACT_TYPES.map((artifactType) => REQUIREMENT_ARTIFACT_LABELS[artifactType]).join(' / ');
  return `需求共建模式已更新 ${REQUIREMENT_ARTIFACT_TYPES.length} 份草稿：${artifactLabels}。最近更新时间 ${drafts.spec.updatedAt}。`;
}

export function parseRequirementArtifactType(content: string): RequirementArtifactType | null {
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

export function resolveRequirementAction(rawAction: string | undefined, currentPhase: string): RequirementAction {
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

export function chooseNextRequirementArtifact(existingDraftArtifacts: string[]): RequirementArtifactType {
  for (const artifactType of REQUIREMENT_ARTIFACT_TYPES) {
    if (!existingDraftArtifacts.includes(artifactType)) {
      return artifactType;
    }
  }
  const currentArtifact = existingDraftArtifacts[existingDraftArtifacts.length - 1];
  return parseRequirementArtifactType(currentArtifact ?? '') ?? 'spec';
}

export function mergeRequirementDraftArtifacts(
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

export function buildRequirementGoalMessage(suggestedArtifact: RequirementArtifactType): ModeMessage {
  return {
    speaker: 'role',
    roleId: 'requirements',
    roleName: '需求师',
    content: `我已记录你的需求目标。建议先推进"${REQUIREMENT_ARTIFACT_LABELS[suggestedArtifact]}"这一层。请直接点击下方层级按钮，或回复想法 / 规格 / 验收 / 任务。`,
    timestamp: new Date().toISOString(),
  };
}

export function buildRequirementRoleMessage(
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

export function buildRequirementDraftSummaryByArtifact(
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

export function buildRequirementProjectStateFromChallengeHandoff(
  session: ConversationSession,
  handoff: ChallengeHandoff,
): ProjectState {
  const projectStore = createProjectStore();
  const baseState = projectStore.create(session.sessionId, session.topic);
  const sharedContextSections = buildSharedContextSections(session.sharedContext);
  const includeScope = handoff.mvpScope.include.length > 0 ? `MVP包含：${handoff.mvpScope.include.join(' | ')}` : '';
  const excludeScope = handoff.mvpScope.exclude.length > 0 ? `明确排除：${handoff.mvpScope.exclude.join(' | ')}` : '';

  return {
    ...baseState,
    updatedAt: new Date().toISOString(),
    clarityStage: 'structure',
    messages: [
      {
        role: 'assistant',
        content: [
          `问题定义：${handoff.problemFrame.oneSentenceProblem}`,
          `用户场景：${handoff.userConfirmedContext.scenario}`,
          `关键痛点：${handoff.userConfirmedContext.topPains.join(' | ')}`,
          `约束：${handoff.userConfirmedContext.constraints.join(' | ')}`,
          includeScope,
          excludeScope,
          handoff.nextValidationActions.length > 0 ? `下一步验证动作：${handoff.nextValidationActions.join(' | ')}` : '',
        ].filter(Boolean).join('\n'),
        timestamp: new Date().toISOString(),
      },
    ],
    projection: {
      context: [
        session.topic,
        `问题定义：${handoff.problemFrame.oneSentenceProblem}`,
        `用户场景：${handoff.userConfirmedContext.scenario}`,
        ...(session.sharedContext.confirmedFacts.length > 0
          ? [`已确认事实：${session.sharedContext.confirmedFacts.join(' | ')}`]
          : []),
        ...(session.sharedContext.sourceReferences.length > 0
          ? [`参考资料：${session.sharedContext.sourceReferences.join(' | ')}`]
          : []),
      ].join('\n'),
      actors: '需要把讨论沉淀成结构化需求资产的产品和研发团队',
      intent: `基于 challenge handoff 起草第一版规格草稿：${handoff.problemFrame.oneSentenceProblem}`,
      mechanism: '围绕已确认问题定义、用户场景、约束和 MVP 边界生成第一版需求草稿。',
      boundary: [
        '只沉淀已经被 challenge 收束过的结论，不把未决冲突伪装成既定事实。',
        ...handoff.userConfirmedContext.constraints.map((item) => `用户约束：${item}`),
        ...session.sharedContext.hardConstraints.map((item) => `硬约束：${item}`),
        includeScope,
        excludeScope,
      ].filter(Boolean).join('\n'),
    },
    lastCompression: {
      oneLiner: `${session.topic} 的规格草稿`,
      threeLiner: [
        `议题：${session.topic}`,
        `问题定义：${handoff.problemFrame.oneSentenceProblem}`,
        `MVP包含：${handoff.mvpScope.include.join('、') || '待补充'}`,
        `明确排除：${handoff.mvpScope.exclude.join('、') || '待补充'}`,
        ...(sharedContextSections.length > 0 ? [`共享底稿：${sharedContextSections.join('；')}`] : []),
      ].join('\n'),
      structured: JSON.stringify(
        {
          议题: session.topic,
          问题定义: handoff.problemFrame.oneSentenceProblem,
          用户场景: handoff.userConfirmedContext.scenario,
          关键痛点: handoff.userConfirmedContext.topPains,
          约束: handoff.userConfirmedContext.constraints,
          MVP边界: handoff.mvpScope,
          未决冲突: handoff.openConflicts,
          下一步验证动作: handoff.nextValidationActions,
        },
        null,
        2,
      ),
    },
    lastBusinessAssumptions: [
      `当前最强反设：${handoff.strongestCounterHypothesis}`,
      ...handoff.adoptionRisks.map((item) => `采用阻力：${item}`),
      ...handoff.nextValidationActions.map((item) => `验证动作：${item}`),
    ],
    lastGuardWarnings: [...handoff.openConflicts],
  };
}

export function buildRequirementHandoffDraftSummary(handoff: ChallengeHandoff, artifactType: RequirementArtifactType): string {
  return [
    `已承接质疑模式 handoff，并生成第一版${REQUIREMENT_ARTIFACT_LABELS[artifactType]}草稿。`,
    `问题定义：${handoff.problemFrame.oneSentenceProblem}`,
    `MVP包含：${handoff.mvpScope.include.join('、') || '待补充'}`,
    `明确排除：${handoff.mvpScope.exclude.join('、') || '待补充'}`,
  ].join('\n');
}

export async function seedRequirementModeFromChallengeHandoff(
  projectPath: string,
  sessionId: string,
  state: LiveSessionState,
): Promise<LiveSessionState | null> {
  const handoff = state.session.latestChallengeHandoff;
  const currentModeState = state.modeStates['requirement-build'] ?? {
    mode: 'requirement-build' as const,
    roleSet: [],
    messages: [],
    draftArtifacts: [],
    finalArtifacts: [],
  };

  if (!handoff || currentModeState.messages.length > 0 || currentModeState.draftArtifacts.length > 0) {
    return state;
  }

  const draftDir = path.join(projectPath, '.prodmind', 'sessions', sessionId, 'workspace', 'requirement-build', 'draft');
  const artifactType: RequirementArtifactType = 'spec';
  const draft = await writeRequirementDraftArtifact(
    draftDir,
    buildRequirementProjectStateFromChallengeHandoff(state.session, handoff),
    artifactType,
  );
  await sessionPersistence.saveDraftArtifact(projectPath, sessionId, 'requirement-build', artifactType, draft);

  const roleMessage = buildRequirementRoleMessage(artifactType, draft, 'selection');
  const updatedModeState: ModeState = {
    ...currentModeState,
    mode: 'requirement-build',
    roleSet: REQUIREMENT_ROLE_SET,
    messages: [...currentModeState.messages, roleMessage],
    draftSummary: {
      summary: buildRequirementHandoffDraftSummary(handoff, artifactType),
      updatedAt: new Date().toISOString(),
    },
    draftArtifacts: mergeRequirementDraftArtifacts(currentModeState.draftArtifacts, artifactType),
    finalArtifacts: currentModeState.finalArtifacts,
  };

  const updated = await replaceLiveModeState(projectPath, sessionId, updatedModeState);
  if (!updated) {
    return null;
  }

  await sessionPersistence.appendEvent(projectPath, {
    type: 'role_message',
    eventId: `${sessionId}-requirement-seed-${Date.now()}`,
    sessionId,
    mode: 'requirement-build',
    timestamp: roleMessage.timestamp,
    roleId: roleMessage.roleId ?? 'requirements',
    roleName: roleMessage.roleName ?? '需求师',
    content: roleMessage.content,
  });
  await sessionPersistence.appendEvent(projectPath, {
    type: 'draft_updated',
    eventId: `${sessionId}-requirement-seed-draft-${Date.now()}`,
    sessionId,
    mode: 'requirement-build',
    timestamp: new Date().toISOString(),
    summary: updatedModeState.draftSummary?.summary ?? '',
  });
  await transitionSessionPhase(
    projectPath,
    sessionId,
    'waiting_user_draft_revision',
    '请审阅基于质疑收束生成的规格草稿，决定是否继续修订。',
    '已承接 challenge handoff 并生成规格草稿',
  );

  return getLiveSession(projectPath, sessionId);
}

export async function finalizeRequirementArtifacts(projectPath: string, sessionId: string, note?: string) {
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

export async function loadModeArtifacts(projectPath: string, sessionId: string, mode: ModeState['mode']) {
  if (mode === 'decision') {
    return {
      drafts: await sessionPersistence.listDraftArtifacts(projectPath, sessionId, mode),
      finalized: {} as Record<string, ArtifactVersion[]>,
    };
  }

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

import type {
  ArtifactVersion,
  ConversationEvent,
  ConversationMode,
  ConversationSession,
  ModeState,
} from '@prodmind/shared-types';
import { loadModeArtifacts } from './requirement-helpers.js';
import { buildReplayPayload } from './session-view.js';

const EXPORT_MODE_LABELS: Record<ConversationMode, string> = {
  challenge: '质疑模式',
  decision: '裁决模式',
  'requirement-build': '需求共建模式',
};

const EXPORT_PHASE_LABELS: Record<string, string> = {
  topic_submitted: '等待输入本轮议题',
  architect_framing: '正在提炼问题定义',
  waiting_user_problem_correction: '等待你修正问题定义',
  objection_generation: '正在生成反方质疑',
  waiting_user_objection_response: '等待你回应质疑',
  grounding: '正在收束本轮结论',
  waiting_round_decision: '等待你决定是否继续本轮',
  waiting_alternative_hypothesis_resolution: '等待你处理替代假设',
  waiting_false_consensus_break: '等待你打破伪共识',
  waiting_tech_escape_response: '等待你回应技术逃逸',
  decision_prompt_submitted: '等待输入决策问题',
  decision_frame_generation: '正在生成决策框架',
  waiting_user_frame_confirmation: '等待你确认决策框架',
  tradeoff_analysis: '正在分析方案权衡',
  waiting_user_priority_adjustment: '等待你调整优先级',
  recommendation_synthesis: '正在生成推荐结论',
  waiting_decision_resolution: '等待你确认决策结论',
  artifact_goal_submitted: '等待输入产物目标',
  artifact_scope_detection: '正在判断产物层级',
  waiting_user_artifact_selection: '等待你选择产物层级',
  draft_generation: '正在生成草稿',
  waiting_user_draft_revision: '等待你修订草稿',
  ready_for_downstream_or_finalize: '可以继续细化或定稿',
  artifact_finalized: '已完成定稿',
};

function formatExportModeLabel(mode: ConversationMode): string {
  return EXPORT_MODE_LABELS[mode] ?? mode;
}

function formatExportPhaseLabel(phase: string): string {
  return EXPORT_PHASE_LABELS[phase] ?? phase;
}

function formatExportTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function pushMarkdownList(lines: string[], title: string, items: string[]) {
  if (items.length === 0) {
    return;
  }

  lines.push(`### ${title}`, '');
  lines.push(...items.map((item) => `- ${item}`));
  lines.push('');
}

function stringifyMarkdownValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object' && 'content' in value && typeof value.content === 'string') {
    return value.content.trim();
  }

  return `\`\`\`json\n${JSON.stringify(value ?? null, null, 2)}\n\`\`\``;
}

function pushMarkdownBlock(lines: string[], content: string) {
  const normalized = content.trim();
  if (!normalized) {
    lines.push('_空_', '');
    return;
  }

  lines.push(normalized, '');
}

function buildModeSummaryLines(
  mode: ConversationMode,
  modeState: ModeState | undefined,
  modeArtifacts: Awaited<ReturnType<typeof loadModeArtifacts>> | undefined,
): string[] {
  if (!modeState) {
    return [];
  }

  const hasDrafts = Object.keys(modeArtifacts?.drafts ?? {}).length > 0;
  const hasFinalized = Object.values(modeArtifacts?.finalized ?? {}).some(
    (versions) => Array.isArray(versions) && versions.length > 0,
  );
  const hasMessages = modeState.messages.length > 0;
  const hasSummary = Boolean(modeState.draftSummary?.summary?.trim());

  if (!hasDrafts && !hasFinalized && !hasMessages && !hasSummary) {
    return [];
  }

  const lines = [`### ${formatExportModeLabel(mode)}`, ''];

  if (hasSummary && modeState.draftSummary) {
    lines.push(modeState.draftSummary.summary.trim(), '');
  }

  lines.push(`- 累计消息：${modeState.messages.length}`);
  if (modeState.draftArtifacts.length > 0) {
    lines.push(`- 草稿产物：${modeState.draftArtifacts.join('、')}`);
  }
  if (modeState.finalArtifacts.length > 0) {
    lines.push(`- 已定稿：${modeState.finalArtifacts.join('、')}`);
  }
  lines.push('');

  const draftEntries = Object.entries(modeArtifacts?.drafts ?? {});
  if (draftEntries.length > 0) {
    lines.push('#### 草稿内容', '');
    for (const [artifactType, artifact] of draftEntries) {
      lines.push(`##### ${artifactType}`, '');
      pushMarkdownBlock(lines, stringifyMarkdownValue(artifact));
    }
  }

  const finalizedEntries = Object.entries(modeArtifacts?.finalized ?? {}).filter(
    ([, versions]) => Array.isArray(versions) && versions.length > 0,
  );
  if (finalizedEntries.length > 0) {
    lines.push('#### 已定稿版本', '');
    for (const [artifactType, versions] of finalizedEntries) {
      for (const version of versions as ArtifactVersion[]) {
        lines.push(`##### ${artifactType} v${version.version}`, '');
        if (version.note) {
          lines.push(`- 备注：${version.note}`, '');
        }
        pushMarkdownBlock(lines, stringifyMarkdownValue(version.content));
      }
    }
  }

  return lines;
}

function buildEventMarkdownLines(event: ConversationEvent): string[] {
  const prefix = `### ${formatExportTimestamp(event.timestamp)} · ${formatExportModeLabel(event.mode)}`;

  if (event.type === 'user_message') {
    return [prefix, '', '**用户**', '', event.content.trim(), ''];
  }

  if (event.type === 'role_message') {
    return [prefix, '', `**${event.roleName || event.roleId}**`, '', event.content.trim(), ''];
  }

  if (event.type === 'mode_switched') {
    return [
      prefix,
      '',
      `- 模式切换：${formatExportModeLabel(event.fromMode)} -> ${formatExportModeLabel(event.toMode)}`,
      '',
    ];
  }

  if (event.type === 'phase_transition') {
    return [
      prefix,
      '',
      `- 阶段推进：${formatExportPhaseLabel(event.fromPhase)} -> ${formatExportPhaseLabel(event.toPhase)}`,
      `- 下一步：${event.requiredUserAction}`,
      '',
    ];
  }

  if (event.type === 'shared_context_updated') {
    const lines = [prefix, '', '**共享上下文更新**', ''];
    if (event.confirmedFacts.length > 0) {
      lines.push(...event.confirmedFacts.map((item) => `- 事实：${item}`));
    }
    if (event.hardConstraints.length > 0) {
      lines.push(...event.hardConstraints.map((item) => `- 约束：${item}`));
    }
    if (event.sourceReferences.length > 0) {
      lines.push(...event.sourceReferences.map((item) => `- 参考：${item}`));
    }
    lines.push('');
    return lines;
  }

  if (event.type === 'draft_updated') {
    return [prefix, '', `- 草稿更新：${event.summary}`, ''];
  }

  return [
    prefix,
    '',
    `- 已定稿：${event.artifactType} v${event.version}`,
    '',
  ];
}

function buildExportFilename(session: ConversationSession): string {
  const normalized = session.topic
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);

  return `${normalized || `session-${session.sessionId}`}.md`;
}

export async function buildSessionMarkdownExport(projectPath: string, sessionId: string) {
  const replay = await buildReplayPayload(projectPath, sessionId);
  if (!replay) {
    return null;
  }

  if (replay.source === 'legacy-workflow') {
    const content = [
      `# 会话导出 ${sessionId}`,
      '',
      '## 说明',
      '',
      '这是旧工作流记录的导出，当前先保留原始结果快照。',
      '',
      '```json',
      JSON.stringify(replay.legacy, null, 2),
      '```',
      '',
    ].join('\n');

    return {
      filename: `session-${sessionId}.md`,
      content,
    };
  }

  const { session, modeStates, artifacts, events } = replay;
  const lines: string[] = [
    `# ${session.topic}`,
    '',
    '## 会话信息',
    '',
    `- 会话编号：${session.sessionId}`,
    `- 当前模式：${formatExportModeLabel(session.currentMode)}`,
    `- 当前阶段：${formatExportPhaseLabel(session.currentPhase)}`,
    `- 当前状态：${session.status}`,
    `- 交互状态：${session.interactionState}`,
    `- 最近活跃：${formatExportTimestamp(session.lastActiveAt)}`,
    `- 导出时间：${formatExportTimestamp(new Date().toISOString())}`,
    '',
  ];

  if (session.requiredUserAction) {
    lines.push('### 当前下一步', '', `- ${session.requiredUserAction}`, '');
  }

  pushMarkdownList(lines, '已确认事实', session.sharedContext.confirmedFacts);
  pushMarkdownList(lines, '硬约束', session.sharedContext.hardConstraints);
  pushMarkdownList(lines, '参考资料', session.sharedContext.sourceReferences);

  const modeSummaryLines = (['challenge', 'decision', 'requirement-build'] as const).flatMap((mode) => (
    buildModeSummaryLines(mode, modeStates[mode], artifacts[mode])
  ));
  if (modeSummaryLines.length > 0) {
    lines.push('## 模式摘要', '', ...modeSummaryLines);
  }

  lines.push('## 完整时间线', '');
  if (events.length === 0) {
    lines.push(`- 当前还没有会话事件，系统正处于「${formatExportPhaseLabel(session.currentPhase)}」。`, '');
  } else {
    const sortedEvents = [...events].sort((left, right) => (
      left.timestamp.localeCompare(right.timestamp) || left.eventId.localeCompare(right.eventId)
    ));
    for (const event of sortedEvents) {
      lines.push(...buildEventMarkdownLines(event));
    }
  }

  return {
    filename: buildExportFilename(session),
    content: `${lines.join('\n').trim()}\n`,
  };
}

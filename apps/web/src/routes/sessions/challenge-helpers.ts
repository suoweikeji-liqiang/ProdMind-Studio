import { detectAlternativeHypothesis } from '@prodmind/challenge-engine';
import type {
  ChallengeConflict,
  ChallengeHandoff,
  ConversationSession,
  ModeMessage,
  SharedContext,
} from '@prodmind/shared-types';
import type { LiveSessionState } from '../../state/session-store.js';
import {
  CHALLENGE_INTERRUPT_FOCUS_ACTIONS,
  CHALLENGE_INTERRUPT_PHASES,
  CHALLENGE_MAX_ROUNDS,
  CHALLENGE_MIN_RESPONSE_LENGTH,
  CHALLENGE_OBJECTION_RESPONSE_FOCUS_ACTIONS,
  type ChallengeAction,
  type ParsedProblemCorrection,
} from './constants.js';
import { splitInlineList, toUniqueStrings } from './shared-context.js';

export function buildChallengeRoleMessages(round: { architect: string; assassin: string; userGhost: string; grounder: string }): ModeMessage[] {
  const timestamp = new Date().toISOString();

  return [
    { speaker: 'role', roleId: 'architect', roleName: '架构师', content: round.architect, timestamp },
    { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: round.assassin, timestamp },
    { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: round.userGhost, timestamp },
    { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: round.grounder, timestamp },
  ];
}

export function buildChallengeDraftSummary(roundNumber: number, roleMessages: ModeMessage[], conflictCount: number): string {
  return `第 ${roundNumber} 轮 challenge 已完成，记录了 ${roleMessages.length} 个角色发言，当前发现 ${conflictCount} 个冲突信号。`;
}

export function toAssistantContent(message: ModeMessage): string {
  if (message.roleName) {
    return `${message.roleName}: ${message.content}`;
  }

  return message.content;
}

export function summarizeDraftContent(content: string, fallbackLabel: string): string {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.length > 0 ? lines.join('\n') : fallbackLabel;
}

export function extractMarkdownSection(content: string, headingMatchers: RegExp[]): string {
  const lines = content.replaceAll('\r', '').split('\n');
  const collected: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s*(.+)$/);
    if (headingMatch) {
      if (collecting) {
        break;
      }
      const heading = headingMatch[1]?.trim() ?? '';
      collecting = headingMatchers.some((matcher) => matcher.test(heading));
      continue;
    }

    if (collecting) {
      collected.push(line);
    }
  }

  return collected.join('\n').trim();
}

export function extractSectionList(content: string): string[] {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines
    .filter((line) => /^([-*]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+\.)\s+/, '').trim());

  if (bulletLines.length > 0) {
    return toUniqueStrings(bulletLines);
  }

  return toUniqueStrings(
    lines.flatMap((line) => {
      const keyValueMatch = line.match(/^[^:：]+[:：]\s*(.+)$/);
      if (keyValueMatch?.[1]) {
        return splitInlineList(keyValueMatch[1]);
      }
      return splitInlineList(line);
    }),
  );
}

export function extractSectionSummary(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .find(Boolean) ?? '';
}

export function parseMvpScope(content: string): ChallengeHandoff['mvpScope'] {
  const include: string[] = [];
  const exclude: string[] = [];
  const oneWeekScope: string[] = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const cleaned = line.replace(/^[-*]\s+/, '').trim();
    const keyValueMatch = cleaned.match(/^(包含|保留|include|includes|排除|不做|exclude|excludes|一周内验证|一周范围|one-week scope|next week)\s*[:：]\s*(.+)$/iu);
    if (keyValueMatch) {
      const key = (keyValueMatch[1] ?? '').toLowerCase();
      const value = keyValueMatch[2] ?? '';
      if (key.includes('排除') || key.includes('不做') || key.startsWith('exclude')) {
        exclude.push(...splitInlineList(value));
      } else if (key.includes('一周') || key.includes('week')) {
        oneWeekScope.push(...splitInlineList(value));
      } else {
        include.push(...splitInlineList(value));
      }
      continue;
    }

    include.push(cleaned);
  }

  return {
    include: toUniqueStrings(include),
    exclude: toUniqueStrings(exclude),
    oneWeekScope: toUniqueStrings(oneWeekScope),
  };
}

export function extractGrounderValidationAction(grounder: string): string | null {
  const match = grounder.match(/最小动作[:：]\s*(.+)$/imu);
  return match?.[1]?.trim() || null;
}

export function formatConflictLabel(conflict: ChallengeConflict): string | null {
  if (!conflict.detected) {
    return null;
  }

  if (conflict.details) {
    return conflict.details;
  }

  if (conflict.type === 'alternative_hypothesis') {
    return '仍存在更强的替代假设未被正面处理';
  }
  if (conflict.type === 'consensus_alert') {
    return '当前共识可能只是表面一致，关键前提仍未站稳';
  }
  if (conflict.type === 'tech_escape') {
    return '用户回应仍在回避真实业务问题与执行约束';
  }
  if (conflict.type === 'falsification_missing') {
    return '本轮缺少完整的证伪检查';
  }

  return null;
}

function buildMessageTraceId(roleId: string, message: ModeMessage | undefined): string | undefined {
  if (!message) {
    return undefined;
  }

  return `${roleId}:${message.timestamp}`;
}

export function parseProblemCorrection(content: string, sharedContext: SharedContext): ParsedProblemCorrection {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let oneSentenceProblem = '';
  let scenario = '';
  const topPains: string[] = [];
  const constraints: string[] = [];
  let currentSection: 'topPains' | 'constraints' | null = null;

  for (const line of lines) {
    const keyValueMatch = line.match(/^(问题定义|核心问题|问题|problem|framing|场景\/行业|场景|行业|适用场景|业务场景|使用场景|scenario|痛点\d*|核心痛点|痛点|pain(?:s)?|约束\d*|限制条件|限制|硬约束|constraint(?:s)?)\s*[:：]\s*(.+)$/iu);
    if (keyValueMatch) {
      const rawKey = (keyValueMatch[1] ?? '').toLowerCase();
      const value = (keyValueMatch[2] ?? '').trim();
      if (!value) {
        continue;
      }

      if (rawKey.includes('问题') || rawKey === 'problem' || rawKey === 'framing') {
        oneSentenceProblem = value;
        currentSection = null;
        continue;
      }

      if (rawKey.includes('场景') || rawKey.includes('行业') || rawKey === 'scenario') {
        scenario = value;
        currentSection = null;
        continue;
      }

      if (rawKey.includes('痛点') || rawKey.startsWith('pain')) {
        topPains.push(...splitInlineList(value));
        currentSection = 'topPains';
        continue;
      }

      constraints.push(...splitInlineList(value));
      currentSection = 'constraints';
      continue;
    }

    const sectionHeadingMatch = line.match(/^(核心痛点|痛点|pain(?:s)?|约束|限制条件|限制|硬约束|constraint(?:s)?)\s*[:：]\s*$/iu);
    if (sectionHeadingMatch) {
      const rawKey = (sectionHeadingMatch[1] ?? '').toLowerCase();
      currentSection = rawKey.includes('痛点') || rawKey.startsWith('pain') ? 'topPains' : 'constraints';
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const value = bulletMatch[1]?.trim() ?? '';
      if (!value) {
        continue;
      }

      if (currentSection === 'topPains') {
        topPains.push(value);
      } else if (currentSection === 'constraints') {
        constraints.push(value);
      }
      continue;
    }

    if (!oneSentenceProblem && line.length >= 12) {
      oneSentenceProblem = line;
      if (!scenario && /(团队|公司|场景|行业|用户|运营|研发|销售|内部|workflow|product)/iu.test(line)) {
        scenario = line;
      }
      continue;
    }

    if (!scenario && /(团队|场景|行业|用户|运营|研发|销售|内部|workflow|product)/iu.test(line)) {
      scenario = line;
    }
  }

  return {
    oneSentenceProblem: oneSentenceProblem.trim(),
    scenario: scenario.trim(),
    topPains: toUniqueStrings(topPains).slice(0, 5),
    constraints: toUniqueStrings([...constraints, ...sharedContext.hardConstraints]),
  };
}

export function listMissingProblemCorrectionFields(parsed: ParsedProblemCorrection): string[] {
  const missing: string[] = [];

  if (parsed.oneSentenceProblem.length < 12) {
    missing.push('问题定义');
  }
  if (parsed.scenario.length < 6) {
    missing.push('场景/行业');
  }
  if (parsed.topPains.length < 3) {
    missing.push('至少 3 条核心痛点');
  }
  if (parsed.constraints.length < 1) {
    missing.push('至少 1 条约束');
  }

  return missing;
}

export function buildProblemCorrectionAssistSuggestion(
  state: LiveSessionState,
  content: string,
): {
  suggestion: {
    problemDefinition: string;
    scenario: string;
    topPains: string[];
    constraints: string[];
    notes: string;
  };
  reminders: string[];
} {
  const parsed = parseProblemCorrection(content, state.session.sharedContext);
  const missing = listMissingProblemCorrectionFields(parsed);
  const challengeMessages = state.modeStates.challenge?.messages ?? [];
  const architectMessage = [...challengeMessages]
    .reverse()
    .find((message) => message.speaker === 'role' && message.roleId === 'architect');
  const architectProblem = architectMessage
    ? extractSectionSummary(extractMarkdownSection(architectMessage.content, [/核心问题/i, /问题定义/i, /problem/i]))
    : '';

  const reminders = missing.map((item) => {
    if (item === '问题定义') {
      return '把真正被卡住的问题改写成一句话，避免只写"做一个系统/平台/工具"。';
    }
    if (item === '场景/行业') {
      return '补一句"谁在什么场景里被这个问题卡住"，例如团队类型、行业和协作环境。';
    }
    if (item === '至少 3 条核心痛点') {
      return '至少补满 3 条痛点，每条都尽量写成"现状 -> 损失"。';
    }
    if (item === '至少 1 条约束') {
      return '至少补 1 条不能回避的约束，例如时间、资源、组织或维护限制。';
    }
    return `还缺内容：${item}`;
  });

  const problemDefinition = parsed.oneSentenceProblem || architectProblem || state.session.topic;
  const scenario = parsed.scenario;
  const topPains = parsed.topPains.slice(0, 5);
  const constraints = parsed.constraints.slice(0, 5);

  if (problemDefinition.includes('系统') || problemDefinition.includes('平台') || problemDefinition.includes('工具')) {
    reminders.unshift('问题定义里仍然带了方案味，优先改写成"为什么当前协作会卡住"。');
  }

  return {
    suggestion: {
      problemDefinition,
      scenario,
      topPains,
      constraints,
      notes: '',
    },
    reminders: toUniqueStrings(reminders),
  };
}

export function buildChallengeHandoff(
  session: ConversationSession,
  messages: ModeMessage[],
  conflicts: ChallengeConflict[] | undefined,
  roundIndex: number,
): ChallengeHandoff {
  const architectMessage = [...messages].reverse().find((message) => message.speaker === 'role' && message.roleId === 'architect');
  const assassinMessage = [...messages].reverse().find((message) => message.speaker === 'role' && message.roleId === 'assassin');
  const userGhostMessage = [...messages].reverse().find((message) => message.speaker === 'role' && message.roleId === 'userGhost');
  const grounderMessage = [...messages].reverse().find((message) => message.speaker === 'role' && message.roleId === 'grounder');
  const userMessages = messages.filter((message) => message.speaker === 'user');
  const userResponseMessage = userMessages.at(-1);
  const userConfirmMessage = userMessages.length >= 2 ? userMessages.at(-2) : userMessages.at(-1);

  const parsedCorrection = parseProblemCorrection(userConfirmMessage?.content ?? '', session.sharedContext);
  const architectProblem = architectMessage
    ? extractSectionSummary(extractMarkdownSection(architectMessage.content, [/核心问题/i, /problem/i]))
    : '';
  const strongestCounterHypothesis = assassinMessage
    ? (
      detectAlternativeHypothesis(assassinMessage.content, 'assassin')?.content
      || extractSectionSummary(extractMarkdownSection(assassinMessage.content, [/更强替代假设/i, /隐含假设/i, /反对理由/i]))
      || extractSectionSummary(assassinMessage.content)
    )
    : '';
  const adoptionRiskSection = userGhostMessage
    ? (
      extractMarkdownSection(userGhostMessage.content, [/采用阻力/i, /用户质疑/i, /替代方案/i])
      || userGhostMessage.content
    )
    : '';
  const mvpScopeSection = grounderMessage
    ? extractMarkdownSection(grounderMessage.content, [/MVP/i, /边界/i])
    : '';
  const openConflictSection = grounderMessage
    ? extractMarkdownSection(grounderMessage.content, [/未决冲突/i, /冲突/i])
    : '';
  const nextValidationSection = grounderMessage
    ? extractMarkdownSection(grounderMessage.content, [/下一步验证动作/i, /验证动作/i])
    : '';

  const adoptionRisks = extractSectionList(adoptionRiskSection).slice(0, 3);
  const openConflicts = toUniqueStrings([
    ...extractSectionList(openConflictSection).filter((item) => !/^(没有|暂无|none|无)$/i.test(item.trim())),
    ...((conflicts ?? []).map(formatConflictLabel).filter((item): item is string => Boolean(item))),
  ]);
  const fallbackAction = extractGrounderValidationAction(grounderMessage?.content ?? '');
  const nextValidationActions = toUniqueStrings([
    ...extractSectionList(nextValidationSection),
    ...(fallbackAction ? [fallbackAction] : []),
  ]);
  const mvpScope = parseMvpScope(mvpScopeSection);
  const problemFrame = {
    oneSentenceProblem: parsedCorrection.oneSentenceProblem || architectProblem || session.topic,
    boundaries: toUniqueStrings([...parsedCorrection.constraints, ...session.sharedContext.hardConstraints]).slice(0, 5),
    keyVariables: toUniqueStrings(parsedCorrection.topPains).slice(0, 5),
  };
  const userConfirmedContext = {
    scenario: parsedCorrection.scenario,
    topPains: parsedCorrection.topPains,
    constraints: parsedCorrection.constraints,
  };
  const matureEnoughForDecision = Boolean(
    problemFrame.oneSentenceProblem &&
    userConfirmedContext.scenario &&
    userConfirmedContext.topPains.length >= 3 &&
    userConfirmedContext.constraints.length >= 1 &&
    strongestCounterHypothesis &&
    adoptionRisks.length >= 1 &&
    nextValidationActions.length >= 1
  );
  const matureEnoughForRequirementBuild = Boolean(
    matureEnoughForDecision &&
    mvpScope.include.length >= 1 &&
    mvpScope.exclude.length >= 1 &&
    openConflicts.length === 0
  );

  return {
    roundIndex,
    topic: session.topic,
    problemFrame,
    userConfirmedContext,
    strongestCounterHypothesis,
    adoptionRisks,
    mvpScope,
    openConflicts,
    nextValidationActions,
    evidenceTrace: {
      architectMessageId: buildMessageTraceId('architect', architectMessage),
      assassinMessageId: buildMessageTraceId('assassin', assassinMessage),
      userGhostMessageId: buildMessageTraceId('userGhost', userGhostMessage),
      userResponseMessageId: buildMessageTraceId('user', userResponseMessage),
      grounderMessageId: buildMessageTraceId('grounder', grounderMessage),
    },
    roundStatus: {
      matureEnoughForDecision,
      matureEnoughForRequirementBuild,
    },
  };
}

export function isChallengeInterruptPhase(currentPhase: string): currentPhase is (typeof CHALLENGE_INTERRUPT_PHASES)[number] {
  return CHALLENGE_INTERRUPT_PHASES.includes(currentPhase as (typeof CHALLENGE_INTERRUPT_PHASES)[number]);
}

export function countCompletedChallengeRounds(messages: ModeMessage[]): number {
  return messages.filter((message) => message.speaker === 'role' && message.roleId === 'grounder').length;
}

export function validateChallengeTurnInput(
  state: LiveSessionState,
  action: ChallengeAction,
  content: string,
  focusAction: string | undefined,
): { status: number; error: string } | null {
  const trimmed = content.trim();
  const phase = state.session.currentPhase;
  const messages = state.modeStates.challenge?.messages ?? [];

  if (action === 'problem_correction') {
    const parsed = parseProblemCorrection(trimmed, state.session.sharedContext);
    const missing = listMissingProblemCorrectionFields(parsed);
    if (missing.length > 0) {
      return {
        status: 400,
        error: `当前这一步必须明确补齐这些内容：${missing.join('、')}。`,
      };
    }
  }

  if (action === 'objection_response') {
    if (trimmed.length < CHALLENGE_MIN_RESPONSE_LENGTH) {
      return {
        status: 400,
        error: `当前阶段的回应至少 ${CHALLENGE_MIN_RESPONSE_LENGTH} 字，避免一句话跳过关键质疑。`,
      };
    }

    if (phase === 'waiting_user_objection_response') {
      const selectedAction = focusAction?.trim();
      if (!selectedAction) {
        return {
          status: 400,
          error: '当前这一步必须先选择一种回应路径，再提交回应。',
        };
      }

      if (!CHALLENGE_OBJECTION_RESPONSE_FOCUS_ACTIONS.includes(selectedAction as (typeof CHALLENGE_OBJECTION_RESPONSE_FOCUS_ACTIONS)[number])) {
        return {
          status: 400,
          error: '当前回应路径无效，请在"直接反驳 / 承认部分成立 / 给一个反例"中选择。',
        };
      }
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

export function resolveChallengeAction(rawAction: string | undefined, currentPhase: string): ChallengeAction {
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

export function getInterruptTransition(conflicts: ChallengeConflict[] | undefined): {
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
      requiredUserAction: '请正面回应这些质疑，不要把讨论逃到"技术自然会解决"上。',
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

export function validateChallengeDownstreamSwitch(
  session: ConversationSession,
  targetMode: 'challenge' | 'decision' | 'requirement-build',
): string | null {
  const handoff = session.latestChallengeHandoff;
  if (!handoff || session.currentMode !== 'challenge') {
    return null;
  }
  if (targetMode === 'decision' && !handoff.roundStatus.matureEnoughForDecision) {
    return '当前 challenge handoff 还不完整，至少补齐问题定义、用户确认、最强反设和下一步验证动作后，再进入裁决模式。';
  }
  if (targetMode === 'requirement-build' && !handoff.roundStatus.matureEnoughForRequirementBuild) {
    if (handoff.openConflicts.length > 0) {
      return `当前 challenge handoff 仍有未决冲突：${handoff.openConflicts.join('；')}`;
    }
    return '当前 challenge handoff 还缺完整的 MVP 边界或排除项，暂时不要直接进入需求共建模式。';
  }
  return null;
}

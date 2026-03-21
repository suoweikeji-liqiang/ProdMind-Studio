import type { ChallengeHandoff, ModeMessage, SharedContext } from '@prodmind/shared-types';

export interface ChallengeWorkbenchItem {
  roleId: string;
  roleName: string;
  heading: string;
  content: string;
  timestamp: string;
}

export interface ChallengeWorkbenchContext {
  title: string;
  summary: string;
  items: ChallengeWorkbenchItem[];
}

export interface ChallengeWorkbenchHistoryGroup {
  label: string;
  summary: string;
  items: ChallengeWorkbenchItem[];
}

export interface ChallengeWorkbenchFocusAction {
  kind: string;
  label: string;
  template: string;
  inputLabel: string;
  placeholder: string;
}

export interface ChallengeWorkbenchFocusCard {
  title: string;
  reason: string;
  inputLabel: string;
  inputPlaceholder: string;
  actions: ChallengeWorkbenchFocusAction[];
}

export interface ChallengeWorkbenchChecklistItem {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
}

export interface ChallengeWorkbenchStep {
  current: number;
  total: number;
  label: string;
}

export interface ChallengeWorkbenchHandoffReadiness {
  available: boolean;
  decisionReady: boolean;
  requirementBuildReady: boolean;
  summary: string;
  openConflicts: string[];
  nextValidationActions: string[];
}

export interface ChallengeWorkbenchModeSwitchGate {
  enabled: boolean;
  reason: string;
}

export interface ChallengeWorkbenchTopicBrief {
  topic: string;
  currentFraming: string;
  latestUserPosition: string;
  confirmedFacts: string[];
  hardConstraints: string[];
  sourceReferences: string[];
  keyConflicts: string[];
}

export interface ChallengeWorkbenchFormField {
  label: string;
  placeholder: string;
}

export interface ChallengeWorkbenchFormListField extends ChallengeWorkbenchFormField {
  minItems: number;
}

export interface ChallengeWorkbenchProblemCorrectionForm {
  problemDefinition: ChallengeWorkbenchFormField;
  scenario: ChallengeWorkbenchFormField;
  topPains: ChallengeWorkbenchFormListField;
  constraints: ChallengeWorkbenchFormListField;
  notes: ChallengeWorkbenchFormField;
}

export interface ChallengeWorkbenchModel {
  layoutMode: 'topic-intake' | 'standard';
  step: ChallengeWorkbenchStep;
  currentRound: ChallengeWorkbenchContext;
  currentContext: ChallengeWorkbenchContext;
  historyGroups: ChallengeWorkbenchHistoryGroup[];
  focusCard: ChallengeWorkbenchFocusCard;
  checklist: ChallengeWorkbenchChecklistItem[];
  handoffReadiness: ChallengeWorkbenchHandoffReadiness;
  modeSwitchState: {
    decision: ChallengeWorkbenchModeSwitchGate;
    'requirement-build': ChallengeWorkbenchModeSwitchGate;
  };
  topicBrief: ChallengeWorkbenchTopicBrief;
  quickActions: ChallengeWorkbenchFocusAction[];
  problemCorrectionForm?: ChallengeWorkbenchProblemCorrectionForm;
}

interface ChallengeWorkbenchInput {
  topic?: string;
  currentPhase: string;
  requiredUserAction?: string;
  latestChallengeHandoff?: ChallengeHandoff;
  sharedContext?: SharedContext;
  modeState?: {
    messages?: ModeMessage[];
  };
}

const CHALLENGE_ROLE_LABELS: Record<string, string> = {
  architect: '架构师',
  assassin: '刺客',
  userGhost: '用户幽灵',
  grounder: '锚点官',
};

const PHASES_USING_LAST_CLOSED_ROUND = new Set([
  'waiting_round_decision',
  'waiting_alternative_hypothesis_resolution',
  'waiting_false_consensus_break',
  'waiting_tech_escape_response',
]);

const CHALLENGE_MAX_ROUNDS = 5;
const CHALLENGE_TOTAL_STEPS = 6;

function isChallengeRoleMessage(message: ModeMessage): boolean {
  const roleId = message.roleId;
  return message.speaker === 'role' && typeof roleId === 'string' && roleId in CHALLENGE_ROLE_LABELS;
}

function toWorkbenchItem(message: ModeMessage): ChallengeWorkbenchItem {
  const roleId = message.roleId ?? 'unknown';
  const roleName = message.roleName || CHALLENGE_ROLE_LABELS[roleId] || roleId;

  return {
    roleId,
    roleName,
    heading: roleName,
    content: message.content,
    timestamp: message.timestamp,
  };
}

function buildRounds(messages: ModeMessage[]): ChallengeWorkbenchItem[][] {
  const rounds: ChallengeWorkbenchItem[][] = [];
  let currentRound: ChallengeWorkbenchItem[] = [];

  for (const message of messages) {
    if (!isChallengeRoleMessage(message)) {
      continue;
    }

    const item = toWorkbenchItem(message);
    const currentRoundClosed = currentRound.some((roundItem) => roundItem.roleId === 'grounder');
    const currentRoundHasArchitect = currentRound.some((roundItem) => roundItem.roleId === 'architect');

    if (item.roleId === 'architect' && currentRound.length > 0 && (currentRoundClosed || currentRoundHasArchitect)) {
      rounds.push(currentRound);
      currentRound = [];
    }

    currentRound.push(item);
  }

  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return rounds;
}

function summarizeText(value: string, maxLength = 96): string {
  const normalized = value
    .replaceAll(/\r/g, '')
    .split('\n')
    .map((line) => line.replaceAll(/^#+\s*/g, '').replaceAll(/^\-\s*/g, '').trim())
    .find(Boolean) ?? '';

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength - 1) + '…';
}

function summarizeRound(items: ChallengeWorkbenchItem[]): string {
  return items
    .map((item) => `${item.heading}：${summarizeText(item.content)}`)
    .join('\n');
}

function buildHistoryGroups(rounds: ChallengeWorkbenchItem[][], currentRoundIndex: number): ChallengeWorkbenchHistoryGroup[] {
  return rounds
    .filter((_round, index) => index !== currentRoundIndex)
    .map((round, index) => ({
      label: `第 ${index + 1} 轮`,
      summary: summarizeRound(round),
      items: round,
    }));
}

function hasExistingChallengeRounds(rounds: ChallengeWorkbenchItem[][]): boolean {
  return rounds.some((round) => round.length > 0);
}

function countCompletedRounds(rounds: ChallengeWorkbenchItem[][]): number {
  return rounds.filter((round) => round.some((item) => item.roleId === 'grounder')).length;
}

function latestMessageBySpeaker(messages: ModeMessage[], speaker: 'user' | 'role', roleId?: string): ModeMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.speaker !== speaker) {
      continue;
    }
    if (!roleId || message.roleId === roleId) {
      return message;
    }
  }

  return null;
}

function buildTopicBrief(
  topic: string | undefined,
  messages: ModeMessage[],
  currentItems: ChallengeWorkbenchItem[],
  sharedContext: SharedContext,
): ChallengeWorkbenchTopicBrief {
  const latestArchitectMessage = currentItems.find((item) => item.roleId === 'architect')
    ?? (latestMessageBySpeaker(messages, 'role', 'architect') ? toWorkbenchItem(latestMessageBySpeaker(messages, 'role', 'architect')!) : null);
  const latestUserMessage = latestMessageBySpeaker(messages, 'user');
  const keyConflicts = currentItems
    .filter((item) => item.roleId === 'assassin' || item.roleId === 'userGhost' || item.roleId === 'grounder')
    .map((item) => `${item.roleName}：${summarizeText(item.content, 88)}`)
    .slice(0, 3);

  return {
    topic: topic || '当前议题尚未命名',
    currentFraming: latestArchitectMessage ? summarizeText(latestArchitectMessage.content, 140) : '架构师问题定义还没生成。',
    latestUserPosition: latestUserMessage ? summarizeText(latestUserMessage.content, 140) : '你还没有在当前会话中补充最新立场。',
    confirmedFacts: sharedContext.confirmedFacts ?? [],
    hardConstraints: sharedContext.hardConstraints ?? [],
    sourceReferences: sharedContext.sourceReferences ?? [],
    keyConflicts,
  };
}

function createFocusAction(
  kind: string,
  label: string,
  template: string,
  inputLabel: string,
  placeholder: string,
): ChallengeWorkbenchFocusAction {
  return {
    kind,
    label,
    template,
    inputLabel,
    placeholder,
  };
}

function buildFocusCard(
  currentPhase: string,
  requiredUserAction: string | undefined,
  currentItems: ChallengeWorkbenchItem[],
  hasExistingRounds = false,
  completedRoundCount = 0,
): ChallengeWorkbenchFocusCard {
  const architectSummary = currentItems.find((item) => item.roleId === 'architect');
  const objections = currentItems.filter((item) => item.roleId === 'assassin' || item.roleId === 'userGhost');
  const objectionReason = objections.length > 0
    ? objections.map((item) => `${item.roleName}指出：${summarizeText(item.content, 54)}`).join('；')
    : '当前轮已经进入需要你明确回应的位置。';

  if (currentPhase === 'waiting_user_problem_correction') {
    const inputLabel = requiredUserAction || '请确认或修正问题定义。';
    return {
      title: '修正问题定义',
      reason: architectSummary
        ? `架构师刚刚给出一版 framing：${summarizeText(architectSummary.content, 72)}`
        : '系统已经提炼了一版问题定义，现在需要你确认它是否抓住了真正阻塞。',
      inputLabel,
      inputPlaceholder: '把真正的问题改写成一句话，并补充影响对象、范围和损失。',
      actions: [
        createFocusAction('rewrite_problem', '重写问题', '我把真正的问题定义改写为：', inputLabel, '直接重写问题定义，并说明这版为什么更准确。'),
        createFocusAction('add_fact', '补充事实', '为了校正问题定义，我补充这些事实：', inputLabel, '补充能支撑问题定义的真实场景、频率或损失。'),
        createFocusAction('narrow_scope', '收窄边界', '我先把问题范围收窄到：', inputLabel, '说明你要先聚焦哪类用户、哪一步和哪种损失。'),
      ],
    };
  }

  if (currentPhase === 'waiting_user_objection_response') {
    const inputLabel = requiredUserAction || '请直接回应当前轮中的关键质疑。';
    return {
      title: '回应本轮质疑',
      reason: objectionReason,
      inputLabel,
      inputPlaceholder: '请直接回应刺客和用户幽灵的关键质疑，说明你接受什么、反驳什么、还需验证什么。',
      actions: [
        createFocusAction('direct_counter', '直接反驳', '我直接回应这轮质疑：', inputLabel, '直接反驳最关键的一条质疑，并说明为什么它不成立。'),
        createFocusAction('partial_accept', '承认部分成立', '我接受其中一部分质疑，具体是：', inputLabel, '说明哪些质疑成立、哪些不成立，以及这会如何改变你的判断。'),
        createFocusAction('counter_example', '给一个反例', '我给出的反例如下：', inputLabel, '写一个能击穿当前质疑的真实场景、条件和原因。'),
      ],
    };
  }

  if (currentPhase === 'waiting_alternative_hypothesis_resolution') {
    const inputLabel = requiredUserAction || '请先处理更强的替代假设，再决定是否继续。';
    return {
      title: '处理替代假设',
      reason: '锚点官认为当前还有更强解释没有被正面处理，这一步必须先回答“为什么不是别的问题”。',
      inputLabel,
      inputPlaceholder: '请处理替代假设：承认并降级、补反证，或明确标记待验证。',
      actions: [
        createFocusAction('accept', '承认并降级', '我接受这个替代假设，并将原判断收窄为：', inputLabel, '如果你接受替代假设，写清它如何改变原来的问题定义和优先级。'),
        createFocusAction('counter', '补充反证', '我用以下反证说明，这个替代假设不足以取代当前判断：', inputLabel, '补一条能说明替代假设不足以解释问题的事实或案例。'),
        createFocusAction('verify', '标记待验证', '这个分歧需要继续验证，待核实的问题是：', inputLabel, '列出还没确认的前提、证据缺口和下一步验证动作。'),
      ],
    };
  }

  if (currentPhase === 'waiting_false_consensus_break') {
    const inputLabel = requiredUserAction || '请打破这段伪共识，明确哪些前提仍然不成立。';
    return {
      title: '拆开表面共识',
      reason: '系统判断你们只是表面达成一致，关键前提并没有真的站住。',
      inputLabel,
      inputPlaceholder: '指出哪些前提其实还没成立，哪些分歧还需要继续追问。',
      actions: [
        createFocusAction('broken_premise', '指出未成立前提', '这段共识里仍未成立的前提是：', inputLabel, '点名最关键的未成立前提，并说明为什么它会影响结论。'),
        createFocusAction('name_gap', '说明分歧点', '真正还没达成一致的分歧点是：', inputLabel, '说清楚哪一个判断标准、范围或约束仍未统一。'),
        createFocusAction('keep_pressing', '要求继续追问', '我认为这段共识还不能收束，下一步必须追问：', inputLabel, '写下必须继续追问的那一个问题。'),
      ],
    };
  }

  if (currentPhase === 'waiting_tech_escape_response') {
    const inputLabel = requiredUserAction || '请正面回应这些质疑，不要把讨论逃到“技术自然会解决”上。';
    return {
      title: '把讨论拉回真实问题',
      reason: '当前回应已经开始往“技术自然会解决”上逃，系统要求你回到业务目标、用户痛点和执行约束。',
      inputLabel,
      inputPlaceholder: '不要再谈抽象技术能力，直接回到业务目标、用户痛点和真实约束。',
      actions: [
        createFocusAction('business_goal', '回到业务目标', '先回到业务目标，我要解决的是：', inputLabel, '先讲目标和损失，不要先讲技术方案。'),
        createFocusAction('user_problem', '回到用户问题', '先回到用户问题，最真实的阻塞是：', inputLabel, '说明用户在哪一步最痛、为什么现有做法不够。'),
        createFocusAction('execution_constraint', '回到执行约束', '先回到执行约束，我必须考虑的是：', inputLabel, '说清成本、资源、协作复杂度或维护负担。'),
      ],
    };
  }

  if (currentPhase === 'waiting_round_decision') {
    if (completedRoundCount >= CHALLENGE_MAX_ROUNDS) {
      const inputLabel = requiredUserAction || `已达到质疑模式最大 ${CHALLENGE_MAX_ROUNDS} 轮，请改为切换模式或回看本轮结论。`;
      return {
        title: '已达到质疑轮次上限',
        reason: `这一议题在 challenge 模式下最多只跑 ${CHALLENGE_MAX_ROUNDS} 轮，避免无限追问；现在请改为切换模式或回看本轮结论。`,
        inputLabel,
        inputPlaceholder: '如果要切到裁决模式，就写清接下来要做的判断；如果还不确定，就先回看本轮收束结论。',
        actions: [
          createFocusAction('switch_decision', '切到裁决模式', '我准备切到裁决模式，接下来要明确的决策是：', inputLabel, '写清要把哪一个问题带去裁决模式。'),
          createFocusAction('review_grounding', '回看本轮结论', '请先根据当前收束结论，帮我确认这轮已经站住和仍待验证的点：', inputLabel, '如果你还不确定是否该切模式，可以先让系统复述本轮结论。'),
        ],
      };
    }

    const inputLabel = requiredUserAction || '\u672c\u8f6e\u5df2\u5b8c\u6210\u3002\u4f60\u53ef\u4ee5\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u6216\u5207\u6362\u5230\u5176\u4ed6\u6a21\u5f0f\u3002';
    return {
      title: '\u51b3\u5b9a\u8fd9\u4e00\u8f6e\u600e\u4e48\u6536\u675f',
      reason: '\u951a\u70b9\u5b98\u5df2\u7ecf\u7ed9\u51fa\u672c\u8f6e\u6536\u675f\uff0c\u4f60\u73b0\u5728\u8981\u51b3\u5b9a\u662f\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u8fd8\u662f\u628a\u7ed3\u8bba\u5e26\u53bb\u4e0b\u4e00\u6a21\u5f0f\u3002',
      inputLabel,
      inputPlaceholder: '\u5982\u679c\u8981\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u5c31\u5199\u6e05\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u4ec0\u4e48\uff1b\u5982\u679c\u5207\u6a21\u5f0f\uff0c\u5c31\u5199\u6e05\u5e26\u7740\u4ec0\u4e48\u95ee\u9898\u5207\u6362\u3002',
      actions: [
        createFocusAction('continue_round', '\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee', '\u6211\u51b3\u5b9a\u8fdb\u5165\u4e0b\u4e00\u8f6e\u8ffd\u95ee\uff0c\u65b0\u7684\u63a8\u8fdb\u70b9\u662f\uff1a', inputLabel, '\u8bf4\u660e\u4e3a\u4ec0\u4e48\u8fd8\u8981\u7ee7\u7eed\u8ffd\u95ee\uff0c\u4ee5\u53ca\u4e0b\u4e00\u8f6e\u6700\u91cd\u8981\u7684\u95ee\u9898\u3002'),
        createFocusAction('switch_decision', '切到裁决模式', '我准备切到裁决模式，接下来要明确的决策是：', inputLabel, '写清要把哪一个问题带去裁决模式。'),
        createFocusAction('review_grounding', '回看本轮结论', '请先根据当前收束结论，帮我确认这轮已经站住和仍待验证的点：', inputLabel, '如果你还不确定是否该继续，可以先让系统复述本轮结论。'),
      ],
    };
  }

  if (currentPhase === 'topic_submitted') {
    if (hasExistingRounds) {
      const inputLabel = requiredUserAction || '\u8bf7\u8f93\u5165\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u7684\u8ffd\u95ee\u3001\u53cd\u4f8b\u6216\u4fee\u6b63\uff1b\u4ecd\u5728\u5f53\u524d\u4f1a\u8bdd\u91cc\uff0c\u4e0d\u4f1a\u65b0\u5efa\u4f1a\u8bdd\u3002';
      return {
        title: '\u53d1\u8d77\u4e0b\u4e00\u8f6e\u8ffd\u95ee',
        reason: '\u4e0a\u4e00\u8f6e\u5df2\u7ecf\u6536\u675f\uff1b\u8fd9\u91cc\u4ecd\u5728\u5f53\u524d\u4f1a\u8bdd\u91cc\uff0c\u53ea\u662f\u4e3a\u540c\u4e00\u8bae\u9898\u5f00\u542f\u4e0b\u4e00\u8f6e\u8ffd\u95ee\u3002',
        inputLabel,
        inputPlaceholder: '\u5199\u6e05\u4e0b\u4e00\u8f6e\u8981\u7ee7\u7eed\u9a8c\u8bc1\u7684\u8ffd\u95ee\u3001\u53cd\u4f8b\u6216\u4fee\u6b63\uff0c\u4e0d\u4f1a\u65b0\u5efa\u4f1a\u8bdd\u3002',
        actions: [
          createFocusAction('next_counterexample', '\u8865\u4e00\u4e2a\u53cd\u4f8b', '\u4e0b\u4e00\u8f6e\u6211\u60f3\u5148\u9a8c\u8bc1\u8fd9\u4e2a\u53cd\u4f8b\uff1a', inputLabel, '\u5199\u6e05\u4f60\u60f3\u7528\u54ea\u4e2a\u771f\u5b9e\u573a\u666f\u6216\u53cd\u4f8b\u7ee7\u7eed\u65bd\u538b\u3002'),
          createFocusAction('narrow_dispute', '\u6536\u7a84\u4e89\u8bae\u70b9', '\u4e0b\u4e00\u8f6e\u6211\u60f3\u5148\u628a\u4e89\u8bae\u6536\u7a84\u5230\uff1a', inputLabel, '\u628a\u4e0b\u4e00\u8f6e\u53ea\u60f3\u7ee7\u7eed\u9a8c\u8bc1\u7684\u90a3\u4e00\u4e2a\u5206\u6b67\u70b9\u5199\u6e05\u3002'),
          createFocusAction('clarify_next_goal', '\u660e\u786e\u9a8c\u8bc1\u76ee\u6807', '\u4e0b\u4e00\u8f6e\u6211\u6700\u60f3\u5f04\u6e05\u7684\u662f\uff1a', inputLabel, '\u5199\u6e05\u4e0b\u4e00\u8f6e\u8ffd\u95ee\u8981\u5f62\u6210\u4ec0\u4e48\u6837\u7684\u5224\u65ad\u6216\u7ed3\u8bba\u3002'),
        ],
      };
    }

    const inputLabel = requiredUserAction || '请输入你的议题或想法。';
    return {
      title: '开始这一轮',
      reason: '先给出一个能进入 framing 的议题表述。',
      inputLabel,
      inputPlaceholder: '直接写你想讨论的议题，并补一两句背景或目标。',
      actions: [
        createFocusAction('add_background', '补背景', '我补充一下议题背景：', inputLabel, '写清背景、发生场景和当前损失。'),
        createFocusAction('narrow_scope', '收窄范围', '我先把议题范围收窄到：', inputLabel, '先限定人群、流程步骤或目标，避免议题太大。'),
        createFocusAction('clarify_goal', '明确目标', '这次讨论真正想明确的是：', inputLabel, '写清你要验证的判断、要做的取舍或要形成的结论。'),
      ],
    };
  }

  const inputLabel = requiredUserAction || '继续推进当前步骤。';
  return {
    title: '继续推进',
    reason: '系统已经进入下一步，但当前阶段还没有更具体的焦点模板。',
    inputLabel,
    inputPlaceholder: '继续补充当前步骤所需的信息，系统会按当前阶段继续推进。',
    actions: [
      createFocusAction('continue', '继续补充', '', inputLabel, '继续补充当前步骤需要的信息。'),
    ],
  };
}

function buildStep(currentPhase: string): ChallengeWorkbenchStep {
  if (currentPhase === 'topic_submitted' || currentPhase === 'architect_framing') {
    return { current: 1, total: CHALLENGE_TOTAL_STEPS, label: '输入议题' };
  }
  if (currentPhase === 'waiting_user_problem_correction') {
    return { current: 2, total: CHALLENGE_TOTAL_STEPS, label: '确认问题定义' };
  }
  if (currentPhase === 'objection_generation') {
    return { current: 3, total: CHALLENGE_TOTAL_STEPS, label: '生成反方质疑' };
  }
  if (
    currentPhase === 'waiting_user_objection_response'
    || currentPhase === 'waiting_alternative_hypothesis_resolution'
    || currentPhase === 'waiting_false_consensus_break'
    || currentPhase === 'waiting_tech_escape_response'
  ) {
    return { current: 4, total: CHALLENGE_TOTAL_STEPS, label: '回应关键分歧' };
  }
  if (currentPhase === 'grounding') {
    return { current: 5, total: CHALLENGE_TOTAL_STEPS, label: '收束本轮结论' };
  }
  return { current: 6, total: CHALLENGE_TOTAL_STEPS, label: '决定本轮去向' };
}

function buildChecklist(
  currentPhase: string,
  handoff: ChallengeHandoff | undefined,
): ChallengeWorkbenchChecklistItem[] {
  if (currentPhase === 'waiting_user_problem_correction') {
    return [
      { id: 'problem_definition', label: '用一句话重写真正的问题定义', detail: '不能只停留在“想做工具”这种方案层表述。', done: false },
      { id: 'scenario', label: '补清具体场景 / 团队 / 发生位置', detail: '至少说明谁在什么情境里被这个问题卡住。', done: false },
      { id: 'top_pains', label: '补足 3 条用户痛点', detail: '至少写出三条高频、可感知的痛点。', done: false },
      { id: 'constraints', label: '写出至少 1 条硬约束', detail: '例如时间、资源、协作成本或维护限制。', done: false },
    ];
  }

  if (currentPhase === 'waiting_user_objection_response') {
    return [
      { id: 'response_path', label: '先选择一种回应路径', detail: '直接反驳、部分承认或给出反例，不能空手提交。', done: false },
      { id: 'response_length', label: '回应至少 50 字', detail: '避免一句话跳过关键分歧。', done: false },
      { id: 'core_objection', label: '正面处理刺客和用户幽灵的核心质疑', detail: '至少说清哪些成立、哪些不成立、还需验证什么。', done: false },
    ];
  }

  if (currentPhase === 'waiting_alternative_hypothesis_resolution') {
    return [
      { id: 'response_path', label: '先选择替代假设处理路径', detail: '承认并降级、补反证，或标记待验证。', done: false },
      { id: 'minimum_structure', label: '写清为什么它不能直接取代当前判断', detail: '不能只说“我不同意”。', done: false },
    ];
  }

  if (currentPhase === 'waiting_false_consensus_break') {
    return [
      { id: 'response_path', label: '先选择伪共识拆解路径', detail: '指出未成立前提、命名分歧点，或要求继续追问。', done: false },
      { id: 'premise_gap', label: '明确哪一个前提仍然没站住', detail: '不能只写“还没达成一致”。', done: false },
    ];
  }

  if (currentPhase === 'waiting_tech_escape_response') {
    return [
      { id: 'response_path', label: '先选择回拉路径', detail: '回到业务目标、用户问题或执行约束。', done: false },
      { id: 'real_world_anchor', label: '把讨论拉回真实问题', detail: '不能继续停留在抽象技术能力。', done: false },
    ];
  }

  if (currentPhase === 'waiting_round_decision') {
    return [
      {
        id: 'problem_frame',
        label: '问题定义已经收束',
        detail: '这一轮至少要有一句被确认的问题定义。',
        done: Boolean(handoff?.problemFrame.oneSentenceProblem),
      },
      {
        id: 'user_confirmed_context',
        label: '用户确认上下文已补齐',
        detail: '需要场景、3 条痛点和至少 1 条约束。',
        done: Boolean(
          handoff?.userConfirmedContext.scenario
          && (handoff?.userConfirmedContext.topPains.length ?? 0) >= 3
          && (handoff?.userConfirmedContext.constraints.length ?? 0) >= 1
        ),
      },
      {
        id: 'counter_hypothesis',
        label: '最强反设和采用阻力已压实',
        detail: '需要至少 1 条最强反设和 1 条采用阻力。',
        done: Boolean(handoff?.strongestCounterHypothesis && (handoff?.adoptionRisks.length ?? 0) >= 1),
      },
      {
        id: 'next_validation_actions',
        label: '下一步验证动作已明确',
        detail: '至少要有 1 条可执行的验证动作。',
        done: (handoff?.nextValidationActions.length ?? 0) >= 1,
      },
    ];
  }

  return [
    { id: 'continue', label: '继续补齐当前步骤信息', detail: '如果系统还没给出更具体门槛，继续围绕当前阶段补充内容。', done: false },
  ];
}

function buildHandoffReadiness(handoff: ChallengeHandoff | undefined): ChallengeWorkbenchHandoffReadiness {
  if (!handoff) {
    return {
      available: false,
      decisionReady: false,
      requirementBuildReady: false,
      summary: '本轮 handoff 还没形成，暂时不要切到下游模式。',
      openConflicts: [],
      nextValidationActions: [],
    };
  }

  const decisionReady = Boolean(handoff.roundStatus.matureEnoughForDecision);
  const requirementBuildReady = Boolean(handoff.roundStatus.matureEnoughForRequirementBuild);
  const summary = requirementBuildReady
    ? '这一轮已具备直接进入需求共建的成熟度。'
    : decisionReady
      ? '这一轮已足够进入裁决模式，但仍不适合直接写需求草稿。'
      : '这一轮还没形成完整 handoff，建议继续追问。';

  return {
    available: true,
    decisionReady,
    requirementBuildReady,
    summary,
    openConflicts: handoff.openConflicts,
    nextValidationActions: handoff.nextValidationActions,
  };
}

function buildModeSwitchState(
  currentPhase: string,
  handoffReadiness: ChallengeWorkbenchHandoffReadiness,
): ChallengeWorkbenchModel['modeSwitchState'] {
  const baseBlockedReason = currentPhase === 'waiting_round_decision'
    ? ''
    : '请先完成这一轮的收束，再决定是否切模式。';

  const decisionReason = baseBlockedReason
    || (!handoffReadiness.available
      ? '本轮 handoff 还没生成完整，暂时不能进入裁决模式。'
      : !handoffReadiness.decisionReady
        ? '至少补齐问题定义、用户确认、最强反设和下一步验证动作后，才能进入裁决模式。'
        : '可以把这一轮带去裁决模式继续做取舍。');

  const requirementBlockedByConflict = handoffReadiness.openConflicts.length > 0
    ? `仍有未决冲突：${handoffReadiness.openConflicts.join('；')}`
    : '';
  const requirementReason = baseBlockedReason
    || (!handoffReadiness.available
      ? '本轮 handoff 还没生成完整，暂时不能进入需求共建模式。'
      : !handoffReadiness.decisionReady
        ? '这一轮连裁决成熟度都还没到，先不要直接写需求草稿。'
        : !handoffReadiness.requirementBuildReady
          ? (requirementBlockedByConflict || '还缺 MVP 边界或排除项，暂时不要直接进入需求共建模式。')
          : '这一轮已经可以直接承接到需求共建模式。');

  return {
    decision: {
      enabled: currentPhase === 'waiting_round_decision' && handoffReadiness.decisionReady,
      reason: decisionReason,
    },
    'requirement-build': {
      enabled: currentPhase === 'waiting_round_decision' && handoffReadiness.requirementBuildReady,
      reason: requirementReason,
    },
  };
}

function buildProblemCorrectionForm(currentPhase: string): ChallengeWorkbenchProblemCorrectionForm | undefined {
  if (currentPhase !== 'waiting_user_problem_correction') {
    return undefined;
  }

  return {
    problemDefinition: {
      label: '问题定义',
      placeholder: '一句话写清真正被卡住的是什么，而不是你想做什么方案。',
    },
    scenario: {
      label: '场景/行业',
      placeholder: '谁在什么情境里被这个问题卡住，例如团队类型、行业、协作环境。',
    },
    topPains: {
      label: '核心痛点',
      placeholder: '写一条高频、可感知、能说明损失的痛点。',
      minItems: 3,
    },
    constraints: {
      label: '约束',
      placeholder: '写一条不能回避的时间、资源、组织或维护限制。',
      minItems: 1,
    },
    notes: {
      label: '补充说明',
      placeholder: '可选：补充背景、例子或你暂时拿不准但不想丢掉的信息。',
    },
  };
}

export function buildChallengeWorkbenchModel(input: ChallengeWorkbenchInput): ChallengeWorkbenchModel {
  const messages = input.modeState?.messages ?? [];
  const rounds = buildRounds(messages);
  const hasRounds = hasExistingChallengeRounds(rounds);
  const completedRoundCount = countCompletedRounds(rounds);
  const step = buildStep(input.currentPhase);

  let currentRoundIndex = rounds.length - 1;
  if (PHASES_USING_LAST_CLOSED_ROUND.has(input.currentPhase)) {
    currentRoundIndex = -1;
    for (let index = rounds.length - 1; index >= 0; index -= 1) {
      if (rounds[index]?.some((item) => item.roleId === 'grounder')) {
        currentRoundIndex = index;
        break;
      }
    }
    if (currentRoundIndex === -1) {
      currentRoundIndex = rounds.length - 1;
    }
  }

  const currentItems = currentRoundIndex >= 0
    ? (rounds[currentRoundIndex] ?? [])
    : [];
  const currentRound = {
    title: '当前轮上下文',
    summary: summarizeRound(currentItems),
    items: currentItems,
  };
  const historyGroups = buildHistoryGroups(rounds, currentRoundIndex);
  const focusCard = buildFocusCard(input.currentPhase, input.requiredUserAction, currentItems, hasRounds, completedRoundCount);
  const checklist = buildChecklist(input.currentPhase, input.latestChallengeHandoff);
  const handoffReadiness = buildHandoffReadiness(input.latestChallengeHandoff);
  const modeSwitchState = buildModeSwitchState(input.currentPhase, handoffReadiness);
  const problemCorrectionForm = buildProblemCorrectionForm(input.currentPhase);
  const topicBrief = buildTopicBrief(input.topic, messages, currentItems, input.sharedContext ?? {
    confirmedFacts: [],
    hardConstraints: [],
    sourceReferences: [],
  });

  return {
    layoutMode: input.currentPhase === 'topic_submitted' && !hasRounds ? 'topic-intake' : 'standard',
    step,
    currentRound,
    currentContext: currentRound,
    historyGroups,
    focusCard,
    checklist,
    handoffReadiness,
    modeSwitchState,
    topicBrief,
    quickActions: focusCard.actions,
    problemCorrectionForm,
  };
}

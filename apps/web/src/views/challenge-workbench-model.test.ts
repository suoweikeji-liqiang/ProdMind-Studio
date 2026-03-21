import { describe, expect, it } from 'vitest';
import { buildChallengeWorkbenchModel } from './challenge-workbench-model.js';

describe('buildChallengeWorkbenchModel', () => {
  it('derives a focus card and topic brief for problem correction phases', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个硬件研发流程管理工具',
      currentPhase: 'waiting_user_problem_correction',
      requiredUserAction: '请确认或修正问题定义。',
      sharedContext: {
        confirmedFacts: ['资料分散，消息脱节，导致推进卡住。'],
        hardConstraints: ['不能要求团队额外维护复杂字段。'],
        sourceReferences: ['最近三次项目复盘记录'],
      },
      modeState: {
        messages: [
          { speaker: 'user', content: '我们要不要做一个研发流程工具', timestamp: '2026-03-12T10:00:00.000Z' },
          {
            speaker: 'role',
            roleId: 'architect',
            roleName: '架构师',
            content: '问题定义：团队真正卡住的不是缺工具，而是资料和决策依据散落在多个渠道。',
            timestamp: '2026-03-12T10:00:05.000Z',
          },
          { speaker: 'user', content: '我同意先聚焦资料分散和消息脱节。', timestamp: '2026-03-12T10:00:10.000Z' },
        ],
      },
    });

    expect(model.focusCard.title).toBe('修正问题定义');
    expect(model.focusCard.reason).toContain('架构师');
    expect(model.focusCard.actions.map((action) => action.label)).toEqual([
      '重写问题',
      '补充事实',
      '收窄边界',
    ]);
    expect(model.focusCard.inputLabel).toBe('请确认或修正问题定义。');
    expect(model.topicBrief.topic).toBe('我们是否应该开发一个硬件研发流程管理工具');
    expect(model.topicBrief.currentFraming).toContain('资料和决策依据散落');
    expect(model.topicBrief.latestUserPosition).toContain('聚焦资料分散和消息脱节');
    expect(model.topicBrief.confirmedFacts).toContain('资料分散，消息脱节，导致推进卡住。');
  });

  it('extracts the current architect framing and objections for objection response phases', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个硬件研发流程管理工具',
      currentPhase: 'waiting_user_objection_response',
      requiredUserAction: '请直接回应当前轮中的关键质疑。',
      modeState: {
        messages: [
          { speaker: 'user', content: '我们要不要做一个流程工具', timestamp: '2026-03-12T10:00:00.000Z' },
          {
            speaker: 'role',
            roleId: 'architect',
            roleName: '架构师',
            content: '问题定义：信息分散导致推进低效。',
            timestamp: '2026-03-12T10:00:05.000Z',
          },
          { speaker: 'user', content: '先聚焦在资料分散和消息脱节。', timestamp: '2026-03-12T10:00:10.000Z' },
          {
            speaker: 'role',
            roleId: 'assassin',
            roleName: '刺客',
            content: '你可能在为管理可视化买单，而不是为真实效率买单。',
            timestamp: '2026-03-12T10:00:15.000Z',
          },
          {
            speaker: 'role',
            roleId: 'userGhost',
            roleName: '用户幽灵',
            content: '团队也许根本不会持续维护这套流程。',
            timestamp: '2026-03-12T10:00:20.000Z',
          },
        ],
      },
    });

    expect(model.currentRound.title).toBe('当前轮上下文');
    expect(model.currentRound.items.map((item) => item.roleId)).toEqual([
      'architect',
      'assassin',
      'userGhost',
    ]);
    expect(model.currentRound.summary).toContain('你可能在为管理可视化买单');
    expect(model.focusCard.title).toBe('回应本轮质疑');
    expect(model.focusCard.actions.map((item) => item.label)).toEqual([
      '直接反驳',
      '承认部分成立',
      '给一个反例',
    ]);
    expect(model.topicBrief.keyConflicts).toHaveLength(2);
    expect(model.topicBrief.keyConflicts[0]).toContain('你可能在为管理可视化买单');
  });

  it('builds interrupt quick actions for alternative hypothesis phases', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个硬件研发流程管理工具',
      currentPhase: 'waiting_alternative_hypothesis_resolution',
      requiredUserAction: '请先处理更强的替代假设，再决定是否继续。',
      modeState: {
        messages: [
          {
            speaker: 'role',
            roleId: 'architect',
            roleName: '架构师',
            content: '问题定义：资料分散让推进变慢。',
            timestamp: '2026-03-12T10:00:05.000Z',
          },
          {
            speaker: 'role',
            roleId: 'assassin',
            roleName: '刺客',
            content: '也许不是流程问题，而是需求优先级混乱。',
            timestamp: '2026-03-12T10:00:15.000Z',
          },
          {
            speaker: 'role',
            roleId: 'userGhost',
            roleName: '用户幽灵',
            content: '也可能只是沟通纪律不够。',
            timestamp: '2026-03-12T10:00:20.000Z',
          },
          {
            speaker: 'role',
            roleId: 'grounder',
            roleName: '锚点官',
            content: '检测到替代假设：真正的问题可能是优先级治理，而不是工具缺失。',
            timestamp: '2026-03-12T10:00:30.000Z',
          },
        ],
      },
    });

    expect(model.currentRound.items.at(-1)?.roleId).toBe('grounder');
    expect(model.focusCard.actions.map((item) => item.kind)).toEqual([
      'accept',
      'counter',
      'verify',
    ]);
    expect(model.focusCard.title).toBe('处理替代假设');
  });

  it('splits completed rounds into collapsible history while keeping the current round active', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个硬件研发流程管理工具',
      currentPhase: 'waiting_user_objection_response',
      requiredUserAction: '请直接回应当前轮中的关键质疑。',
      modeState: {
        messages: [
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第一轮问题定义。', timestamp: '2026-03-12T10:00:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第一轮反方。', timestamp: '2026-03-12T10:00:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第一轮用户反应。', timestamp: '2026-03-12T10:00:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第一轮收束。', timestamp: '2026-03-12T10:00:30.000Z' },
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第二轮问题定义。', timestamp: '2026-03-12T10:05:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第二轮反方。', timestamp: '2026-03-12T10:05:15.000Z' },
        ],
      },
    });

    expect(model.currentRound.items.map((item) => item.content)).toEqual([
      '第二轮问题定义。',
      '第二轮反方。',
    ]);
    expect(model.historyGroups).toHaveLength(1);
    expect(model.historyGroups[0]?.label).toBe('第 1 轮');
    expect(model.historyGroups[0]?.items.at(-1)?.roleId).toBe('grounder');
  });

  it('keeps the topic submission focus card short and action-oriented', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否要开发一套硬件研发流程管理系统',
      currentPhase: 'topic_submitted',
      requiredUserAction: '请输入你的议题或想法。',
      modeState: {
        messages: [],
      },
    });

    expect(model.focusCard.title).toBe('开始这一轮');
    expect(model.focusCard.reason).toBe('先给出一个能进入 framing 的议题表述。');
    expect(model.focusCard.inputLabel).toBe('请输入你的议题或想法。');
    expect(model.focusCard.actions.map((action) => action.label)).toEqual([
      '补背景',
      '收窄范围',
      '明确目标',
    ]);
    expect(model.layoutMode).toBe('topic-intake');
  });

  it('treats topic_submitted with existing round history as the next challenge round, not a brand new session', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '鎴戜滑鏄惁瑕佸紑鍙戜竴濂楃‖浠剁爺鍙戞祦绋嬬鐞嗙郴缁?',
      currentPhase: 'topic_submitted',
      requiredUserAction: '请输入下一轮要继续验证的追问、反例或修正；仍在当前会话里，不会新建会话。',
      modeState: {
        messages: [
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第一轮问题定义', timestamp: '2026-03-12T10:00:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第一轮反驳', timestamp: '2026-03-12T10:00:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第一轮用户阻力', timestamp: '2026-03-12T10:00:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第一轮收束', timestamp: '2026-03-12T10:00:30.000Z' },
        ],
      },
    });

    expect(model.focusCard.title).toBe('发起下一轮追问');
    expect(model.focusCard.reason).toContain('仍在当前会话里');
    expect(model.focusCard.inputLabel).toContain('不会新建会话');
    expect(model.layoutMode).toBe('standard');
  });

  it('caps challenge round decisions at five rounds and removes the continue action', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否要开发一套硬件研发流程管理系统',
      currentPhase: 'waiting_round_decision',
      requiredUserAction: '已达到质疑模式最大 5 轮，请改为切换模式或回看本轮结论。',
      modeState: {
        messages: [
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第1轮问题定义', timestamp: '2026-03-12T10:00:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第1轮反驳', timestamp: '2026-03-12T10:00:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第1轮用户阻力', timestamp: '2026-03-12T10:00:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第1轮收束', timestamp: '2026-03-12T10:00:30.000Z' },
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第2轮问题定义', timestamp: '2026-03-12T10:01:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第2轮反驳', timestamp: '2026-03-12T10:01:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第2轮用户阻力', timestamp: '2026-03-12T10:01:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第2轮收束', timestamp: '2026-03-12T10:01:30.000Z' },
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第3轮问题定义', timestamp: '2026-03-12T10:02:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第3轮反驳', timestamp: '2026-03-12T10:02:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第3轮用户阻力', timestamp: '2026-03-12T10:02:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第3轮收束', timestamp: '2026-03-12T10:02:30.000Z' },
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第4轮问题定义', timestamp: '2026-03-12T10:03:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第4轮反驳', timestamp: '2026-03-12T10:03:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第4轮用户阻力', timestamp: '2026-03-12T10:03:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第4轮收束', timestamp: '2026-03-12T10:03:30.000Z' },
          { speaker: 'role', roleId: 'architect', roleName: '架构师', content: '第5轮问题定义', timestamp: '2026-03-12T10:04:05.000Z' },
          { speaker: 'role', roleId: 'assassin', roleName: '刺客', content: '第5轮反驳', timestamp: '2026-03-12T10:04:15.000Z' },
          { speaker: 'role', roleId: 'userGhost', roleName: '用户幽灵', content: '第5轮用户阻力', timestamp: '2026-03-12T10:04:20.000Z' },
          { speaker: 'role', roleId: 'grounder', roleName: '锚点官', content: '第5轮收束', timestamp: '2026-03-12T10:04:30.000Z' },
        ],
      },
    });

    expect(model.focusCard.title).toBe('已达到质疑轮次上限');
    expect(model.focusCard.reason).toContain('最多只跑 5 轮');
    expect(model.focusCard.actions.map((item) => item.kind)).toEqual([
      'switch_decision',
      'review_grounding',
    ]);
  });

  it('shows strict checklist gates for problem correction before the user fills the required structure', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个需求管理系统',
      currentPhase: 'waiting_user_problem_correction',
      requiredUserAction: '请确认或修正问题定义。',
      modeState: {
        messages: [
          {
            speaker: 'role',
            roleId: 'architect',
            roleName: '架构师',
            content: '核心问题：团队当前缺少统一的问题收敛入口。',
            timestamp: '2026-03-13T09:00:00.000Z',
          },
        ],
      },
    });

    expect(model.step.current).toBe(2);
    expect(model.step.total).toBe(6);
    expect(model.checklist.map((item) => item.id)).toEqual([
      'problem_definition',
      'scenario',
      'top_pains',
      'constraints',
    ]);
    expect(model.checklist.every((item) => item.done === false)).toBe(true);
    expect(model.modeSwitchState.decision.enabled).toBe(false);
    expect(model.modeSwitchState.decision.reason).toContain('先完成这一轮');
  });

  it('exposes a structured problem correction form contract for the correction phase', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个需求管理系统',
      currentPhase: 'waiting_user_problem_correction',
      requiredUserAction: '请确认或修正问题定义。',
      modeState: {
        messages: [
          {
            speaker: 'role',
            roleId: 'architect',
            roleName: '架构师',
            content: '核心问题：团队缺少稳定的问题收敛入口。',
            timestamp: '2026-03-13T09:00:00.000Z',
          },
        ],
      },
    });

    expect(model.problemCorrectionForm).toBeTruthy();
    expect(model.problemCorrectionForm?.problemDefinition.label).toBe('问题定义');
    expect(model.problemCorrectionForm?.scenario.label).toBe('场景/行业');
    expect(model.problemCorrectionForm?.topPains.minItems).toBe(3);
    expect(model.problemCorrectionForm?.constraints.minItems).toBe(1);
    expect(model.problemCorrectionForm?.notes.label).toBe('补充说明');
  });

  it('uses the latest challenge handoff to expose downstream readiness and blocked reasons', () => {
    const model = buildChallengeWorkbenchModel({
      topic: '我们是否应该开发一个需求管理系统',
      currentPhase: 'waiting_round_decision',
      requiredUserAction: '本轮已完成。你可以进入下一轮追问，或切换到其他模式。',
      latestChallengeHandoff: {
        roundIndex: 1,
        topic: '我们是否应该开发一个需求管理系统',
        problemFrame: {
          oneSentenceProblem: '团队缺少统一的问题收敛入口，导致判断依据持续漂移。',
          boundaries: ['两周内验证价值', '不增加复杂流程维护'],
          keyVariables: ['需求散落', '优先级漂移', '返工成本'],
        },
        userConfirmedContext: {
          scenario: '10 人产品研发团队同时接收销售、运营和老板的临时需求。',
          topPains: ['需求散落', '优先级不透明', '返工频繁'],
          constraints: ['必须在两周内验证价值'],
        },
        strongestCounterHypothesis: '真实问题也可能是优先级治理混乱，而不是工具缺失。',
        adoptionRisks: ['如果维护成本高，团队会继续用聊天和文档凑合。'],
        mvpScope: {
          include: ['统一收口入口', '最小优先级判断记录'],
          exclude: ['复杂协同权限'],
          oneWeekScope: ['内部团队试跑 1 周'],
        },
        openConflicts: ['还没有证明这件事足够高频'],
        nextValidationActions: ['补一个最近发生的真实案例'],
        evidenceTrace: {},
        roundStatus: {
          matureEnoughForDecision: true,
          matureEnoughForRequirementBuild: false,
        },
      },
      modeState: {
        messages: [
          {
            speaker: 'role',
            roleId: 'grounder',
            roleName: '锚点官',
            content: '## 当前最强假设\n需要先验证需求收口入口是否真的能减少返工。',
            timestamp: '2026-03-13T09:05:00.000Z',
          },
        ],
      },
    });

    expect(model.handoffReadiness.available).toBe(true);
    expect(model.handoffReadiness.decisionReady).toBe(true);
    expect(model.handoffReadiness.requirementBuildReady).toBe(false);
    expect(model.handoffReadiness.openConflicts).toContain('还没有证明这件事足够高频');
    expect(model.modeSwitchState.decision.enabled).toBe(true);
    expect(model.modeSwitchState['requirement-build'].enabled).toBe(false);
    expect(model.modeSwitchState['requirement-build'].reason).toContain('未决冲突');
  });
});

export interface SessionTaskChoice {
  label: string;
  actionValue: string;
}

export interface SessionTaskModel {
  headline: string;
  primaryInputAction: string | null;
  primaryButtonLabel: string | null;
  explicitChoices: SessionTaskChoice[];
  showModeSwitcher: boolean;
}

interface SessionLike {
  currentMode: string;
  currentPhase: string;
  interactionState: string;
  requiredUserAction?: string;
  nextRecommendedMode?: string;
  recommendedRollbackMode?: string;
}

interface ArtifactLike {
  drafts?: Record<string, unknown>;
  finalized?: Record<string, unknown>;
}

function buildDefaultModel(session: SessionLike): SessionTaskModel {
  return {
    headline: session.requiredUserAction ?? '继续推进当前步骤。',
    primaryInputAction: null,
    primaryButtonLabel: null,
    explicitChoices: [],
    showModeSwitcher: true,
  };
}

export function buildSessionTaskModel(
  session: SessionLike,
  _artifacts: ArtifactLike,
): SessionTaskModel {
  if (session.currentPhase === 'waiting_user_problem_correction') {
    return {
      headline: session.requiredUserAction ?? '请确认或修正问题定义。',
      primaryInputAction: 'problem_correction',
      primaryButtonLabel: '提交问题修正',
      explicitChoices: [],
      showModeSwitcher: true,
    };
  }

  if (
    session.currentPhase === 'waiting_user_objection_response'
    || session.currentPhase === 'waiting_tech_escape_response'
    || session.currentPhase === 'waiting_alternative_hypothesis_resolution'
    || session.currentPhase === 'waiting_false_consensus_break'
  ) {
    return {
      headline: session.requiredUserAction ?? '请回应当前质疑。',
      primaryInputAction: 'objection_response',
      primaryButtonLabel: '提交回应',
      explicitChoices: [],
      showModeSwitcher: false,
    };
  }

  if (session.currentPhase === 'waiting_round_decision') {
    return {
      headline: session.requiredUserAction ?? '本轮已完成，请决定下一步。',
      primaryInputAction: null,
      primaryButtonLabel: null,
      explicitChoices: [
        { label: '继续下一轮', actionValue: 'round_resolution' },
        { label: '切到裁决模式', actionValue: 'switch:decision' },
      ],
      showModeSwitcher: true,
    };
  }

  if (session.currentPhase === 'waiting_user_frame_confirmation') {
    return {
      headline: session.requiredUserAction ?? '请确认或修正决策框架。',
      primaryInputAction: 'frame_correction',
      primaryButtonLabel: '提交框架修正',
      explicitChoices: [],
      showModeSwitcher: true,
    };
  }

  if (session.currentPhase === 'waiting_user_priority_adjustment') {
    return {
      headline: session.requiredUserAction ?? '请调整优先级或权重。',
      primaryInputAction: 'priority_adjustment',
      primaryButtonLabel: '提交优先级调整',
      explicitChoices: [],
      showModeSwitcher: false,
    };
  }

  if (session.currentPhase === 'waiting_decision_resolution') {
    return {
      headline: session.requiredUserAction ?? '请确认推荐结论的下一步。',
      primaryInputAction: null,
      primaryButtonLabel: null,
      explicitChoices: [
        { label: '进入需求共建', actionValue: 'switch:requirement-build' },
        { label: '继续讨论裁决', actionValue: 'decision_resolution' },
      ],
      showModeSwitcher: true,
    };
  }

  if (session.currentPhase === 'waiting_user_artifact_selection') {
    return {
      headline: session.requiredUserAction ?? '请选择要推进的产物层级。',
      primaryInputAction: null,
      primaryButtonLabel: null,
      explicitChoices: [
        { label: '想法', actionValue: 'idea' },
        { label: '规格', actionValue: 'spec' },
        { label: '验收', actionValue: 'acceptance' },
        { label: '任务', actionValue: 'tasks' },
      ],
      showModeSwitcher: false,
    };
  }

  if (session.currentPhase === 'waiting_user_draft_revision') {
    return {
      headline: session.requiredUserAction ?? '请审阅并修订草稿。',
      primaryInputAction: 'draft_revision',
      primaryButtonLabel: '提交草稿修订',
      explicitChoices: [],
      showModeSwitcher: false,
    };
  }

  if (session.currentPhase === 'ready_for_downstream_or_finalize') {
    return {
      headline: session.requiredUserAction ?? '你可以继续修订草稿，或直接定稿。',
      primaryInputAction: 'draft_revision',
      primaryButtonLabel: '继续修订草稿',
      explicitChoices: [
        { label: '生成新版本', actionValue: 'finalize' },
      ],
      showModeSwitcher: true,
    };
  }

  if (session.currentPhase === 'artifact_finalized') {
    return {
      headline: session.requiredUserAction ?? '当前产物已定稿。',
      primaryInputAction: 'artifact_goal',
      primaryButtonLabel: '发起新产物目标',
      explicitChoices: [
        { label: '切回裁决模式', actionValue: 'switch:decision' },
      ],
      showModeSwitcher: true,
    };
  }

  if (session.currentMode === 'decision' && session.currentPhase === 'decision_prompt_submitted') {
    return {
      headline: session.requiredUserAction ?? '请输入你的决策问题。',
      primaryInputAction: 'decision_problem',
      primaryButtonLabel: '开始裁决分析',
      explicitChoices: [],
      showModeSwitcher: true,
    };
  }

  if (session.currentMode === 'requirement-build' && session.currentPhase === 'artifact_goal_submitted') {
    return {
      headline: session.requiredUserAction ?? '请输入你要沉淀的产物目标。',
      primaryInputAction: 'artifact_goal',
      primaryButtonLabel: '开始生成产物',
      explicitChoices: [],
      showModeSwitcher: true,
    };
  }

  if (session.currentMode === 'challenge' && session.currentPhase === 'topic_submitted') {
    return {
      headline: session.requiredUserAction ?? '请输入你的议题或想法。',
      primaryInputAction: 'raw_topic',
      primaryButtonLabel: '开始质疑',
      explicitChoices: [],
      showModeSwitcher: true,
    };
  }

  return buildDefaultModel(session);
}

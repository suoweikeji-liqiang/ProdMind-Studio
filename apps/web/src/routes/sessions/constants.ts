import type {
  DecisionFrame,
  RoleIdentity,
  SharedContext,
  TradeoffResult,
} from '@prodmind/shared-types';

export const CHALLENGE_FAKE_RESPONSE = [
  '## 当前最强假设',
  '1. 用户需要围绕一个议题持续进行多轮对话。',
  '',
  '## MVP边界',
  '包含：中文 Web 会话、手动模式切换、完整过程沉淀',
  '排除：协同编辑、复杂权限、自动化流程编排',
  '一周内验证：让 1 支内部团队围绕同一议题连续试跑 1 周',
  '',
  '## 未决冲突',
  '无',
  '',
  '## 下一步验证动作',
  '- 让一支内部团队连续试跑 1 周，记录每次需求收敛是否更快。',
  '',
  '## 本轮证伪检查',
  '当前最重要假设：多角色可见发言会提升团队思考质量。',
  '如果我是错的：用户会觉得信息过载，不愿意继续多轮推进。',
  '最小动作：先在内部团队试跑 1 周，再根据使用反馈调节角色密度。',
].join('\n');

export const DECISION_FAKE_FRAME: DecisionFrame = {
  options: ['buy an off-the-shelf system', 'build an internal system'],
  criteria: ['delivery speed', 'total cost', 'future extensibility'],
  constraints: ['limited implementation bandwidth', 'budget discipline'],
  assumptions: ['the company needs a shared management workflow soon'],
};

export const DECISION_FAKE_TRADEOFF: TradeoffResult = {
  analysis: {
    'buy an off-the-shelf system': 'Ships faster and lowers delivery risk, but limits custom fit.',
    'build an internal system': 'Improves custom fit and control, but costs more time and coordination.',
  },
  winners: ['buy an off-the-shelf system'],
  losers: ['build an internal system'],
};

export const DECISION_FAKE_RESPONSE = 'Recommendation: start with an off-the-shelf system, then only build custom modules where the workflow is truly strategic.';

export const CHALLENGE_ROLE_SET: RoleIdentity[] = [
  { roleId: 'architect', roleName: '架构师' },
  { roleId: 'assassin', roleName: '刺客' },
  { roleId: 'userGhost', roleName: '用户幽灵' },
  { roleId: 'grounder', roleName: '锚点官' },
];

export const DECISION_ROLE_SET: RoleIdentity[] = [
  { roleId: 'solution', roleName: '方案官' },
  { roleId: 'tradeoff', roleName: '权衡官' },
  { roleId: 'verdict', roleName: '裁决官' },
];

export const REQUIREMENT_ROLE_SET: RoleIdentity[] = [
  { roleId: 'requirements', roleName: '需求师' },
  { roleId: 'user-representative', roleName: '用户代表' },
  { roleId: 'implementation', roleName: '实施工程师' },
  { roleId: 'acceptance', roleName: '验收官' },
];

export const REQUIREMENT_ARTIFACT_TYPES = ['idea', 'spec', 'acceptance', 'tasks'] as const;
export type RequirementArtifactType = (typeof REQUIREMENT_ARTIFACT_TYPES)[number];

export type ChallengeAction = 'raw_topic' | 'problem_correction' | 'objection_response' | 'round_resolution';
export type DecisionAction = 'decision_problem' | 'frame_correction' | 'priority_adjustment' | 'decision_resolution';
export type RequirementAction = 'artifact_goal' | 'artifact_selection' | 'draft_revision' | 'finalization_note';
export type SharedContextField = keyof SharedContext;

export const CHALLENGE_INTERRUPT_PHASES = [
  'waiting_alternative_hypothesis_resolution',
  'waiting_false_consensus_break',
  'waiting_tech_escape_response',
] as const;

export const CHALLENGE_MIN_RESPONSE_LENGTH = 50;
export const CHALLENGE_MAX_ROUNDS = 5;

export const CHALLENGE_OBJECTION_RESPONSE_FOCUS_ACTIONS = ['direct_counter', 'partial_accept', 'counter_example'] as const;
export const CHALLENGE_INTERRUPT_FOCUS_ACTIONS: Record<(typeof CHALLENGE_INTERRUPT_PHASES)[number], string[]> = {
  waiting_alternative_hypothesis_resolution: ['accept', 'counter', 'verify'],
  waiting_false_consensus_break: ['broken_premise', 'name_gap', 'keep_pressing'],
  waiting_tech_escape_response: ['business_goal', 'user_problem', 'execution_constraint'],
};

export const REQUIREMENT_ARTIFACT_TITLES: Record<RequirementArtifactType, string> = {
  idea: '想法草稿',
  spec: '规格草稿',
  acceptance: '验收草稿',
  tasks: '任务草稿',
};

export const REQUIREMENT_ARTIFACT_LABELS: Record<RequirementArtifactType, string> = {
  idea: '想法',
  spec: '规格',
  acceptance: '验收',
  tasks: '任务',
};

export const REQUIREMENT_ROLE_BY_ARTIFACT: Record<RequirementArtifactType, RoleIdentity> = {
  idea: { roleId: 'requirements', roleName: '需求师' },
  spec: { roleId: 'user-representative', roleName: '用户代表' },
  tasks: { roleId: 'implementation', roleName: '实施工程师' },
  acceptance: { roleId: 'acceptance', roleName: '验收官' },
};

export interface ParsedProblemCorrection {
  oneSentenceProblem: string;
  scenario: string;
  topPains: string[];
  constraints: string[];
}

export interface RequirementDraftArtifact {
  artifactType: RequirementArtifactType;
  title: string;
  path: string;
  content: string;
  updatedAt: string;
}

export const SHARED_CONTEXT_PREFIXES: Record<string, SharedContextField> = {
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

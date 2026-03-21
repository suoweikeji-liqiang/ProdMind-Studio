export interface ProblemCorrectionDraft {
  problemDefinition: string;
  scenario: string;
  topPains: string[];
  constraints: string[];
  notes: string;
}

export interface ProblemCorrectionChecklistItem {
  id: 'problem_definition' | 'scenario' | 'top_pains' | 'constraints';
  label: string;
  detail: string;
  done: boolean;
}

export const PROBLEM_CORRECTION_MIN_TOP_PAIN_ITEMS = 3;
export const PROBLEM_CORRECTION_MIN_CONSTRAINT_ITEMS = 1;

function normalizeList(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createEmptyProblemCorrectionDraft(): ProblemCorrectionDraft {
  return {
    problemDefinition: '',
    scenario: '',
    topPains: ['', '', ''],
    constraints: [''],
    notes: '',
  };
}

export function buildProblemCorrectionChecklist(draft: ProblemCorrectionDraft): ProblemCorrectionChecklistItem[] {
  const topPains = normalizeList(draft.topPains);
  const constraints = normalizeList(draft.constraints);

  return [
    {
      id: 'problem_definition',
      label: '问题定义',
      detail: '用一句话写清真正被卡住的是什么，而不是你想做什么方案。',
      done: draft.problemDefinition.trim().length >= 12,
    },
    {
      id: 'scenario',
      label: '场景/行业',
      detail: '写清谁在什么情境里被这个问题卡住。',
      done: draft.scenario.trim().length >= 6,
    },
    {
      id: 'top_pains',
      label: '至少 3 条核心痛点',
      detail: '每条都应该是高频、可感知、能说明损失的痛点。',
      done: topPains.length >= PROBLEM_CORRECTION_MIN_TOP_PAIN_ITEMS,
    },
    {
      id: 'constraints',
      label: '至少 1 条约束',
      detail: '写出时间、资源、组织或维护上的硬限制。',
      done: constraints.length >= PROBLEM_CORRECTION_MIN_CONSTRAINT_ITEMS,
    },
  ];
}

export function serializeProblemCorrectionDraft(draft: ProblemCorrectionDraft): string {
  const lines = [
    `问题定义：${draft.problemDefinition.trim()}`,
    `场景：${draft.scenario.trim()}`,
    '核心痛点：',
    ...normalizeList(draft.topPains).map((item) => `- ${item}`),
    '约束：',
    ...normalizeList(draft.constraints).map((item) => `- ${item}`),
  ];

  const notes = draft.notes.trim();
  if (notes) {
    lines.push('补充说明：', notes);
  }

  return lines.join('\n');
}

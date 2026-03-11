import type { LLMAdapter } from '@prodmind/llm-adapter';
import type {
  DecisionFrame,
  DecisionSessionState,
  DecisionStep,
  DecisionSummary,
  ModeMessage,
  RoleIdentity,
  TradeoffResult,
} from '@prodmind/shared-types';
import { DecisionFrameSchema, TradeoffResultSchema } from '@prodmind/shared-types';
import { appendStep, updateStatus } from './session.js';

const DECISION_PROMPT = `You are a decision analysis assistant. Analyze the problem and provide structured decision support.

Problem: {problem}

Current step: {stepType}

Provide your analysis in the following format based on the step type:
- hypothesis_eval: List hypotheses with confidence levels and evidence
- risk_eval: Identify risks with severity and mitigation strategies
- option_compare: Compare options with pros and cons
- summary: Provide final recommendation

Be concise and structured.`;

const DECISION_ROLE_BY_STEP: Record<DecisionStep['type'], RoleIdentity> = {
  hypothesis_eval: { roleId: 'solution', roleName: '方案官' },
  risk_eval: { roleId: 'risk', roleName: '风险官' },
  option_compare: { roleId: 'tradeoff', roleName: '权衡官' },
  summary: { roleId: 'verdict', roleName: '裁决官' },
};

export interface DecisionModeOutput {
  roleSet: RoleIdentity[];
  messages: ModeMessage[];
  draftSummary: string;
}

export async function runDecisionStep(
  session: DecisionSessionState,
  stepType: DecisionStep['type'],
  adapter: LLMAdapter
): Promise<DecisionSessionState> {
  const prompt = DECISION_PROMPT
    .replace('{problem}', session.problem)
    .replace('{stepType}', stepType);

  const response = await adapter.streamText([{ role: 'user', content: prompt }], () => {}, undefined, {
    requiredCapabilities: {
      streaming: true,
    },
  });

  const step: DecisionStep = {
    stepId: `step-${session.steps.length + 1}`,
    type: stepType,
    input: prompt,
    output: response,
    timestamp: new Date().toISOString(),
  };

  return appendStep(session, step);
}

export function buildDecisionSummary(session: DecisionSessionState): DecisionSummary {
  const summary: DecisionSummary = {
    hypotheses: [],
    risks: [],
    options: [],
    recommendation: '',
  };

  for (const step of session.steps) {
    if (step.type === 'hypothesis_eval') {
      const hypMatch = step.output.match(/hypothesis:\s*(.+)/gi);
      if (hypMatch) {
        summary.hypotheses.push({
          statement: hypMatch[0].replace(/hypothesis:\s*/i, ''),
          confidence: 'medium',
          evidence: [],
        });
      }
      continue;
    }

    if (step.type === 'risk_eval') {
      const riskMatch = step.output.match(/risk:\s*(.+)/gi);
      if (riskMatch) {
        summary.risks.push({
          description: riskMatch[0].replace(/risk:\s*/i, ''),
          severity: 'medium',
        });
      }
      continue;
    }

    if (step.type === 'option_compare') {
      const optionMatch = step.output.match(/option:\s*(.+)/gi);
      if (optionMatch) {
        summary.options.push({
          id: `opt-${summary.options.length + 1}`,
          description: optionMatch[0].replace(/option:\s*/i, ''),
          pros: [],
          cons: [],
        });
      }
      continue;
    }

    if (step.type === 'summary') {
      summary.recommendation = step.output;
    }
  }

  return summary;
}

export function buildDecisionModeOutput(session: DecisionSessionState): DecisionModeOutput {
  const summary = buildDecisionSummary(session);
  const messages: ModeMessage[] = session.steps.map((step) => {
    const role = DECISION_ROLE_BY_STEP[step.type];
    return {
      speaker: 'role',
      roleId: role.roleId,
      roleName: role.roleName,
      content: step.output,
      timestamp: step.timestamp,
    };
  });

  const draftSummary = summary.recommendation
    ? `当前建议：${summary.recommendation}`
    : '当前建议仍在整理，请继续补充取舍和约束。';

  return {
    roleSet: Object.values(DECISION_ROLE_BY_STEP),
    messages,
    draftSummary,
  };
}

export async function runDecisionFrameGeneration(
  adapter: LLMAdapter,
  problem: string
): Promise<DecisionFrame> {
  const prompt = `You are a decision analysis assistant. Analyze the following problem and generate a structured decision frame.
Break it down into:
- options: Possible choices
- criteria: Metrics to evaluate options
- constraints: Hard requirements or limits
- assumptions: Implicit beliefs forming the context

Problem: ${problem}`;

  const response = await adapter.generateStructured(
    [{ role: 'user', content: prompt }],
    DecisionFrameSchema,
    undefined,
    {
      requiredCapabilities: {
        structuredOutput: true,
      },
    }
  );

  return response;
}

export async function runTradeoffAnalysis(
  adapter: LLMAdapter,
  frame: DecisionFrame,
  priorities: string
): Promise<TradeoffResult> {
  const prompt = `You are a decision tradeoff analyst. Compare the options based on the decision frame and user priorities.

Decision Frame:
Options: ${frame.options.join(', ')}
Criteria: ${frame.criteria.join(', ')}
Constraints: ${frame.constraints.join(', ')}
Assumptions: ${frame.assumptions.join(', ')}

User Priorities/Adjustments:
${priorities}

Compare them, highlighting pros/cons against criteria, then identify winners and losers.`;

  const response = await adapter.generateStructured(
    [{ role: 'user', content: prompt }],
    TradeoffResultSchema,
    undefined,
    {
      requiredCapabilities: {
        structuredOutput: true,
      },
    }
  );

  return response;
}

export async function runRecommendationSynthesis(
  adapter: LLMAdapter,
  frame: DecisionFrame,
  tradeoff: TradeoffResult
): Promise<string> {
  const prompt = `You are a decision judge. Give a clear final recommendation based on the frame and trade-off analysis.

Options: ${frame.options.join(', ')}
Tradeoff Winners: ${tradeoff.winners.join(', ')}
Tradeoff Losers: ${tradeoff.losers.join(', ')}
Analysis Notes: ${JSON.stringify(tradeoff.analysis)}

Write a concise, decisive recommendation combining the best path.`;

  const response = await adapter.streamText([{ role: 'user', content: prompt }], () => {}, undefined, {
    requiredCapabilities: {
      streaming: true,
    },
  });

  return response;
}

// Backward-compatible wrapper: keep old single-pass behavior while phased APIs are integrated.
export async function runDecisionOrchestration(
  session: DecisionSessionState,
  adapter: LLMAdapter
): Promise<DecisionSessionState> {
  let current = session;

  const steps: DecisionStep['type'][] = [
    'hypothesis_eval',
    'risk_eval',
    'option_compare',
    'summary',
  ];

  for (const stepType of steps) {
    current = await runDecisionStep(current, stepType, adapter);
  }

  return updateStatus(current, 'completed');
}

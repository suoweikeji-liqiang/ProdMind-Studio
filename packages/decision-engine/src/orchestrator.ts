import type { LLMAdapter } from '@prodmind/llm-adapter';
import type { DecisionSessionState, DecisionStep, DecisionSummary } from '@prodmind/shared-types';
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
    } else if (step.type === 'risk_eval') {
      const riskMatch = step.output.match(/risk:\s*(.+)/gi);
      if (riskMatch) {
        summary.risks.push({
          description: riskMatch[0].replace(/risk:\s*/i, ''),
          severity: 'medium',
        });
      }
    } else if (step.type === 'option_compare') {
      const optMatch = step.output.match(/option:\s*(.+)/gi);
      if (optMatch) {
        summary.options.push({
          id: `opt-${summary.options.length + 1}`,
          description: optMatch[0].replace(/option:\s*/i, ''),
          pros: [],
          cons: [],
        });
      }
    } else if (step.type === 'summary') {
      summary.recommendation = step.output;
    }
  }

  return summary;
}

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

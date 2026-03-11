import { describe, expect, it } from 'vitest';
import type { ProviderCapabilityProfile, ProviderExecutionSummary } from '@prodmind/shared-types';
import type { LLMAdapter, LLMMessage, LLMRequestOptions } from '@prodmind/llm-adapter';
import { createDecisionSession } from './session.js';
import { buildDecisionModeOutput, runDecisionOrchestration, runDecisionStep } from './orchestrator.js';

function createRecordingAdapter() {
  let lastOptions: LLMRequestOptions | undefined;

  const metadata: ProviderCapabilityProfile = {
    providerName: 'fake',
    modelName: 'fake-default',
    enabled: true,
    capabilities: {
      structuredOutput: true,
      streaming: true,
    },
    reliability: {
      timeoutMs: 100,
      maxRetries: 0,
      fallbackEligible: false,
    },
    usage: {
      tokenAccounting: 'unavailable',
      costAccounting: 'unavailable',
    },
  };

  const adapter: LLMAdapter = {
    async streamText(
      _messages: LLMMessage[],
      _onToken: (token: string) => void,
      _correlation,
      options
    ): Promise<string> {
      lastOptions = options;
      return 'decision output';
    },
    async generateStructured(): Promise<never> {
      throw new Error('not used');
    },
    getMetadata(): ProviderCapabilityProfile {
      return metadata;
    },
    getExecutionLog(): ProviderExecutionSummary[] {
      return [];
    },
    clearExecutionLog(): void {
      lastOptions = undefined;
    },
  };

  return {
    adapter,
    getLastOptions: () => lastOptions,
  };
}

describe('Decision Capability Requirements', () => {
  it('requests streaming support for decision steps', async () => {
    const recording = createRecordingAdapter();
    const session = createDecisionSession('choose a stack');

    await runDecisionStep(session, 'summary', recording.adapter);

    expect(recording.getLastOptions()?.requiredCapabilities?.streaming).toBe(true);
  });

  it('maps decision steps to visible role output and draft summary', () => {
    const session = {
      ...createDecisionSession('choose a stack'),
      status: 'completed' as const,
      steps: [
        {
          stepId: 'step-1',
          type: 'hypothesis_eval' as const,
          input: 'input-1',
          output: 'hypothesis: operators need a clearer recommendation trail',
          timestamp: '2026-03-10T00:00:00.000Z',
        },
        {
          stepId: 'step-2',
          type: 'risk_eval' as const,
          input: 'input-2',
          output: 'risk: mode switching may confuse first-time users',
          timestamp: '2026-03-10T00:00:01.000Z',
        },
        {
          stepId: 'step-3',
          type: 'option_compare' as const,
          input: 'input-3',
          output: 'option: keep one session shell and isolate mode-local history',
          timestamp: '2026-03-10T00:00:02.000Z',
        },
        {
          stepId: 'step-4',
          type: 'summary' as const,
          input: 'input-4',
          output: 'Proceed with a session-first shell and visible mode-specific panels.',
          timestamp: '2026-03-10T00:00:03.000Z',
        },
      ],
    };

    const view = buildDecisionModeOutput(session);

    expect(view.roleSet.map((role) => role.roleId)).toEqual(['solution', 'risk', 'tradeoff', 'verdict']);
    expect(view.messages).toHaveLength(4);
    expect(view.messages[0]?.roleId).toBe('solution');
    expect(view.messages[3]?.roleId).toBe('verdict');
    expect(view.draftSummary).toContain('Proceed with a session-first shell');
  });

  it('keeps legacy orchestration contract with four decision steps', async () => {
    const recording = createRecordingAdapter();
    const session = createDecisionSession('choose a stack');

    const completed = await runDecisionOrchestration(session, recording.adapter);

    expect(completed.status).toBe('completed');
    expect(completed.steps.map((step) => step.type)).toEqual([
      'hypothesis_eval',
      'risk_eval',
      'option_compare',
      'summary',
    ]);
    expect(completed.steps).toHaveLength(4);
  });
});

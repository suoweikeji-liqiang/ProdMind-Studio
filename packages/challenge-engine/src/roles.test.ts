import { describe, expect, it } from 'vitest';
import type { ProviderCapabilityProfile, ProviderExecutionSummary } from '@prodmind/shared-types';
import type { LLMAdapter, LLMMessage, LLMRequestOptions } from '@prodmind/llm-adapter';
import { callRole } from './roles.js';

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
      return 'ok';
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

describe('Role Capability Requirements', () => {
  it('requests streaming support for role calls', async () => {
    const recording = createRecordingAdapter();

    await callRole(recording.adapter, 'architect', 'test idea');

    expect(recording.getLastOptions()?.requiredCapabilities?.streaming).toBe(true);
  });
});

import type {
  ProviderCapabilityProfile,
  ProviderExecutionSummary,
} from '@prodmind/shared-types';
import type { LLMAdapter } from '@prodmind/llm-adapter';
import { createRuntimeAdapter } from '@prodmind/llm-adapter';
import { loadProviderConfig } from '../../config.js';
import {
  CHALLENGE_FAKE_RESPONSE,
  DECISION_FAKE_FRAME,
  DECISION_FAKE_RESPONSE,
  DECISION_FAKE_TRADEOFF,
} from './constants.js';

export function createChallengeAdapter() {
  return createRuntimeAdapter(
    loadProviderConfig(),
    { default: CHALLENGE_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 100,
            outputTokens: 80,
            totalTokens: 180,
          },
        },
      },
    }
  );
}

export function createDecisionAdapter(): LLMAdapter {
  const config = loadProviderConfig();
  if (config.mode === 'fake') {
    const metadata: ProviderCapabilityProfile = {
      providerName: 'fake',
      modelName: 'fake-decision',
      enabled: true,
      capabilities: {
        structuredOutput: true,
        streaming: true,
      },
      reliability: {
        defaultTimeoutMs: 100,
        maxTimeoutMs: 100,
        defaultMaxRetries: 0,
        maxRetriesLimit: 0,
        fallbackEligible: false,
        fallbackMode: 'disabled',
      },
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
    };

    return {
      async streamText(messages, onToken) {
        const prompt = messages[messages.length - 1]?.content ?? '';
        const response = prompt.includes('decision judge')
          ? DECISION_FAKE_RESPONSE
          : 'Decision step complete.';
        for (const token of response) {
          onToken(token);
        }
        return response;
      },
      async generateStructured(messages, schema) {
        const prompt = messages[messages.length - 1]?.content ?? '';
        const payload = prompt.includes('structured decision frame')
          ? DECISION_FAKE_FRAME
          : DECISION_FAKE_TRADEOFF;
        return schema.parse(payload);
      },
      getMetadata() {
        return metadata;
      },
      getExecutionLog(): ProviderExecutionSummary[] {
        return [];
      },
      clearExecutionLog(): void {},
    };
  }

  return createRuntimeAdapter(
    config,
    { default: DECISION_FAKE_RESPONSE },
    {
      usage: {
        tokenAccounting: 'estimated',
        costAccounting: 'unavailable',
      },
      behavior: {
        streamText: {
          usage: {
            tokenAvailability: 'estimated',
            inputTokens: 90,
            outputTokens: 60,
            totalTokens: 150,
          },
        },
      },
    }
  );
}

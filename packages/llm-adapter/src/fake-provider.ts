import type { z } from 'zod';
import type { ProviderCapabilityProfile, ProviderUsageSummary } from '@prodmind/shared-types';
import type { LLMAdapter, LLMMessage } from './types.js';
import { createAdapterFromBackends } from './provider.js';

type FakeOperationBehavior = {
  failTimes?: number;
  errorType?: 'rate_limit' | 'auth' | 'network' | 'invalid_request' | 'model_error';
  delayMs?: number;
  usage?: Partial<ProviderUsageSummary>;
};

export interface FakeProviderOptions {
  providerName?: string;
  modelName?: string;
  capabilities?: Partial<ProviderCapabilityProfile['capabilities']>;
  reliability?: Partial<ProviderCapabilityProfile['reliability']>;
  usage?: Partial<ProviderCapabilityProfile['usage']>;
  behavior?: {
    streamText?: FakeOperationBehavior;
    generateStructured?: FakeOperationBehavior;
  };
  fallback?: LLMAdapter;
}

function defaultProfile(options: FakeProviderOptions = {}): ProviderCapabilityProfile {
  return {
    providerName: options.providerName ?? 'fake',
    modelName: options.modelName ?? 'fake-default',
    enabled: true,
    capabilities: {
      structuredOutput: options.capabilities?.structuredOutput ?? true,
      streaming: options.capabilities?.streaming ?? true,
    },
    reliability: {
      timeoutMs: options.reliability?.timeoutMs ?? 100,
      maxRetries: options.reliability?.maxRetries ?? 1,
      fallbackEligible: options.reliability?.fallbackEligible ?? Boolean(options.fallback),
      fallbackProvider: options.reliability?.fallbackProvider,
      fallbackModel: options.reliability?.fallbackModel,
    },
    usage: {
      tokenAccounting: options.usage?.tokenAccounting ?? 'estimated',
      costAccounting: options.usage?.costAccounting ?? 'unavailable',
      pricePerMillionInputTokensUsd: options.usage?.pricePerMillionInputTokensUsd,
      pricePerMillionOutputTokensUsd: options.usage?.pricePerMillionOutputTokensUsd,
    },
  };
}

function createFakeError(type: NonNullable<FakeOperationBehavior['errorType']>): Error & { status?: number; code?: string; type?: string } {
  const error = new Error(`fake ${type} failure`) as Error & { status?: number; code?: string; type?: string };

  if (type === 'rate_limit') {
    error.status = 429;
  } else if (type === 'auth') {
    error.status = 401;
  } else if (type === 'network') {
    error.code = 'ECONNREFUSED';
  } else if (type === 'invalid_request') {
    error.status = 400;
  } else if (type === 'model_error') {
    error.type = 'model_error';
  }

  return error;
}

function keyFor(messages: LLMMessage[]): string {
  return messages[messages.length - 1]?.content ?? 'default';
}

function sleep(delayMs = 0): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
}

export function createFakeProvider(
  responses: Record<string, unknown>,
  options: FakeProviderOptions = {}
): LLMAdapter {
  const profile = defaultProfile(options);
  let streamFailuresRemaining = options.behavior?.streamText?.failTimes ?? 0;
  let structuredFailuresRemaining = options.behavior?.generateStructured?.failTimes ?? 0;

  const backend = {
    profile,

    async streamText(messages: LLMMessage[], onToken: (token: string) => void) {
      await sleep(options.behavior?.streamText?.delayMs);

      if (streamFailuresRemaining > 0) {
        streamFailuresRemaining -= 1;
        throw createFakeError(options.behavior?.streamText?.errorType ?? 'network');
      }

      const response = String(responses[keyFor(messages)] ?? responses.default ?? 'fake response');

      for (const char of response) {
        onToken(char);
      }

      return {
        text: response,
        usage: options.behavior?.streamText?.usage,
      };
    },

    async generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>) {
      await sleep(options.behavior?.generateStructured?.delayMs);

      if (structuredFailuresRemaining > 0) {
        structuredFailuresRemaining -= 1;
        throw createFakeError(options.behavior?.generateStructured?.errorType ?? 'network');
      }

      const response = responses[keyFor(messages)] ?? responses.default;
      if (typeof response === 'undefined') {
        throw createFakeError('model_error');
      }

      return {
        text: typeof response === 'string' ? response : JSON.stringify(response),
        data: schema.parse(response),
        usage: options.behavior?.generateStructured?.usage,
      };
    },
  };

  const fallbackBackend = options.fallback
    ? {
        profile: options.fallback.getMetadata(),
        streamText: async (messages: LLMMessage[], onToken: (token: string) => void) => ({
          text: await options.fallback!.streamText(messages, onToken),
          usage: options.fallback!.getExecutionLog().at(-1)?.usage,
        }),
        generateStructured: async <T>(messages: LLMMessage[], schema: z.ZodSchema<T>) => {
          const data = await options.fallback!.generateStructured(messages, schema);
          return {
            text: JSON.stringify(data),
            data,
            usage: options.fallback!.getExecutionLog().at(-1)?.usage,
          };
        },
      }
    : undefined;

  return createAdapterFromBackends(backend, fallbackBackend);
}

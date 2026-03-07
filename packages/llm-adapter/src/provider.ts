import { streamText as sdkStreamText, generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { jsonrepair } from 'jsonrepair';
import type { LanguageModel, CoreMessage } from 'ai';
import type { z } from 'zod';
import type { CorrelationContext } from '@prodmind/shared-types';
import type { ProviderError, ProviderMetadata } from './types.js';
import { emitProviderStart, emitProviderEnd, emitProviderError } from './observability.js';

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMAdapter {
  streamText(messages: LLMMessage[], onToken: (token: string) => void, correlation?: CorrelationContext): Promise<string>;
  generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>, correlation?: CorrelationContext): Promise<T>;
  getMetadata(): ProviderMetadata;
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  modelId: string;
  baseURL?: string;
}

function normalizeError(error: unknown): ProviderError {
  const err = error as any;

  if (err?.status === 429 || err?.message?.includes('rate limit')) {
    return { type: 'rate_limit', message: 'Rate limit exceeded', retryable: true, originalError: error };
  }
  if (err?.status === 401 || err?.status === 403) {
    return { type: 'auth', message: 'Authentication failed', retryable: false, originalError: error };
  }
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT') {
    return { type: 'network', message: 'Network error', retryable: true, originalError: error };
  }
  if (err?.status === 400) {
    return { type: 'invalid_request', message: 'Invalid request', retryable: false, originalError: error };
  }

  return { type: 'unknown', message: err?.message || 'Unknown error', retryable: false, originalError: error };
}

export function createLLMAdapter(config: LLMConfig): LLMAdapter {

  let model: LanguageModel;

  if (config.provider === 'openai') {
    const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = openai(config.modelId);
  } else if (config.provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = anthropic(config.modelId);
  } else {
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  return {
    async streamText(messages: LLMMessage[], onToken: (token: string) => void, correlation?: CorrelationContext): Promise<string> {
      const startTime = Date.now();
      if (correlation) {
        emitProviderStart(correlation, config.provider, config.modelId, 'streamText');
      }

      try {
        const result = await sdkStreamText({
          model,
          messages: messages as CoreMessage[],
        });

        let fullText = '';
        for await (const delta of result.textStream) {
          fullText += delta;
          onToken(delta);
        }

        if (correlation) {
          emitProviderEnd(correlation, config.provider, config.modelId, 'streamText', Date.now() - startTime);
        }

        return fullText;
      } catch (error) {
        const normalized = normalizeError(error);
        if (correlation) {
          emitProviderError(correlation, config.provider, config.modelId, 'streamText', Date.now() - startTime, normalized.type, normalized.retryable);
        }
        throw new Error(`[${normalized.type}] ${normalized.message}`);
      }
    },

    async generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>, correlation?: CorrelationContext): Promise<T> {
      const startTime = Date.now();
      if (correlation) {
        emitProviderStart(correlation, config.provider, config.modelId, 'generateStructured');
      }

      try {
        const result = await generateText({
          model,
          messages: messages as CoreMessage[],
          experimental_output: Output.object({ schema }),
        });

        if (correlation) {
          emitProviderEnd(correlation, config.provider, config.modelId, 'generateStructured', Date.now() - startTime);
        }

        return result.experimental_output as T;
      } catch (error) {
        try {
          const rawResult = await generateText({
            model,
            messages: messages as CoreMessage[],
          });

          const rawText = rawResult.text;
          const stripped = rawText.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
          const repaired = jsonrepair(stripped);
          const parsed = JSON.parse(repaired) as unknown;

          const result = schema.parse(parsed);

          if (correlation) {
            emitProviderEnd(correlation, config.provider, config.modelId, 'generateStructured', Date.now() - startTime);
          }

          return result;
        } catch (fallbackError) {
          const normalized = normalizeError(error);
          if (correlation) {
            emitProviderError(correlation, config.provider, config.modelId, 'generateStructured', Date.now() - startTime, normalized.type, normalized.retryable);
          }
          throw new Error(`[${normalized.type}] ${normalized.message}`);
        }
      }
    },

    getMetadata(): ProviderMetadata {
      return {
        name: config.provider,
        version: '1.0.0',
        capabilities: {
          streaming: true,
          structuredOutput: true,
        },
      };
    },
  };
}

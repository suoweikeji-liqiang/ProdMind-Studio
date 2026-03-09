import type { LLMAdapter, LLMConfig, LLMPricingConfig } from './types.js';
import { createFakeProvider, type FakeProviderOptions } from './fake-provider.js';
import { createLLMAdapter } from './provider.js';
import type { ProviderFallbackMode } from '@prodmind/shared-types';

export interface RuntimeProviderConfig {
  mode: 'fake' | 'real';
  type?: 'openai' | 'anthropic';
  apiKey?: string;
  modelId?: string;
  timeoutMs?: number;
  maxTimeoutMs?: number;
  maxRetries?: number;
  maxRetriesLimit?: number;
  fallbackMode?: ProviderFallbackMode;
  pricing?: LLMPricingConfig;
  fallback?: {
    type: 'openai' | 'anthropic';
    apiKey?: string;
    modelId?: string;
    timeoutMs?: number;
    maxTimeoutMs?: number;
    maxRetries?: number;
    maxRetriesLimit?: number;
    fallbackMode?: ProviderFallbackMode;
    pricing?: LLMPricingConfig;
  };
}

export function createRuntimeAdapter(
  config: RuntimeProviderConfig,
  fakeResponses: Record<string, unknown>,
  fakeOptions?: FakeProviderOptions
): LLMAdapter {
  if (config.mode === 'fake') {
    return createFakeProvider(fakeResponses, fakeOptions);
  }

  if (!config.type || !config.apiKey || !config.modelId) {
    throw new Error('Real provider mode requires provider type, API key, and model ID');
  }

  const adapterConfig: LLMConfig = {
    provider: config.type,
    apiKey: config.apiKey,
    modelId: config.modelId,
    timeoutMs: config.timeoutMs,
    maxTimeoutMs: config.maxTimeoutMs,
    maxRetries: config.maxRetries,
    maxRetriesLimit: config.maxRetriesLimit,
    fallbackMode: config.fallbackMode,
    pricing: config.pricing,
    fallback: config.fallback && config.fallback.apiKey && config.fallback.modelId
      ? {
          provider: config.fallback.type,
          apiKey: config.fallback.apiKey,
          modelId: config.fallback.modelId,
          timeoutMs: config.fallback.timeoutMs,
          maxTimeoutMs: config.fallback.maxTimeoutMs,
          maxRetries: config.fallback.maxRetries,
          maxRetriesLimit: config.fallback.maxRetriesLimit,
          fallbackMode: config.fallback.fallbackMode,
          pricing: config.fallback.pricing,
        }
      : undefined,
  };

  return createLLMAdapter(adapterConfig);
}

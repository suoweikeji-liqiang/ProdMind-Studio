import type { LLMAdapter, LLMConfig, LLMPricingConfig } from './types.js';
import { createFakeProvider, type FakeProviderOptions } from './fake-provider.js';
import { createLLMAdapter } from './provider.js';

export interface RuntimeProviderConfig {
  mode: 'fake' | 'real';
  type?: 'openai' | 'anthropic';
  apiKey?: string;
  modelId?: string;
  timeoutMs?: number;
  maxRetries?: number;
  pricing?: LLMPricingConfig;
  fallback?: {
    type: 'openai' | 'anthropic';
    apiKey?: string;
    modelId?: string;
    timeoutMs?: number;
    maxRetries?: number;
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
    maxRetries: config.maxRetries,
    pricing: config.pricing,
    fallback: config.fallback && config.fallback.apiKey && config.fallback.modelId
      ? {
          provider: config.fallback.type,
          apiKey: config.fallback.apiKey,
          modelId: config.fallback.modelId,
          timeoutMs: config.fallback.timeoutMs,
          maxRetries: config.fallback.maxRetries,
          pricing: config.fallback.pricing,
        }
      : undefined,
  };

  return createLLMAdapter(adapterConfig);
}

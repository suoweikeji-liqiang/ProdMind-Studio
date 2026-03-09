import type { z } from 'zod';
import type {
  CorrelationContext,
  ProviderFallbackMode,
  ProviderCapabilityProfile,
  ProviderExecutionSummary,
  ProviderSelectionRequirement,
} from '@prodmind/shared-types';

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type LLMProvider = 'fake' | 'openai' | 'anthropic';

export type ProviderErrorType =
  | 'rate_limit'
  | 'auth'
  | 'network'
  | 'invalid_request'
  | 'model_error'
  | 'timeout'
  | 'capability_mismatch'
  | 'retry_exhausted'
  | 'fallback_failed'
  | 'fallback_not_configured'
  | 'unknown';

export type ProviderError = {
  type: ProviderErrorType;
  message: string;
  retryable: boolean;
  originalError?: unknown;
};

export interface LLMRequestOptions {
  requiredCapabilities?: ProviderSelectionRequirement;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LLMAdapter {
  streamText(
    messages: LLMMessage[],
    onToken: (token: string) => void,
    correlation?: CorrelationContext,
    options?: LLMRequestOptions
  ): Promise<string>;
  generateStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    correlation?: CorrelationContext,
    options?: LLMRequestOptions
  ): Promise<T>;
  getMetadata(): ProviderCapabilityProfile;
  getExecutionLog(): ProviderExecutionSummary[];
  clearExecutionLog(): void;
}

export interface LLMPricingConfig {
  inputPerMillionUsd?: number;
  outputPerMillionUsd?: number;
}

export interface LLMConfig {
  provider: Exclude<LLMProvider, 'fake'>;
  apiKey: string;
  name?: string;
  modelId: string;
  baseURL?: string;
  timeoutMs?: number;
  maxTimeoutMs?: number;
  maxRetries?: number;
  maxRetriesLimit?: number;
  fallbackMode?: ProviderFallbackMode;
  pricing?: LLMPricingConfig;
  fallback?: Omit<LLMConfig, 'fallback'>;
}

export type ProviderMetadata = ProviderCapabilityProfile;

export class LLMProviderError extends Error {
  readonly normalized: ProviderError;
  readonly execution?: ProviderExecutionSummary;

  constructor(normalized: ProviderError, execution?: ProviderExecutionSummary) {
    super(`[${normalized.type}] ${normalized.message}`);
    this.name = 'LLMProviderError';
    this.normalized = normalized;
    this.execution = execution;
  }
}

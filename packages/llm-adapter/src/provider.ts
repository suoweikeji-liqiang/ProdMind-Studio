import { streamText as sdkStreamText, generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { jsonrepair } from 'jsonrepair';
import type { CoreMessage, LanguageModel } from 'ai';
import type {
  CorrelationContext,
  ProviderCapabilityProfile,
  ProviderExecutionSummary,
  ProviderSelectionRequirement,
  ProviderUsageSummary,
} from '@prodmind/shared-types';
import type { z } from 'zod';
import type {
  LLMAdapter,
  LLMConfig,
  LLMMessage,
  LLMRequestOptions,
  ProviderError,
  ProviderMetadata,
} from './types.js';
import { LLMProviderError } from './types.js';
import { emitProviderEnd, emitProviderError, emitProviderStart } from './observability.js';

type UsageAvailability = ProviderUsageSummary['tokenAvailability'];

type RawUsage = Partial<ProviderUsageSummary>;

type BackendTextResult = {
  text: string;
  usage?: RawUsage;
};

type BackendStructuredResult<T> = BackendTextResult & {
  data: T;
};

type ProviderBackend = {
  profile: ProviderCapabilityProfile;
  streamText(
    messages: LLMMessage[],
    onToken: (token: string) => void
  ): Promise<BackendTextResult>;
  generateStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>
  ): Promise<BackendStructuredResult<T>>;
};

type AttemptSuccess<T> = {
  ok: true;
  value: T;
  usage: ProviderUsageSummary;
  attempts: number;
  retriesPerformed: number;
  timeoutCount: number;
  backend: ProviderBackend;
};

type AttemptFailure = {
  ok: false;
  error: ProviderError;
  attempts: number;
  retriesPerformed: number;
  timeoutCount: number;
  backend: ProviderBackend;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 1;

function normalizeError(error: unknown): ProviderError {
  if (error instanceof LLMProviderError) {
    return error.normalized;
  }

  const err = error as Record<string, unknown> | undefined;
  const message = typeof err?.message === 'string' ? err.message : 'Unknown error';
  const status = typeof err?.status === 'number' ? err.status : undefined;
  const code = typeof err?.code === 'string' ? err.code : undefined;
  const type = typeof err?.type === 'string' ? err.type : undefined;
  const name = typeof err?.name === 'string' ? err.name : undefined;

  if (type === 'capability_mismatch') {
    return { type: 'capability_mismatch', message, retryable: false, originalError: error };
  }
  if (type === 'fallback_not_configured') {
    return { type: 'fallback_not_configured', message, retryable: false, originalError: error };
  }
  if (type === 'fallback_failed') {
    return { type: 'fallback_failed', message, retryable: false, originalError: error };
  }
  if (type === 'retry_exhausted') {
    return { type: 'retry_exhausted', message, retryable: false, originalError: error };
  }
  if (type === 'timeout' || name === 'TimeoutError' || code === 'ETIMEDOUT') {
    return { type: 'timeout', message: 'Provider request timed out', retryable: true, originalError: error };
  }
  if (status === 429 || message.toLowerCase().includes('rate limit')) {
    return { type: 'rate_limit', message: 'Rate limit exceeded', retryable: true, originalError: error };
  }
  if (status === 401 || status === 403) {
    return { type: 'auth', message: 'Authentication failed', retryable: false, originalError: error };
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
    return { type: 'network', message: 'Network error', retryable: true, originalError: error };
  }
  if (status === 400) {
    return { type: 'invalid_request', message: 'Invalid request', retryable: false, originalError: error };
  }
  if (type === 'model_error' || name === 'ZodError' || name === 'SyntaxError') {
    return { type: 'model_error', message: 'Provider returned invalid structured output', retryable: false, originalError: error };
  }

  return { type: 'unknown', message, retryable: false, originalError: error };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject({ type: 'timeout', name: 'TimeoutError', message: 'Provider request timed out' });
    }, timeoutMs);

    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function resolveCapabilityMismatch(
  profile: ProviderCapabilityProfile,
  required?: ProviderSelectionRequirement
): ProviderError | null {
  if (!required) {
    return null;
  }

  if (required.streaming && !profile.capabilities.streaming) {
    return {
      type: 'capability_mismatch',
      message: `${profile.providerName}/${profile.modelName} does not support streaming`,
      retryable: false,
    };
  }

  if (required.structuredOutput && !profile.capabilities.structuredOutput) {
    return {
      type: 'capability_mismatch',
      message: `${profile.providerName}/${profile.modelName} does not support structured output`,
      retryable: false,
    };
  }

  return null;
}

function mergeUsage(
  usage: RawUsage | undefined,
  profile: ProviderCapabilityProfile,
  requestCount: number
): ProviderUsageSummary {
  const inputTokens = usage?.inputTokens;
  const outputTokens = usage?.outputTokens;
  const totalTokens = usage?.totalTokens ?? (
    typeof inputTokens === 'number' || typeof outputTokens === 'number'
      ? (inputTokens ?? 0) + (outputTokens ?? 0)
      : undefined
  );

  const tokenAvailability = usage?.tokenAvailability
    ?? inferTokenAvailability(profile.usage.tokenAccounting, inputTokens, outputTokens, totalTokens);

  const actualCostUsd = usage?.actualCostUsd;
  const estimatedCostUsd = usage?.estimatedCostUsd ?? estimateCostUsd(profile, inputTokens, outputTokens);
  const costAvailability = usage?.costAvailability
    ?? inferCostAvailability(profile.usage.costAccounting, actualCostUsd, estimatedCostUsd);

  return {
    requestCount,
    tokenAvailability,
    inputTokens,
    outputTokens,
    totalTokens,
    costAvailability,
    estimatedCostUsd,
    actualCostUsd,
  };
}

function inferTokenAvailability(
  accounting: ProviderCapabilityProfile['usage']['tokenAccounting'],
  inputTokens?: number,
  outputTokens?: number,
  totalTokens?: number
): UsageAvailability {
  if (
    typeof inputTokens === 'number'
    || typeof outputTokens === 'number'
    || typeof totalTokens === 'number'
  ) {
    return accounting === 'estimated' ? 'estimated' : 'available';
  }
  return accounting === 'estimated' ? 'estimated' : 'unavailable';
}

function inferCostAvailability(
  accounting: ProviderCapabilityProfile['usage']['costAccounting'],
  actualCostUsd?: number,
  estimatedCostUsd?: number
): ProviderUsageSummary['costAvailability'] {
  if (typeof actualCostUsd === 'number') {
    return 'available';
  }
  if (typeof estimatedCostUsd === 'number') {
    return 'estimated';
  }
  return accounting === 'estimated' ? 'estimated' : 'unavailable';
}

function estimateCostUsd(
  profile: ProviderCapabilityProfile,
  inputTokens?: number,
  outputTokens?: number
): number | undefined {
  const inputRate = profile.usage.pricePerMillionInputTokensUsd;
  const outputRate = profile.usage.pricePerMillionOutputTokensUsd;

  if (
    typeof inputTokens !== 'number'
    && typeof outputTokens !== 'number'
  ) {
    return undefined;
  }

  if (typeof inputRate !== 'number' && typeof outputRate !== 'number') {
    return undefined;
  }

  const inputCost = typeof inputRate === 'number' ? ((inputTokens ?? 0) / 1_000_000) * inputRate : 0;
  const outputCost = typeof outputRate === 'number' ? ((outputTokens ?? 0) / 1_000_000) * outputRate : 0;
  return inputCost + outputCost;
}

function buildRetryExhaustedError(lastError: ProviderError, attempts: number): ProviderError {
  return {
    type: 'retry_exhausted',
    message: `Retry limit exhausted after ${attempts} attempts: ${lastError.message}`,
    retryable: false,
    originalError: lastError.originalError,
  };
}

function shouldUseFallback(error: ProviderError | null, fallback?: ProviderBackend): boolean {
  if (!fallback || !error) {
    return false;
  }

  return [
    'capability_mismatch',
    'retry_exhausted',
    'timeout',
    'network',
    'rate_limit',
  ].includes(error.type);
}

function toError(normalized: ProviderError, execution: ProviderExecutionSummary): LLMProviderError {
  return new LLMProviderError(normalized, execution);
}

function extractUsageFromUnknown(candidate: unknown): RawUsage | undefined {
  const value = candidate as Record<string, any> | undefined;
  if (!value) {
    return undefined;
  }

  const usage = value.usage ?? value.providerMetadata?.usage ?? value.response?.usage;
  if (!usage || typeof usage !== 'object') {
    return undefined;
  }

  const inputTokens = typeof usage.inputTokens === 'number'
    ? usage.inputTokens
    : typeof usage.promptTokens === 'number'
      ? usage.promptTokens
      : undefined;
  const outputTokens = typeof usage.outputTokens === 'number'
    ? usage.outputTokens
    : typeof usage.completionTokens === 'number'
      ? usage.completionTokens
      : undefined;
  const totalTokens = typeof usage.totalTokens === 'number' ? usage.totalTokens : undefined;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    tokenAvailability: (
      typeof inputTokens === 'number'
      || typeof outputTokens === 'number'
      || typeof totalTokens === 'number'
    ) ? 'available' : undefined,
  };
}

async function executeAttempt<T>(
  backend: ProviderBackend,
  operation: 'streamText' | 'generateStructured',
  correlation: CorrelationContext | undefined,
  options: LLMRequestOptions | undefined,
  executor: () => Promise<{ value: T; usage?: RawUsage }>
): Promise<AttemptSuccess<T> | AttemptFailure> {
  const mismatch = resolveCapabilityMismatch(backend.profile, options?.requiredCapabilities);
  if (mismatch) {
    return {
      ok: false,
      error: mismatch,
      attempts: 0,
      retriesPerformed: 0,
      timeoutCount: 0,
      backend,
    };
  }

  const timeoutMs = options?.timeoutMs ?? backend.profile.reliability.timeoutMs;
  const maxRetries = options?.maxRetries ?? backend.profile.reliability.maxRetries;

  let attempts = 0;
  let retriesPerformed = 0;
  let timeoutCount = 0;
  let lastError: ProviderError | null = null;

  while (attempts < maxRetries + 1) {
    const startedAt = Date.now();
    attempts += 1;

    if (correlation) {
      emitProviderStart(correlation, backend.profile.providerName, backend.profile.modelName, operation);
    }

    try {
      const result = await withTimeout(executor(), timeoutMs);
      const usage = mergeUsage(result.usage, backend.profile, attempts);

      if (correlation) {
        emitProviderEnd(
          correlation,
          backend.profile.providerName,
          backend.profile.modelName,
          operation,
          Date.now() - startedAt,
          usage.totalTokens
        );
      }

      return {
        ok: true,
        value: result.value,
        usage,
        attempts,
        retriesPerformed,
        timeoutCount,
        backend,
      };
    } catch (error) {
      const normalized = normalizeError(error);
      lastError = normalized;

      if (normalized.type === 'timeout') {
        timeoutCount += 1;
      }

      if (correlation) {
        emitProviderError(
          correlation,
          backend.profile.providerName,
          backend.profile.modelName,
          operation,
          Date.now() - startedAt,
          normalized.type,
          normalized.retryable
        );
      }

      if (normalized.retryable && retriesPerformed < maxRetries) {
        retriesPerformed += 1;
        continue;
      }

      return {
        ok: false,
        error: normalized.retryable && attempts > 1
          ? buildRetryExhaustedError(normalized, attempts)
          : normalized,
        attempts,
        retriesPerformed,
        timeoutCount,
        backend,
      };
    }
  }

  return {
    ok: false,
    error: lastError ?? { type: 'unknown', message: 'Unknown provider failure', retryable: false },
    attempts,
    retriesPerformed,
    timeoutCount,
    backend,
  };
}

function buildExecutionSummary(params: {
  operation: 'streamText' | 'generateStructured';
  initial: ProviderCapabilityProfile;
  finalBackend: ProviderBackend;
  attempts: number;
  retriesPerformed: number;
  timeoutCount: number;
  fallbackUsed: boolean;
  failure?: ProviderError;
  usage: ProviderUsageSummary;
  requiredCapabilities?: ProviderSelectionRequirement;
}): ProviderExecutionSummary {
  return {
    operation: params.operation,
    initialProvider: params.initial.providerName,
    initialModel: params.initial.modelName,
    selectedProvider: params.finalBackend.profile.providerName,
    selectedModel: params.finalBackend.profile.modelName,
    attempts: Math.max(params.attempts, 1),
    retriesPerformed: params.retriesPerformed,
    timeoutCount: params.timeoutCount,
    fallbackUsed: params.fallbackUsed,
    fallbackProvider: params.fallbackUsed ? params.finalBackend.profile.providerName : undefined,
    fallbackModel: params.fallbackUsed ? params.finalBackend.profile.modelName : undefined,
    failureType: params.failure?.type,
    failureMessage: params.failure?.message,
    requiredCapabilities: params.requiredCapabilities,
    usage: params.usage,
  };
}

export function createAdapterFromBackends(
  primary: ProviderBackend,
  fallback?: ProviderBackend
): LLMAdapter {
  const executionLog: ProviderExecutionSummary[] = [];

  async function runOperation<T>(
    operation: 'streamText' | 'generateStructured',
    correlation: CorrelationContext | undefined,
    options: LLMRequestOptions | undefined,
    primaryExecutor: () => Promise<{ value: T; usage?: RawUsage }>,
    fallbackExecutor: (() => Promise<{ value: T; usage?: RawUsage }>) | undefined
  ): Promise<T> {
    const primaryResult = await executeAttempt(primary, operation, correlation, options, primaryExecutor);

    if (primaryResult.ok) {
      const summary = buildExecutionSummary({
        operation,
        initial: primary.profile,
        finalBackend: primary,
        attempts: primaryResult.attempts,
        retriesPerformed: primaryResult.retriesPerformed,
        timeoutCount: primaryResult.timeoutCount,
        fallbackUsed: false,
        usage: primaryResult.usage,
        requiredCapabilities: options?.requiredCapabilities,
      });
      executionLog.push(summary);
      return primaryResult.value;
    }

    if (shouldUseFallback(primaryResult.error, fallback) && fallback && fallbackExecutor) {
      const fallbackResult = await executeAttempt(fallback, operation, correlation, options, fallbackExecutor);

      if (fallbackResult.ok) {
        const summary = buildExecutionSummary({
          operation,
          initial: primary.profile,
          finalBackend: fallback,
          attempts: primaryResult.attempts + fallbackResult.attempts,
          retriesPerformed: primaryResult.retriesPerformed + fallbackResult.retriesPerformed,
          timeoutCount: primaryResult.timeoutCount + fallbackResult.timeoutCount,
          fallbackUsed: true,
          usage: {
            ...fallbackResult.usage,
            requestCount: primaryResult.attempts + fallbackResult.usage.requestCount,
          },
          requiredCapabilities: options?.requiredCapabilities,
        });
        executionLog.push(summary);
        return fallbackResult.value;
      }

      const failure: ProviderError = {
        type: 'fallback_failed',
        message: `Fallback provider failed after primary ${primaryResult.error.type}: ${fallbackResult.error.message}`,
        retryable: false,
        originalError: fallbackResult.error.originalError,
      };

      const summary = buildExecutionSummary({
        operation,
        initial: primary.profile,
        finalBackend: fallback,
        attempts: primaryResult.attempts + fallbackResult.attempts,
        retriesPerformed: primaryResult.retriesPerformed + fallbackResult.retriesPerformed,
        timeoutCount: primaryResult.timeoutCount + fallbackResult.timeoutCount,
        fallbackUsed: true,
        failure,
        usage: {
          requestCount: primaryResult.attempts + fallbackResult.attempts,
          tokenAvailability: 'unavailable',
          costAvailability: 'unavailable',
        },
        requiredCapabilities: options?.requiredCapabilities,
      });
      executionLog.push(summary);
      throw toError(failure, summary);
    }

    const summary = buildExecutionSummary({
      operation,
      initial: primary.profile,
      finalBackend: primary,
      attempts: Math.max(primaryResult.attempts, 1),
      retriesPerformed: primaryResult.retriesPerformed,
      timeoutCount: primaryResult.timeoutCount,
      fallbackUsed: false,
      failure: primaryResult.error,
      usage: {
        requestCount: Math.max(primaryResult.attempts, 1),
        tokenAvailability: 'unavailable',
        costAvailability: 'unavailable',
      },
      requiredCapabilities: options?.requiredCapabilities,
    });
    executionLog.push(summary);
    throw toError(primaryResult.error, summary);
  }

  return {
    async streamText(
      messages: LLMMessage[],
      onToken: (token: string) => void,
      correlation?: CorrelationContext,
      options?: LLMRequestOptions
    ): Promise<string> {
      return runOperation(
        'streamText',
        correlation,
        options,
        async () => {
          const result = await primary.streamText(messages, onToken);
          return { value: result.text, usage: result.usage };
        },
        fallback ? async () => {
          const result = await fallback.streamText(messages, onToken);
          return { value: result.text, usage: result.usage };
        } : undefined
      );
    },

    async generateStructured<T>(
      messages: LLMMessage[],
      schema: z.ZodSchema<T>,
      correlation?: CorrelationContext,
      options?: LLMRequestOptions
    ): Promise<T> {
      return runOperation(
        'generateStructured',
        correlation,
        options,
        async () => {
          const result = await primary.generateStructured(messages, schema);
          return { value: result.data, usage: result.usage };
        },
        fallback ? async () => {
          const result = await fallback.generateStructured(messages, schema);
          return { value: result.data, usage: result.usage };
        } : undefined
      );
    },

    getMetadata(): ProviderMetadata {
      return primary.profile;
    },

    getExecutionLog(): ProviderExecutionSummary[] {
      return [...executionLog];
    },

    clearExecutionLog(): void {
      executionLog.length = 0;
    },
  };
}

function createRealProviderProfile(config: LLMConfig, fallbackConfigured: boolean): ProviderCapabilityProfile {
  return {
    providerName: config.provider,
    modelName: config.modelId,
    enabled: true,
    capabilities: {
      structuredOutput: true,
      streaming: true,
    },
    reliability: {
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      fallbackEligible: fallbackConfigured,
      fallbackProvider: config.fallback?.provider,
      fallbackModel: config.fallback?.modelId,
    },
    usage: {
      tokenAccounting: 'provider',
      costAccounting: config.pricing ? 'estimated' : 'unavailable',
      pricePerMillionInputTokensUsd: config.pricing?.inputPerMillionUsd,
      pricePerMillionOutputTokensUsd: config.pricing?.outputPerMillionUsd,
    },
  };
}

function createLanguageModel(config: LLMConfig): LanguageModel {
  if (config.provider === 'openai') {
    const openai = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    return openai(config.modelId);
  }

  const anthropic = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
  return anthropic(config.modelId);
}

function createRealProviderBackend(config: LLMConfig, fallbackConfigured: boolean): ProviderBackend {
  const model = createLanguageModel(config);
  const profile = createRealProviderProfile(config, fallbackConfigured);

  return {
    profile,

    async streamText(messages: LLMMessage[], onToken: (token: string) => void): Promise<BackendTextResult> {
      const result = await sdkStreamText({
        model,
        messages: messages as CoreMessage[],
      });

      let fullText = '';
      for await (const delta of result.textStream) {
        fullText += delta;
        onToken(delta);
      }

      return {
        text: fullText,
        usage: extractUsageFromUnknown(result),
      };
    },

    async generateStructured<T>(messages: LLMMessage[], schema: z.ZodSchema<T>): Promise<BackendStructuredResult<T>> {
      try {
        const result = await generateText({
          model,
          messages: messages as CoreMessage[],
          experimental_output: Output.object({ schema }),
        });

        return {
          text: result.text,
          data: result.experimental_output as T,
          usage: extractUsageFromUnknown(result),
        };
      } catch (_structuredError) {
        try {
          const rawResult = await generateText({
            model,
            messages: messages as CoreMessage[],
          });

          const rawText = rawResult.text;
          const stripped = rawText.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
          const repaired = jsonrepair(stripped);
          const parsed = JSON.parse(repaired) as unknown;

          return {
            text: rawText,
            data: schema.parse(parsed),
            usage: extractUsageFromUnknown(rawResult),
          };
        } catch (fallbackError) {
          throw {
            type: 'model_error',
            message: fallbackError instanceof Error ? fallbackError.message : 'Structured output parse failed',
          };
        }
      }
    },
  };
}

export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  const primary = createRealProviderBackend(config, Boolean(config.fallback));
  const fallback = config.fallback
    ? createRealProviderBackend(config.fallback, false)
    : undefined;
  return createAdapterFromBackends(primary, fallback);
}

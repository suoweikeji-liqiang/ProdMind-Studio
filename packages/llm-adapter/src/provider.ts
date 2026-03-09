import { streamText as sdkStreamText, generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { jsonrepair } from 'jsonrepair';
import type { CoreMessage, LanguageModel } from 'ai';
import type {
  CorrelationContext,
  ProviderCapabilityProfile,
  ProviderExecutionSummary,
  ProviderFallbackMode,
  ProviderPolicySnapshot,
  ProviderRouteCandidate,
  ProviderRouteResolution,
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

type RouteSelection =
  | {
      ok: true;
      selectedBackend: ProviderBackend;
      fallbackBackend?: ProviderBackend;
      fallbackUsed: boolean;
      routeResolution: ProviderRouteResolution;
    }
  | {
      ok: false;
      error: ProviderError;
      routeResolution: ProviderRouteResolution;
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

function sanitizePositiveInt(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.floor(value as number);
  return normalized > 0 ? normalized : undefined;
}

function sanitizeNonNegativeInt(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.floor(value as number);
  return normalized >= 0 ? normalized : undefined;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function resolveReliabilityBounds(profile: ProviderCapabilityProfile['reliability']): {
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
  defaultMaxRetries: number;
  maxRetriesLimit: number;
  fallbackMode: ProviderFallbackMode;
} {
  const defaultTimeoutMs = profile.defaultTimeoutMs ?? profile.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxTimeoutMs = profile.maxTimeoutMs ?? defaultTimeoutMs;
  const defaultMaxRetries = profile.defaultMaxRetries ?? profile.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxRetriesLimit = profile.maxRetriesLimit ?? defaultMaxRetries;
  const fallbackMode = profile.fallbackMode ?? (profile.fallbackEligible ? 'explicit' : 'disabled');

  return {
    defaultTimeoutMs,
    maxTimeoutMs,
    defaultMaxRetries,
    maxRetriesLimit,
    fallbackMode,
  };
}

function isExplicitFallbackMode(mode: ProviderFallbackMode): boolean {
  return mode === 'explicit';
}

function canUseFallback(backend: ProviderBackend | undefined): boolean {
  if (!backend) {
    return false;
  }

  const bounds = resolveReliabilityBounds(backend.profile.reliability);

  return backend.profile.reliability.fallbackEligible
    && isExplicitFallbackMode(bounds.fallbackMode);
}

function buildRouteCandidate(
  backend: ProviderBackend,
  routeRole: ProviderRouteCandidate['routeRole']
): ProviderRouteCandidate {
  return {
    providerName: backend.profile.providerName,
    modelName: backend.profile.modelName,
    routeRole,
    enabled: backend.profile.enabled,
    fallbackEligible: backend.profile.reliability.fallbackEligible,
  };
}

function buildPolicySnapshot(
  backend: ProviderBackend,
  options: LLMRequestOptions | undefined
): ProviderPolicySnapshot {
  const requestedTimeoutMs = sanitizePositiveInt(options?.timeoutMs);
  const requestedMaxRetries = sanitizeNonNegativeInt(options?.maxRetries);
  const reliability = resolveReliabilityBounds(backend.profile.reliability);

  return {
    timeoutMs: clamp(
      requestedTimeoutMs ?? reliability.defaultTimeoutMs,
      1,
      reliability.maxTimeoutMs
    ),
    maxRetries: clamp(
      requestedMaxRetries ?? reliability.defaultMaxRetries,
      0,
      reliability.maxRetriesLimit
    ),
    fallbackMode: reliability.fallbackMode,
  };
}

function buildRouteResolutionBase(
  primary: ProviderBackend,
  fallback: ProviderBackend | undefined,
  requiredCapabilities: ProviderSelectionRequirement | undefined
): ProviderRouteResolution {
  return {
    strategy: fallback ? 'explicit-fallback' : 'single',
    requestedCapabilities: requiredCapabilities,
    initialCandidate: buildRouteCandidate(primary, 'primary'),
    fallbackCandidate: fallback ? buildRouteCandidate(fallback, 'fallback') : undefined,
  };
}

function withResolvedCandidate(
  resolution: ProviderRouteResolution,
  backend: ProviderBackend,
  routeRole: ProviderRouteCandidate['routeRole']
): ProviderRouteResolution {
  return {
    ...resolution,
    resolvedCandidate: buildRouteCandidate(backend, routeRole),
    rejection: undefined,
  };
}

function withRouteRejection(
  resolution: ProviderRouteResolution,
  error: ProviderError,
  stage: 'selection' | 'primary' | 'fallback'
): ProviderRouteResolution {
  return {
    ...resolution,
    rejection: {
      stage,
      reason: error.message,
      failureType: error.type,
    },
  };
}

function resolveInitialRoute(
  primary: ProviderBackend,
  fallback: ProviderBackend | undefined,
  requiredCapabilities: ProviderSelectionRequirement | undefined
): RouteSelection {
  const resolution = buildRouteResolutionBase(primary, fallback, requiredCapabilities);
  const primaryMismatch = resolveCapabilityMismatch(primary.profile, requiredCapabilities);

  if (!primaryMismatch) {
    return {
      ok: true,
      selectedBackend: primary,
      fallbackBackend: fallback,
      fallbackUsed: false,
      routeResolution: withResolvedCandidate(resolution, primary, 'primary'),
    };
  }

  if (fallback && canUseFallback(primary)) {
    const fallbackMismatch = resolveCapabilityMismatch(fallback.profile, requiredCapabilities);
    if (!fallbackMismatch) {
      return {
        ok: true,
        selectedBackend: fallback,
        fallbackBackend: undefined,
        fallbackUsed: true,
        routeResolution: withResolvedCandidate(resolution, fallback, 'fallback'),
      };
    }
  }

  return {
    ok: false,
    error: primaryMismatch,
    routeResolution: withRouteRejection(resolution, primaryMismatch, 'selection'),
  };
}

function shouldAttemptFallback(
  primaryBackend: ProviderBackend,
  fallbackBackend: ProviderBackend | undefined,
  error: ProviderError,
  requiredCapabilities: ProviderSelectionRequirement | undefined
): boolean {
  if (!fallbackBackend || !canUseFallback(primaryBackend)) {
    return false;
  }

  if (resolveCapabilityMismatch(fallbackBackend.profile, requiredCapabilities)) {
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

async function executeAttempt<T>(
  backend: ProviderBackend,
  operation: 'streamText' | 'generateStructured',
  correlation: CorrelationContext | undefined,
  policy: ProviderPolicySnapshot,
  executor: () => Promise<{ value: T; usage?: RawUsage }>
): Promise<AttemptSuccess<T> | AttemptFailure> {
  let attempts = 0;
  let retriesPerformed = 0;
  let timeoutCount = 0;
  let lastError: ProviderError | null = null;

  while (attempts < policy.maxRetries + 1) {
    const startedAt = Date.now();
    attempts += 1;

    if (correlation) {
      emitProviderStart(correlation, backend.profile.providerName, backend.profile.modelName, operation);
    }

    try {
      const result = await withTimeout(executor(), policy.timeoutMs);
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

      if (normalized.retryable && retriesPerformed < policy.maxRetries) {
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
  failureStage?: 'selection' | 'primary' | 'fallback';
  usage: ProviderUsageSummary;
  requiredCapabilities?: ProviderSelectionRequirement;
  routeResolution?: ProviderRouteResolution;
  policySnapshot?: ProviderPolicySnapshot;
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
    failureStage: params.failureStage,
    requiredCapabilities: params.requiredCapabilities,
    routeResolution: params.routeResolution,
    policySnapshot: params.policySnapshot,
    usage: params.usage,
  };
}

function createUnavailableUsage(requestCount: number): ProviderUsageSummary {
  return {
    requestCount,
    tokenAvailability: 'unavailable',
    costAvailability: 'unavailable',
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
    const routeSelection = resolveInitialRoute(primary, fallback, options?.requiredCapabilities);
    if (!routeSelection.ok) {
      const summary = buildExecutionSummary({
        operation,
        initial: primary.profile,
        finalBackend: primary,
        attempts: 0,
        retriesPerformed: 0,
        timeoutCount: 0,
        fallbackUsed: false,
        failure: routeSelection.error,
        failureStage: 'selection',
        usage: createUnavailableUsage(0),
        requiredCapabilities: options?.requiredCapabilities,
        routeResolution: routeSelection.routeResolution,
        policySnapshot: buildPolicySnapshot(primary, options),
      });
      executionLog.push(summary);
      throw toError(routeSelection.error, summary);
    }

    const selectedBackend = routeSelection.selectedBackend;
    const selectedExecutor = selectedBackend === primary ? primaryExecutor : fallbackExecutor;
    if (!selectedExecutor) {
      const configurationError: ProviderError = {
        type: 'fallback_not_configured',
        message: 'Fallback backend executor is not available',
        retryable: false,
      };
      const summary = buildExecutionSummary({
        operation,
        initial: primary.profile,
        finalBackend: primary,
        attempts: 0,
        retriesPerformed: 0,
        timeoutCount: 0,
        fallbackUsed: false,
        failure: configurationError,
        failureStage: 'selection',
        usage: createUnavailableUsage(0),
        requiredCapabilities: options?.requiredCapabilities,
        routeResolution: withRouteRejection(routeSelection.routeResolution, configurationError, 'selection'),
        policySnapshot: buildPolicySnapshot(primary, options),
      });
      executionLog.push(summary);
      throw toError(configurationError, summary);
    }

    const selectedPolicy = buildPolicySnapshot(selectedBackend, options);
    const selectedResult = await executeAttempt(
      selectedBackend,
      operation,
      correlation,
      selectedPolicy,
      selectedExecutor
    );

    if (selectedResult.ok) {
      const summary = buildExecutionSummary({
        operation,
        initial: primary.profile,
        finalBackend: selectedBackend,
        attempts: selectedResult.attempts,
        retriesPerformed: selectedResult.retriesPerformed,
        timeoutCount: selectedResult.timeoutCount,
        fallbackUsed: routeSelection.fallbackUsed,
        usage: selectedResult.usage,
        requiredCapabilities: options?.requiredCapabilities,
        routeResolution: routeSelection.routeResolution,
        policySnapshot: selectedPolicy,
      });
      executionLog.push(summary);
      return selectedResult.value;
    }

    const canFallbackAfterPrimary = selectedBackend === primary
      && shouldAttemptFallback(primary, routeSelection.fallbackBackend, selectedResult.error, options?.requiredCapabilities)
      && fallbackExecutor;

    if (canFallbackAfterPrimary && routeSelection.fallbackBackend) {
      const fallbackPolicy = buildPolicySnapshot(routeSelection.fallbackBackend, options);
      const fallbackResult = await executeAttempt(
        routeSelection.fallbackBackend,
        operation,
        correlation,
        fallbackPolicy,
        fallbackExecutor
      );
      const fallbackResolution = withResolvedCandidate(
        routeSelection.routeResolution,
        routeSelection.fallbackBackend,
        'fallback'
      );

      if (fallbackResult.ok) {
        const summary = buildExecutionSummary({
          operation,
          initial: primary.profile,
          finalBackend: routeSelection.fallbackBackend,
          attempts: selectedResult.attempts + fallbackResult.attempts,
          retriesPerformed: selectedResult.retriesPerformed + fallbackResult.retriesPerformed,
          timeoutCount: selectedResult.timeoutCount + fallbackResult.timeoutCount,
          fallbackUsed: true,
          usage: {
            ...fallbackResult.usage,
            requestCount: selectedResult.attempts + fallbackResult.usage.requestCount,
          },
          requiredCapabilities: options?.requiredCapabilities,
          routeResolution: fallbackResolution,
          policySnapshot: fallbackPolicy,
        });
        executionLog.push(summary);
        return fallbackResult.value;
      }

      const failure: ProviderError = {
        type: 'fallback_failed',
        message: `Fallback provider failed after primary ${selectedResult.error.type}: ${fallbackResult.error.message}`,
        retryable: false,
        originalError: fallbackResult.error.originalError,
      };

      const summary = buildExecutionSummary({
        operation,
        initial: primary.profile,
        finalBackend: routeSelection.fallbackBackend,
        attempts: selectedResult.attempts + fallbackResult.attempts,
        retriesPerformed: selectedResult.retriesPerformed + fallbackResult.retriesPerformed,
        timeoutCount: selectedResult.timeoutCount + fallbackResult.timeoutCount,
        fallbackUsed: true,
        failure,
        failureStage: 'fallback',
        usage: createUnavailableUsage(selectedResult.attempts + fallbackResult.attempts),
        requiredCapabilities: options?.requiredCapabilities,
        routeResolution: withRouteRejection(fallbackResolution, failure, 'fallback'),
        policySnapshot: fallbackPolicy,
      });
      executionLog.push(summary);
      throw toError(failure, summary);
    }

    const failureStage = routeSelection.fallbackUsed ? 'fallback' : 'primary';
    const summary = buildExecutionSummary({
      operation,
      initial: primary.profile,
      finalBackend: selectedBackend,
      attempts: selectedResult.attempts,
      retriesPerformed: selectedResult.retriesPerformed,
      timeoutCount: selectedResult.timeoutCount,
      fallbackUsed: routeSelection.fallbackUsed,
      failure: selectedResult.error,
      failureStage,
      usage: createUnavailableUsage(selectedResult.attempts),
      requiredCapabilities: options?.requiredCapabilities,
      routeResolution: withRouteRejection(routeSelection.routeResolution, selectedResult.error, failureStage),
      policySnapshot: selectedPolicy,
    });
    executionLog.push(summary);
    throw toError(selectedResult.error, summary);
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
  const defaultTimeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxTimeoutMs = config.maxTimeoutMs ?? defaultTimeoutMs;
  const defaultMaxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxRetriesLimit = config.maxRetriesLimit ?? defaultMaxRetries;
  const fallbackMode = config.fallbackMode ?? (fallbackConfigured ? 'explicit' : 'disabled');

  return {
    providerName: config.name ?? config.provider,
    modelName: config.modelId,
    enabled: true,
    capabilities: {
      structuredOutput: true,
      streaming: true,
    },
    reliability: {
      defaultTimeoutMs,
      maxTimeoutMs,
      defaultMaxRetries,
      maxRetriesLimit,
      fallbackEligible: fallbackConfigured && fallbackMode === 'explicit',
      fallbackMode,
      fallbackProvider: config.fallback?.name ?? config.fallback?.provider,
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

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createFakeProvider } from './fake-provider.js';
import { createLLMAdapter } from './provider.js';

describe('LLM Adapter Reliability', () => {
  it('prefers configured display names in metadata without changing fallback model metadata', () => {
    const adapter = createLLMAdapter({
      provider: 'openai',
      apiKey: 'test-key',
      name: 'qwen',
      modelId: 'qwen-plus',
      baseURL: 'https://compat.example/v1',
      fallback: {
        provider: 'openai',
        apiKey: 'fallback-key',
        name: 'deepseek',
        modelId: 'deepseek-chat',
        baseURL: 'https://fallback.example/v1',
      },
    });

    const metadata = adapter.getMetadata();
    expect(metadata.providerName).toBe('qwen');
    expect(metadata.modelName).toBe('qwen-plus');
    expect(metadata.reliability.fallbackProvider).toBe('deepseek');
    expect(metadata.reliability.fallbackModel).toBe('deepseek-chat');
  });

  it('prefers the primary route when it satisfies the required capabilities', async () => {
    const fallback = createFakeProvider(
      { default: { ok: false } },
      {
        providerName: 'fake-fallback',
        modelName: 'fallback-model',
      }
    );

    const adapter = createFakeProvider(
      { default: { ok: true } },
      {
        providerName: 'fake-primary',
        modelName: 'primary-model',
        fallback,
      }
    );

    const result = await adapter.generateStructured(
      [{ role: 'user', content: 'structured' }],
      z.object({ ok: z.boolean() }),
      undefined,
      { requiredCapabilities: { structuredOutput: true } }
    );

    expect(result).toEqual({ ok: true });

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.selectedProvider).toBe('fake-primary');
    expect(summary?.fallbackUsed).toBe(false);
    expect(summary?.routeResolution?.resolvedCandidate?.routeRole).toBe('primary');
  });

  it('rejects capability mismatch without implicit fallback', async () => {
    const adapter = createFakeProvider(
      { default: { ok: true } },
      {
        capabilities: { structuredOutput: false },
      }
    );

    await expect(
      adapter.generateStructured(
        [{ role: 'user', content: 'structured' }],
        z.object({ ok: z.boolean() }),
        undefined,
        { requiredCapabilities: { structuredOutput: true } }
      )
    ).rejects.toThrow('[capability_mismatch]');

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.failureType).toBe('capability_mismatch');
    expect(summary?.fallbackUsed).toBe(false);
    expect(summary?.failureStage).toBe('selection');
    expect(summary?.routeResolution?.rejection?.stage).toBe('selection');
  });

  it('retries retryable failures and succeeds within bounds', async () => {
    const adapter = createFakeProvider(
      { default: 'recovered response' },
      {
        reliability: { defaultMaxRetries: 1, maxRetriesLimit: 1 },
        behavior: {
          streamText: {
            failTimes: 1,
            errorType: 'network',
            usage: {
              tokenAvailability: 'estimated',
              inputTokens: 20,
              outputTokens: 5,
              totalTokens: 25,
            },
          },
        },
      }
    );

    const result = await adapter.streamText([{ role: 'user', content: 'hello' }], () => {});
    expect(result).toBe('recovered response');

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.attempts).toBe(2);
    expect(summary?.retriesPerformed).toBe(1);
    expect(summary?.policySnapshot?.maxRetries).toBe(1);
  });

  it('times out conservatively when the attempt exceeds the policy', async () => {
    const adapter = createFakeProvider(
      { default: 'slow response' },
      {
        reliability: {
          defaultTimeoutMs: 5,
          maxTimeoutMs: 5,
          defaultMaxRetries: 0,
          maxRetriesLimit: 0,
        },
        behavior: {
          streamText: {
            delayMs: 25,
          },
        },
      }
    );

    await expect(
      adapter.streamText([{ role: 'user', content: 'slow' }], () => {})
    ).rejects.toThrow('[timeout]');

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.timeoutCount).toBe(1);
    expect(summary?.failureType).toBe('timeout');
    expect(summary?.policySnapshot?.timeoutMs).toBe(5);
  });

  it('routes to explicit fallback before execution when primary capability is insufficient', async () => {
    const fallback = createFakeProvider(
      { default: { ok: true } },
      {
        providerName: 'fake-fallback',
        modelName: 'fallback-model',
      }
    );

    const adapter = createFakeProvider(
      { default: { ok: false } },
      {
        providerName: 'fake-primary',
        modelName: 'primary-model',
        capabilities: { structuredOutput: false },
        fallback,
      }
    );

    const result = await adapter.generateStructured(
      [{ role: 'user', content: 'need structured' }],
      z.object({ ok: z.boolean() }),
      undefined,
      { requiredCapabilities: { structuredOutput: true } }
    );

    expect(result).toEqual({ ok: true });

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.fallbackUsed).toBe(true);
    expect(summary?.initialProvider).toBe('fake-primary');
    expect(summary?.selectedProvider).toBe('fake-fallback');
    expect(summary?.attempts).toBe(1);
    expect(summary?.routeResolution?.initialCandidate.routeRole).toBe('primary');
    expect(summary?.routeResolution?.resolvedCandidate?.routeRole).toBe('fallback');
  });

  it('surfaces usage and estimated cost when configured', async () => {
    const adapter = createFakeProvider(
      { default: 'usage response' },
      {
        usage: {
          tokenAccounting: 'estimated',
          costAccounting: 'estimated',
          pricePerMillionInputTokensUsd: 1,
          pricePerMillionOutputTokensUsd: 2,
        },
        behavior: {
          streamText: {
            usage: {
              tokenAvailability: 'estimated',
              inputTokens: 1000,
              outputTokens: 500,
              totalTokens: 1500,
            },
          },
        },
      }
    );

    await adapter.streamText([{ role: 'user', content: 'cost' }], () => {});

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.usage.totalTokens).toBe(1500);
    expect(summary?.usage.costAvailability).toBe('estimated');
    expect(summary?.usage.estimatedCostUsd).toBeCloseTo(0.002, 6);
  });

  it('clamps request overrides to the configured conservative policy maxima', async () => {
    const adapter = createFakeProvider(
      { default: 'never reached' },
      {
        reliability: {
          defaultTimeoutMs: 5,
          maxTimeoutMs: 5,
          defaultMaxRetries: 0,
          maxRetriesLimit: 1,
        },
        behavior: {
          streamText: {
            failTimes: 2,
            errorType: 'network',
            delayMs: 25,
          },
        },
      }
    );

    await expect(
      adapter.streamText(
        [{ role: 'user', content: 'slow and flaky' }],
        () => {},
        undefined,
        { timeoutMs: 1000, maxRetries: 5 }
      )
    ).rejects.toThrow();

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.attempts).toBe(2);
    expect(summary?.policySnapshot?.timeoutMs).toBe(5);
    expect(summary?.policySnapshot?.maxRetries).toBe(1);
  });

  it('does not use fallback when policy mode is disabled', async () => {
    const fallback = createFakeProvider(
      { default: { ok: true } },
      {
        providerName: 'fake-fallback',
        modelName: 'fallback-model',
      }
    );

    const adapter = createFakeProvider(
      { default: { ok: false } },
      {
        providerName: 'fake-primary',
        modelName: 'primary-model',
        capabilities: { structuredOutput: false },
        reliability: {
          fallbackMode: 'disabled',
          fallbackEligible: false,
        },
        fallback,
      }
    );

    await expect(
      adapter.generateStructured(
        [{ role: 'user', content: 'need structured' }],
        z.object({ ok: z.boolean() }),
        undefined,
        { requiredCapabilities: { structuredOutput: true } }
      )
    ).rejects.toThrow('[capability_mismatch]');

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.fallbackUsed).toBe(false);
    expect(summary?.routeResolution?.resolvedCandidate).toBeUndefined();
  });

  it('records fallback failure stage when explicit fallback also fails', async () => {
    const fallback = createFakeProvider(
      { default: 'never reached' },
      {
        providerName: 'fake-fallback',
        modelName: 'fallback-model',
        reliability: {
          defaultMaxRetries: 0,
          maxRetriesLimit: 0,
        },
        behavior: {
          streamText: {
            failTimes: 1,
            errorType: 'network',
          },
        },
      }
    );

    const adapter = createFakeProvider(
      { default: 'never reached' },
      {
        providerName: 'fake-primary',
        modelName: 'primary-model',
        reliability: {
          defaultMaxRetries: 0,
          maxRetriesLimit: 0,
        },
        behavior: {
          streamText: {
            failTimes: 1,
            errorType: 'network',
          },
        },
        fallback,
      }
    );

    await expect(
      adapter.streamText([{ role: 'user', content: 'fail both' }], () => {})
    ).rejects.toThrow('[fallback_failed]');

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.fallbackUsed).toBe(true);
    expect(summary?.failureStage).toBe('fallback');
    expect(summary?.failureType).toBe('fallback_failed');
  });

  it('respects per-request fallback disable when the primary provider fails', async () => {
    const fallback = createFakeProvider(
      { default: 'fallback response' },
      {
        providerName: 'fake-fallback',
        modelName: 'fallback-model',
        reliability: {
          defaultMaxRetries: 0,
          maxRetriesLimit: 0,
        },
      }
    );

    const adapter = createFakeProvider(
      { default: 'never reached' },
      {
        providerName: 'fake-primary',
        modelName: 'primary-model',
        reliability: {
          defaultMaxRetries: 0,
          maxRetriesLimit: 0,
        },
        behavior: {
          streamText: {
            failTimes: 1,
            errorType: 'network',
          },
        },
        fallback,
      }
    );

    await expect(
      adapter.streamText(
        [{ role: 'user', content: 'disable fallback' }],
        () => {},
        undefined,
        { fallbackMode: 'disabled' }
      )
    ).rejects.toThrow('[network]');

    const summary = adapter.getExecutionLog()[0];
    expect(summary?.fallbackUsed).toBe(false);
    expect(summary?.failureStage).toBe('primary');
    expect(summary?.failureType).toBe('network');
  });
});

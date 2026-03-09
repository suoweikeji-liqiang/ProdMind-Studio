import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createFakeProvider } from './fake-provider.js';

describe('LLM Adapter Reliability', () => {
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
  });

  it('retries retryable failures and succeeds within bounds', async () => {
    const adapter = createFakeProvider(
      { default: 'recovered response' },
      {
        reliability: { maxRetries: 1 },
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
  });

  it('times out conservatively when the attempt exceeds the policy', async () => {
    const adapter = createFakeProvider(
      { default: 'slow response' },
      {
        reliability: { timeoutMs: 5, maxRetries: 0 },
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
  });

  it('uses explicit fallback when primary capability is insufficient', async () => {
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
});

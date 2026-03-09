import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createFakeProvider } from '@prodmind/llm-adapter';

describe('Provider Smoke Test', () => {
  it('validates fake provider stream, structured output, and execution summary', async () => {
    const provider = createFakeProvider(
      { default: { ok: true } },
      {
        behavior: {
          streamText: {
            usage: {
              tokenAvailability: 'estimated',
              totalTokens: 12,
            },
          },
        },
      }
    );

    const text = await provider.streamText([{ role: 'user', content: 'hello' }], () => {});
    const structured = await provider.generateStructured(
      [{ role: 'user', content: 'structured' }],
      z.object({ ok: z.boolean() })
    );

    expect(text).toBeDefined();
    expect(structured).toEqual({ ok: true });
    expect(provider.getMetadata().providerName).toBe('fake');
    expect(provider.getExecutionLog().length).toBeGreaterThan(0);
  });

  it.skipIf(!process.env.SMOKE_TEST_REAL_PROVIDER)('documents the opt-in real provider validation path', async () => {
    expect(process.env.SMOKE_TEST_REAL_PROVIDER).toBeDefined();
  });
});

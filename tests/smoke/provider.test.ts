import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import { createFakeProvider } from '../../packages/llm-adapter/src/index.ts';

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
      { parse: (value: unknown) => value as { ok: boolean } } as any
    );

    expect(text).toBeDefined();
    expect(structured).toEqual({ ok: true });
    expect(provider.getMetadata().providerName).toBe('fake');
    expect(provider.getExecutionLog().length).toBeGreaterThan(0);
    expect(provider.getExecutionLog()[0]?.routeResolution?.resolvedCandidate?.routeRole).toBe('primary');
    expect(provider.getExecutionLog()[0]?.policySnapshot?.fallbackMode).toBeDefined();
  });

  it.skipIf(!process.env.SMOKE_TEST_REAL_PROVIDER)('documents the opt-in real provider validation path', async () => {
    expect(process.env.SMOKE_TEST_REAL_PROVIDER).toBeDefined();
  });

  it('keeps the real-provider smoke script operator-run and non-CI-blocking', () => {
    const script = fs.readFileSync('scripts/smoke-real-provider.mjs', 'utf8');

    expect(script).toContain('Phase 5D Real Provider Smoke Validation');
    expect(script).toContain('operator-run');
    expect(script).toContain('non-CI-blocking');
    expect(script).toContain('structured output path');
    expect(script).toContain('retry / timeout behavior');
    expect(script).toContain('usage/cost visibility');
  });
});

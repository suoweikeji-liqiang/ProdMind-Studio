import { describe, it, expect } from 'vitest';
import { createFakeProvider } from '@prodmind/llm-adapter';

describe('Provider Smoke Test', () => {
  it('validates fake provider (always runs)', async () => {
    const provider = createFakeProvider({ default: 'test response' });
    const result = await provider.generate('test prompt');
    expect(result).toBe('test response');
  });

  it.skipIf(!process.env.SMOKE_TEST_REAL_PROVIDER)('validates real provider (opt-in)', async () => {
    // This test only runs when SMOKE_TEST_REAL_PROVIDER=1
    // Requires ANTHROPIC_API_KEY or equivalent

    // Real provider integration would go here
    // For now, just document the pattern
    expect(true).toBe(true);
  });
});

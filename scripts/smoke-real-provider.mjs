#!/usr/bin/env node

/**
 * Opt-in smoke test for real provider integration
 *
 * Usage:
 *   OPENAI_API_KEY=xxx node scripts/smoke-real-provider.mjs
 *   ANTHROPIC_API_KEY=xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
 *
 * This script validates the full workflow with a real LLM provider.
 * It is NOT run in CI and requires explicit opt-in with API keys.
 */

import { createLLMAdapter } from '../packages/llm-adapter/dist/index.js';

const provider = process.env.PROVIDER || 'openai';
const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];

if (!apiKey) {
  console.error(`Error: ${provider.toUpperCase()}_API_KEY environment variable not set`);
  console.error('');
  console.error('Usage:');
  console.error('  OPENAI_API_KEY=xxx node scripts/smoke-real-provider.mjs');
  console.error('  ANTHROPIC_API_KEY=xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs');
  process.exit(1);
}

const modelId = provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-20241022';

console.log(`\n🔥 Real Provider Smoke Test`);
console.log(`Provider: ${provider}`);
console.log(`Model: ${modelId}`);
console.log(`\n⚠️  This will make real API calls and incur costs.\n`);

const adapter = createLLMAdapter({ provider, apiKey, modelId });

async function smokeTest() {
  console.log('Testing streamText...');
  const response = await adapter.streamText(
    [{ role: 'user', content: 'Say "hello" in one word' }],
    (token) => process.stdout.write(token)
  );
  console.log('\n✓ streamText works\n');

  console.log('Testing generateStructured...');
  const structured = await adapter.generateStructured(
    [{ role: 'user', content: 'Return JSON with field "test" set to true' }],
    { parse: (v) => v }
  );
  console.log('Response:', structured);
  console.log('✓ generateStructured works\n');

  console.log('Testing getMetadata...');
  const metadata = adapter.getMetadata();
  console.log('Metadata:', metadata);
  console.log('✓ getMetadata works\n');

  console.log('✅ All smoke tests passed');
}

smokeTest().catch((error) => {
  console.error('\n❌ Smoke test failed:', error.message);
  process.exit(1);
});

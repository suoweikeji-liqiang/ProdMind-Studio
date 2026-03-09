#!/usr/bin/env node

/**
 * Phase 5D Real Provider Smoke Validation.
 *
 * This script is operator-run and non-CI-blocking.
 *
 * Base validation:
 * - metadata / capability surface
 * - streamText path
 * - structured output path
 * - usage / cost visibility surface
 *
 * Optional policy validation (SMOKE_VALIDATE_POLICY=1):
 * - retry / timeout behavior
 * - fallback behavior when explicitly configured
 * - usage/cost visibility under policy stress
 *
 * Examples:
 *   OPENAI_API_KEY=xxx node scripts/smoke-real-provider.mjs
  *   ANTHROPIC_API_KEY=xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
  *   OPENAI_API_KEY=xxx SMOKE_VALIDATE_POLICY=1 node scripts/smoke-real-provider.mjs
 */

import { z } from 'zod';
import { createLLMAdapter } from '../packages/llm-adapter/dist/index.js';

function readNumber(value) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function loadConfigFromEnv() {
  const provider = process.env.PROVIDER || 'openai';
  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  const fallbackProvider = process.env.PROVIDER_FALLBACK_TYPE;

  if (!apiKey) {
    console.error(`Error: ${provider.toUpperCase()}_API_KEY environment variable not set`);
    console.error('');
    console.error('Usage:');
    console.error('  OPENAI_API_KEY=xxx node scripts/smoke-real-provider.mjs');
    console.error('  ANTHROPIC_API_KEY=xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs');
    process.exit(1);
  }

  const config = {
    provider,
    apiKey,
    modelId: process.env.MODEL_ID || (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-20241022'),
    timeoutMs: readNumber(process.env.PROVIDER_TIMEOUT_MS) ?? 15000,
    maxRetries: readNumber(process.env.PROVIDER_MAX_RETRIES) ?? 1,
    pricing: readNumber(process.env.PROVIDER_PRICE_INPUT_PER_MILLION_USD) || readNumber(process.env.PROVIDER_PRICE_OUTPUT_PER_MILLION_USD)
      ? {
          inputPerMillionUsd: readNumber(process.env.PROVIDER_PRICE_INPUT_PER_MILLION_USD),
          outputPerMillionUsd: readNumber(process.env.PROVIDER_PRICE_OUTPUT_PER_MILLION_USD),
        }
      : undefined,
    fallback: fallbackProvider && process.env[`${fallbackProvider.toUpperCase()}_API_KEY`] && process.env.PROVIDER_FALLBACK_MODEL_ID
      ? {
          provider: fallbackProvider,
          apiKey: process.env[`${fallbackProvider.toUpperCase()}_API_KEY`],
          modelId: process.env.PROVIDER_FALLBACK_MODEL_ID,
          timeoutMs: readNumber(process.env.PROVIDER_FALLBACK_TIMEOUT_MS) ?? 15000,
          maxRetries: readNumber(process.env.PROVIDER_FALLBACK_MAX_RETRIES) ?? 0,
          pricing: readNumber(process.env.PROVIDER_FALLBACK_PRICE_INPUT_PER_MILLION_USD) || readNumber(process.env.PROVIDER_FALLBACK_PRICE_OUTPUT_PER_MILLION_USD)
            ? {
                inputPerMillionUsd: readNumber(process.env.PROVIDER_FALLBACK_PRICE_INPUT_PER_MILLION_USD),
                outputPerMillionUsd: readNumber(process.env.PROVIDER_FALLBACK_PRICE_OUTPUT_PER_MILLION_USD),
              }
            : undefined,
        }
      : undefined,
  };

  return config;
}

function printSummary(summary) {
  if (!summary) {
    console.log('  Provider summary unavailable');
    return;
  }

  const resolvedRoute = summary.routeResolution?.resolvedCandidate?.routeRole;
  const initialRoute = summary.routeResolution?.initialCandidate.routeRole;
  const routeLabel = initialRoute && resolvedRoute
    ? (initialRoute === resolvedRoute ? resolvedRoute : `${initialRoute} -> ${resolvedRoute}`)
    : (summary.fallbackUsed ? 'primary -> fallback' : 'primary');

  console.log(`  Provider/model: ${summary.selectedProvider}/${summary.selectedModel}`);
  console.log(`  Attempts: ${summary.attempts} | Retries: ${summary.retriesPerformed} | Timeouts: ${summary.timeoutCount}`);
  console.log(`  Route: ${routeLabel}`);
  console.log(`  Policy: ${summary.policySnapshot ? `timeout=${summary.policySnapshot.timeoutMs}ms | maxRetries=${summary.policySnapshot.maxRetries} | fallbackMode=${summary.policySnapshot.fallbackMode}` : 'unavailable'}`);
  console.log(`  Fallback: ${summary.fallbackUsed ? `yes (${summary.initialProvider}/${summary.initialModel} -> ${summary.selectedProvider}/${summary.selectedModel})` : 'no'}`);
  console.log(`  Usage: requests=${summary.usage.requestCount}, tokens=${summary.usage.totalTokens ?? 'unavailable'} (${summary.usage.tokenAvailability})`);
  console.log(`  Cost: ${summary.usage.actualCostUsd ?? summary.usage.estimatedCostUsd ?? 'unavailable'} (${summary.usage.costAvailability})`);
  console.log(`  Failure Stage: ${summary.failureStage ?? 'none'}`);
  if (summary.failureType) {
    console.log(`  Failure: ${summary.failureType} - ${summary.failureMessage ?? 'n/a'}`);
  }
}

async function runBaseValidation(adapter) {
  console.log('1. Metadata / capability surface');
  const metadata = adapter.getMetadata();
  console.log(metadata);
  console.log('');

  adapter.clearExecutionLog();
  console.log('2. streamText');
  const text = await adapter.streamText(
    [{ role: 'user', content: 'Reply with the single word: hello' }],
    () => {}
  );
  console.log(`  Response: ${text}`);
  printSummary(adapter.getExecutionLog().at(-1));
  console.log('');

  adapter.clearExecutionLog();
  console.log('3. generateStructured');
  const structured = await adapter.generateStructured(
    [{ role: 'user', content: 'Return JSON: {"status":"ok","mode":"smoke"}' }],
    z.object({
      status: z.string(),
      mode: z.string(),
    })
  );
  console.log('  Response:', structured);
  printSummary(adapter.getExecutionLog().at(-1));
  console.log('');
}

async function runPolicyValidation(config) {
  if (process.env.SMOKE_VALIDATE_POLICY !== '1') {
    console.log('4. Policy validation skipped (set SMOKE_VALIDATE_POLICY=1 to force timeout/retry/fallback checks)');
    return;
  }

  console.log('4. Policy validation (forced timeout/retry path)');
  console.log('  Expected: timeout or retry_exhausted.');
  if (config.fallback) {
    console.log('  Expected with fallback configured: fallbackUsed=true or failureType=fallback_failed.');
  }

  const stressAdapter = createLLMAdapter({
    ...config,
    timeoutMs: 1,
    maxRetries: 1,
  });

  stressAdapter.clearExecutionLog();
  try {
    await stressAdapter.streamText(
      [{ role: 'user', content: 'Write a detailed paragraph about reliability testing.' }],
      () => {}
    );
    console.log('  Unexpected success under forced timeout settings.');
    printSummary(stressAdapter.getExecutionLog().at(-1));
    process.exitCode = 1;
  } catch (error) {
    console.log(`  Caught expected failure: ${error instanceof Error ? error.message : String(error)}`);
    const summary = stressAdapter.getExecutionLog().at(-1);
    printSummary(summary);

    if (!summary || summary.timeoutCount < 1) {
      throw new Error('Policy validation did not record a timeout summary');
    }

    if (config.fallback && !summary.fallbackUsed && summary.failureType !== 'fallback_failed') {
      throw new Error('Fallback was configured but the forced timeout path did not show fallback visibility');
    }
  }
}

async function main() {
  const config = loadConfigFromEnv();

  console.log('\nPhase 5D Real Provider Smoke Validation');
  console.log('Mode: operator-run / non-CI-blocking');
  console.log(`Provider: ${config.provider}`);
  console.log(`Model: ${config.modelId}`);
  console.log(`Timeout/Retry: ${config.timeoutMs}ms / ${config.maxRetries}`);
  console.log(`Fallback: ${config.fallback ? `${config.fallback.provider}/${config.fallback.modelId}` : 'not configured'}`);
  console.log('');
  console.log('Expected validation coverage:');
  console.log('- structured output path');
  console.log('- retry / timeout behavior');
  console.log('- fallback behavior when explicitly configured');
  console.log('- usage/cost visibility');
  console.log('');
  console.log('Cost expectations:');
  console.log('- Base validation performs 2 real calls.');
  console.log('- Policy validation performs 1 additional forced-timeout call.');
  console.log('- Fallback configuration can add extra calls during policy validation.');
  console.log('');

  const adapter = createLLMAdapter(config);

  await runBaseValidation(adapter);
  await runPolicyValidation(config);

  console.log('\nSmoke validation completed.');
}

main().catch((error) => {
  console.error('\nSmoke validation failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

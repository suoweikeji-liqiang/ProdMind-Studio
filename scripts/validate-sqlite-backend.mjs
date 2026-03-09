#!/usr/bin/env node

/**
 * Phase 5D SQLite secondary-backend validation.
 *
 * This script is operator-run and non-CI-blocking.
 * It validates the SQLite history path only when the native binding is available.
 * File backend remains the default stable path.
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateSqliteRoundTrip } from '../packages/asset-engine/dist/index.js';

const validationDir = path.resolve(process.cwd(), process.env.SQLITE_VALIDATION_DIR || '.tmp-sqlite-validation');
const dbPath = path.join(validationDir, 'history.db');

fs.mkdirSync(validationDir, { recursive: true });

const sampleRun = {
  runId: 'sqlite-validation-run',
  idea: 'Validate sqlite secondary backend',
  status: 'completed',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  phases: [
    { phase: 'challenge', status: 'completed' },
    { phase: 'decision', status: 'completed' },
    { phase: 'asset', status: 'completed' },
  ],
  providerExecutions: [
    {
      operation: 'streamText',
      initialProvider: 'fake',
      initialModel: 'fake-default',
      selectedProvider: 'fake',
      selectedModel: 'fake-default',
      attempts: 1,
      retriesPerformed: 0,
      timeoutCount: 0,
      fallbackUsed: false,
      routeResolution: {
        strategy: 'single',
        initialCandidate: {
          providerName: 'fake',
          modelName: 'fake-default',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
        resolvedCandidate: {
          providerName: 'fake',
          modelName: 'fake-default',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
      },
      policySnapshot: {
        timeoutMs: 100,
        maxRetries: 0,
        fallbackMode: 'disabled',
      },
      usage: {
        requestCount: 1,
        tokenAvailability: 'estimated',
        totalTokens: 42,
        costAvailability: 'unavailable',
      },
    },
  ],
};

const sampleResult = {
  runId: sampleRun.runId,
  challenge: {
    artifactPath: 'challenge.md',
    hypothesesCount: 1,
  },
  decision: {
    artifactPath: 'assets/decision.json',
    recommendation: 'Keep SQLite as a validated secondary backend only',
  },
  providerExecutions: sampleRun.providerExecutions,
};

async function main() {
  console.log('\nPhase 5D SQLite Backend Validation');
  console.log('Mode: operator-run / non-CI-blocking');
  console.log('Default stable backend: file');
  console.log(`Validation db path: ${dbPath}`);
  console.log('');

  const result = await validateSqliteRoundTrip({
    dbPath,
    run: sampleRun,
    result: sampleResult,
  });

  if (!result.available) {
    console.log('SQLite validation skipped.');
    console.log(`Reason: ${result.reason ?? 'native binding unavailable'}`);
    process.exit(0);
  }

  if (!result.validated) {
    console.error('SQLite validation failed.');
    console.error(`Reason: ${result.reason ?? 'unknown validation failure'}`);
    process.exit(1);
  }

  console.log('SQLite validation passed.');
  console.log(`Retrieved run: ${result.retrievedRun?.runId}`);
  console.log(`Provider executions: ${result.retrievedRun?.providerExecutions?.length ?? 0}`);
  console.log('SQLite remains a validated secondary backend, not the default persistence path.');
}

main().catch((error) => {
  console.error('\nSQLite validation failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

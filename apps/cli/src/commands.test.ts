import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runWorkflow, initProject, runChallenge, runDecision, exportAssets } from '../src/commands.js';
import { displayProviderExecutions } from '../src/observability.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PROJECT_PATH = './test-project-cli-e2e';
const TEST_IDEA = 'Build a minimal task management app';

describe('CLI E2E Golden Path', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_PROJECT_PATH)) {
      fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_PROJECT_PATH)) {
      fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
    }
  });

  it('should run full workflow: init -> challenge -> decision -> assets', async () => {
    const summary = await runWorkflow(TEST_IDEA, TEST_PROJECT_PATH);

    expect(fs.existsSync(TEST_PROJECT_PATH)).toBe(true);
    expect(fs.existsSync(path.join(TEST_PROJECT_PATH, 'challenge.md'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_PROJECT_PATH, 'assets', 'decision.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_PROJECT_PATH, 'output'))).toBe(true);

    const challengeContent = fs.readFileSync(path.join(TEST_PROJECT_PATH, 'challenge.md'), 'utf8');
    expect(challengeContent).toContain('# Challenge Output');
    expect(challengeContent).toContain('## Hypotheses');

    const decisionContent = fs.readFileSync(path.join(TEST_PROJECT_PATH, 'assets', 'decision.json'), 'utf8');
    const decision = JSON.parse(decisionContent);
    expect(decision).toHaveProperty('hypotheses');
    expect(decision).toHaveProperty('recommendation');

    const resultPath = path.join(TEST_PROJECT_PATH, '.prodmind', 'history', summary.executionId, 'result.json');
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    expect(result.providerExecutions?.length).toBeGreaterThan(0);
  });

  it('should initialize project', async () => {
    await initProject(TEST_PROJECT_PATH);
    expect(fs.existsSync(TEST_PROJECT_PATH)).toBe(true);
  });

  it('should run challenge and produce artifact', async () => {
    await initProject(TEST_PROJECT_PATH);
    const artifact = await runChallenge(TEST_IDEA, TEST_PROJECT_PATH);

    expect(artifact).toHaveProperty('sessionId');
    expect(artifact).toHaveProperty('hypotheses');
    expect(artifact.hypotheses.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(TEST_PROJECT_PATH, 'challenge.md'))).toBe(true);
  });

  it('should export assets to output directory', async () => {
    await initProject(TEST_PROJECT_PATH);
    await runChallenge(TEST_IDEA, TEST_PROJECT_PATH);
    await runDecision(TEST_IDEA, TEST_PROJECT_PATH);

    const outputPath = path.join(TEST_PROJECT_PATH, 'output');
    await exportAssets(TEST_PROJECT_PATH, outputPath);

    expect(fs.existsSync(path.join(outputPath, 'challenge.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputPath, 'decision.json'))).toBe(true);
  });

  it('should display the provider policy summary from execution contracts', () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.join(' '));
    };

    try {
      displayProviderExecutions([{
        operation: 'streamText',
        initialProvider: 'openai',
        initialModel: 'gpt-4o-mini',
        selectedProvider: 'anthropic',
        selectedModel: 'claude-3-5-haiku-20241022',
        attempts: 2,
        retriesPerformed: 1,
        timeoutCount: 1,
        fallbackUsed: true,
        failureStage: 'fallback',
        routeResolution: {
          strategy: 'explicit-fallback',
          initialCandidate: {
            providerName: 'openai',
            modelName: 'gpt-4o-mini',
            routeRole: 'primary',
            enabled: true,
            fallbackEligible: true,
          },
          resolvedCandidate: {
            providerName: 'anthropic',
            modelName: 'claude-3-5-haiku-20241022',
            routeRole: 'fallback',
            enabled: true,
            fallbackEligible: false,
          },
        },
        policySnapshot: {
          timeoutMs: 5000,
          maxRetries: 1,
          fallbackMode: 'explicit',
        },
        usage: {
          requestCount: 2,
          totalTokens: 120,
          tokenAvailability: 'estimated',
          costAvailability: 'estimated',
          estimatedCostUsd: 0.0012,
        },
      }]);
    } finally {
      console.log = originalLog;
    }

    expect(lines.join('\n')).toContain('Route:');
    expect(lines.join('\n')).toContain('fallback');
    expect(lines.join('\n')).toContain('Policy:');
    expect(lines.join('\n')).toContain('5000ms');
    expect(lines.join('\n')).toContain('Failure Stage:');
  });
});

import { describe, expect, it } from 'vitest';
import {
  ProviderCapabilityProfileSchema,
  ProviderExecutionSummarySchema,
  ProviderRouteCandidateSchema,
  ProviderRouteResolutionSchema,
  WorkflowResultSchema,
  WorkflowRunSchema,
} from '../src/index.js';

describe('Provider Maturity Contracts', () => {
  it('validates provider capability and reliability profile', () => {
    const profile = ProviderCapabilityProfileSchema.parse({
      providerName: 'openai',
      modelName: 'gpt-4o-mini',
      enabled: false,
      capabilities: {
        structuredOutput: true,
        streaming: true,
      },
      reliability: {
        defaultTimeoutMs: 10000,
        maxTimeoutMs: 30000,
        defaultMaxRetries: 1,
        maxRetriesLimit: 2,
        fallbackEligible: true,
        fallbackMode: 'explicit',
      },
      usage: {
        tokenAccounting: 'provider',
        costAccounting: 'estimated',
      },
    });

    expect(profile.enabled).toBe(false);
    expect(profile.capabilities.streaming).toBe(true);
    expect(profile.reliability.defaultTimeoutMs).toBe(10000);
    expect(profile.reliability.maxRetriesLimit).toBe(2);
  });

  it('validates route candidates and deterministic route resolution', () => {
    const primary = ProviderRouteCandidateSchema.parse({
      providerName: 'openai',
      modelName: 'gpt-4o-mini',
      routeRole: 'primary',
      enabled: true,
      fallbackEligible: true,
    });

    const resolution = ProviderRouteResolutionSchema.parse({
      strategy: 'explicit-fallback',
      requestedCapabilities: {
        structuredOutput: true,
      },
      initialCandidate: primary,
      resolvedCandidate: {
        providerName: 'anthropic',
        modelName: 'claude-3-5-haiku-20241022',
        routeRole: 'fallback',
        enabled: true,
        fallbackEligible: false,
      },
    });

    expect(resolution.initialCandidate.routeRole).toBe('primary');
    expect(resolution.resolvedCandidate?.routeRole).toBe('fallback');
  });

  it('validates provider execution summary with runtime-derived fields', () => {
    const summary = ProviderExecutionSummarySchema.parse({
      selectedProvider: 'openai',
      selectedModel: 'gpt-4o-mini',
      attempts: 2,
      retriesPerformed: 1,
      timeoutCount: 0,
      fallbackUsed: false,
      failureStage: 'selection',
      routeResolution: {
        strategy: 'single',
        initialCandidate: {
          providerName: 'openai',
          modelName: 'gpt-4o-mini',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
        resolvedCandidate: {
          providerName: 'openai',
          modelName: 'gpt-4o-mini',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
      },
      policySnapshot: {
        timeoutMs: 10000,
        maxRetries: 1,
        fallbackMode: 'disabled',
      },
      usage: {
        requestCount: 1,
        tokenAvailability: 'estimated',
        inputTokens: 120,
        outputTokens: 55,
        totalTokens: 175,
        costAvailability: 'estimated',
        estimatedCostUsd: 0.0012,
      },
    });

    expect(summary.retriesPerformed).toBe(1);
    expect(summary.usage.totalTokens).toBe(175);
    expect(summary.policySnapshot?.timeoutMs).toBe(10000);
  });

  it('allows workflow run persistence of provider execution summaries', () => {
    const run = WorkflowRunSchema.parse({
      runId: 'run-1',
      idea: 'test',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      phases: [{ phase: 'challenge', status: 'completed' }],
      providerExecutions: [
        {
          selectedProvider: 'openai',
          selectedModel: 'gpt-4o-mini',
          attempts: 1,
          retriesPerformed: 0,
          timeoutCount: 0,
          fallbackUsed: false,
          usage: {
            requestCount: 1,
            tokenAvailability: 'unavailable',
            costAvailability: 'unavailable',
          },
        },
      ],
    });

    expect(run.providerExecutions).toHaveLength(1);
  });

  it('allows workflow result persistence of provider execution summaries', () => {
    const result = WorkflowResultSchema.parse({
      runId: 'run-1',
      providerExecutions: [
        {
          selectedProvider: 'fake',
          selectedModel: 'fake-default',
          attempts: 1,
          retriesPerformed: 0,
          timeoutCount: 0,
          fallbackUsed: false,
          usage: {
            requestCount: 1,
            tokenAvailability: 'estimated',
            totalTokens: 42,
            costAvailability: 'unavailable',
          },
        },
      ],
    });

    expect(result.providerExecutions?.[0]?.selectedProvider).toBe('fake');
  });
});

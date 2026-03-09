import type { ProviderExecutionSummary } from '@prodmind/shared-types';
import { getGlobalEmitter, getGlobalMetricsCollector, SimpleMetricsCollector } from '@prodmind/shared-types';

let observabilitySubscribed = false;

export function setupObservability(): void {
  if (observabilitySubscribed) {
    return;
  }

  const emitter = getGlobalEmitter();
  const collector = getGlobalMetricsCollector() as SimpleMetricsCollector;

  emitter.subscribe(event => collector.handleEvent(event));
  observabilitySubscribed = true;
}

function formatUsd(value: number | undefined): string {
  if (typeof value !== 'number') {
    return 'unavailable';
  }

  return `$${value.toFixed(6)}`;
}

function formatRoute(execution: ProviderExecutionSummary): string {
  const initialRole = execution.routeResolution?.initialCandidate.routeRole;
  const resolvedRole = execution.routeResolution?.resolvedCandidate?.routeRole;

  if (initialRole && resolvedRole) {
    return initialRole === resolvedRole ? initialRole : `${initialRole} -> ${resolvedRole}`;
  }

  return execution.fallbackUsed ? 'primary -> fallback' : 'primary';
}

function formatPolicy(execution: ProviderExecutionSummary): string {
  if (!execution.policySnapshot) {
    return 'unavailable';
  }

  return `timeout=${execution.policySnapshot.timeoutMs}ms | maxRetries=${execution.policySnapshot.maxRetries} | fallbackMode=${execution.policySnapshot.fallbackMode}`;
}

export function displayProviderExecutions(executions: ProviderExecutionSummary[]): void {
  if (executions.length === 0) {
    return;
  }

  console.log('\nProvider Reliability Summary:');
  for (const execution of executions) {
    console.log(`- ${execution.operation ?? 'provider_call'}: ${execution.selectedProvider}/${execution.selectedModel}`);
    console.log(`  Attempts: ${execution.attempts} | Retries: ${execution.retriesPerformed} | Timeouts: ${execution.timeoutCount}`);
    console.log(`  Route: ${formatRoute(execution)}`);
    console.log(`  Policy: ${formatPolicy(execution)}`);
    console.log(`  Fallback: ${execution.fallbackUsed ? `yes (${execution.initialProvider}/${execution.initialModel} -> ${execution.selectedProvider}/${execution.selectedModel})` : 'no'}`);
    console.log(`  Usage: requests=${execution.usage.requestCount}, tokens=${execution.usage.totalTokens ?? 'unavailable'} (${execution.usage.tokenAvailability})`);
    console.log(`  Cost: ${formatUsd(execution.usage.actualCostUsd ?? execution.usage.estimatedCostUsd)} (${execution.usage.costAvailability})`);
    console.log(`  Failure Stage: ${execution.failureStage ?? 'none'}`);
    if (execution.failureType) {
      console.log(`  Failure: ${execution.failureType} - ${execution.failureMessage ?? 'n/a'}`);
    }
  }
}

export function displayWorkflowSummary(
  runId: string,
  success: boolean,
  durationMs: number,
  executions: ProviderExecutionSummary[] = []
): void {
  const metrics = getGlobalMetricsCollector().getMetrics();

  console.log('\n--- Workflow Summary ---');
  console.log(`Run ID: ${runId}`);
  console.log(`Status: ${success ? '✓ Success' : '✗ Failed'}`);
  console.log(`Duration: ${Math.round(durationMs / 1000)}s`);

  if (metrics.providers.length > 0) {
    const provider = metrics.providers[0];
    if (provider) {
      console.log(`Provider: ${provider.provider} (${provider.requestCount} requests)`);
    }
  }

  displayProviderExecutions(executions);
}

export function displayFailureSummary(runId: string, phase: string, error: string): void {
  console.log('\n--- Failure Details ---');
  console.log(`Run ID: ${runId}`);
  console.log(`Failed Phase: ${phase}`);
  console.log(`Error: ${error}`);
  console.log('\nUse "prodmind-studio history show <runId>" for full details');
}

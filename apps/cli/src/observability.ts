import type { ObservabilityEvent, SystemMetrics } from '@prodmind/shared-types';
import { getGlobalEmitter, getGlobalMetricsCollector, SimpleMetricsCollector } from '@prodmind/shared-types';

export function setupObservability(): void {
  const emitter = getGlobalEmitter();
  const collector = getGlobalMetricsCollector() as SimpleMetricsCollector;

  emitter.subscribe(event => collector.handleEvent(event));
}

export function displayWorkflowSummary(runId: string, success: boolean, durationMs: number): void {
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
}

export function displayFailureSummary(runId: string, phase: string, error: string): void {
  console.log('\n--- Failure Details ---');
  console.log(`Run ID: ${runId}`);
  console.log(`Failed Phase: ${phase}`);
  console.log(`Error: ${error}`);
  console.log('\nUse "prodmind-studio history show <runId>" for full details');
}

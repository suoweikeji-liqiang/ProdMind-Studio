import type { ObservabilityEvent } from './events.js';
import type {
  SystemMetrics,
  WorkflowMetrics,
  PhaseMetrics,
  ProviderMetrics,
  PersistenceMetrics,
  MetricsCollector,
} from './metrics.js';

// Phase 5B: Minimal in-memory metrics collector
// NOT a full monitoring platform - just basic counters and durations

export class SimpleMetricsCollector implements MetricsCollector {
  private workflowTotal = 0;
  private workflowSuccess = 0;
  private workflowFailed = 0;
  private workflowDurations: number[] = [];

  private phaseStats = new Map<string, {
    count: number;
    success: number;
    failed: number;
    durations: number[];
  }>();

  private providerStats = new Map<string, {
    requests: number;
    success: number;
    errors: number;
    tokens: number;
    durations: number[];
  }>();

  private persistenceStats = new Map<string, {
    reads: number;
    writes: number;
    updates: number;
    errors: number;
  }>();

  handleEvent(event: ObservabilityEvent): void {
    if (event.type === 'workflow') {
      this.handleWorkflowEvent(event);
    } else if (event.type === 'provider') {
      this.handleProviderEvent(event);
    } else if (event.type === 'persistence') {
      this.handlePersistenceEvent(event);
    }
  }

  private handleWorkflowEvent(event: ObservabilityEvent): void {
    if (event.type !== 'workflow') return;

    if (event.operation === 'start') {
      this.workflowTotal++;
    } else if (event.operation === 'end') {
      if (event.status === 'completed') {
        this.workflowSuccess++;
      } else if (event.status === 'failed') {
        this.workflowFailed++;
      }
      if (event.durationMs) {
        this.workflowDurations.push(event.durationMs);
      }
    } else if (event.operation === 'phase_end' && event.phase) {
      const phase = event.phase;
      if (!this.phaseStats.has(phase)) {
        this.phaseStats.set(phase, { count: 0, success: 0, failed: 0, durations: [] });
      }
      const stats = this.phaseStats.get(phase)!;
      stats.count++;
      if (event.status === 'completed') {
        stats.success++;
      } else if (event.status === 'failed') {
        stats.failed++;
      }
      if (event.durationMs) {
        stats.durations.push(event.durationMs);
      }
    }
  }

  private handleProviderEvent(event: ObservabilityEvent): void {
    if (event.type !== 'provider') return;

    const provider = event.provider;
    if (!this.providerStats.has(provider)) {
      this.providerStats.set(provider, { requests: 0, success: 0, errors: 0, tokens: 0, durations: [] });
    }
    const stats = this.providerStats.get(provider)!;

    if (event.operation === 'request_start') {
      stats.requests++;
    } else if (event.operation === 'request_end') {
      stats.success++;
      if (event.tokenCount) {
        stats.tokens += event.tokenCount;
      }
      if (event.durationMs) {
        stats.durations.push(event.durationMs);
      }
    } else if (event.operation === 'request_error') {
      stats.errors++;
    }
  }

  private handlePersistenceEvent(event: ObservabilityEvent): void {
    if (event.type !== 'persistence') return;

    const backend = event.backend;
    if (!this.persistenceStats.has(backend)) {
      this.persistenceStats.set(backend, { reads: 0, writes: 0, updates: 0, errors: 0 });
    }
    const stats = this.persistenceStats.get(backend)!;

    if (event.operation === 'read') {
      stats.reads++;
    } else if (event.operation === 'write') {
      stats.writes++;
    } else if (event.operation === 'update') {
      stats.updates++;
    }

    if (!event.success) {
      stats.errors++;
    }
  }

  getMetrics(): SystemMetrics {
    const phases: PhaseMetrics[] = [];
    for (const [phase, stats] of this.phaseStats.entries()) {
      phases.push({
        phase: phase as 'challenge' | 'decision' | 'asset',
        executionCount: stats.count,
        successCount: stats.success,
        failureCount: stats.failed,
        averageDurationMs: this.avg(stats.durations),
        minDurationMs: this.min(stats.durations),
        maxDurationMs: this.max(stats.durations),
      });
    }

    const providers: ProviderMetrics[] = [];
    for (const [provider, stats] of this.providerStats.entries()) {
      providers.push({
        provider,
        requestCount: stats.requests,
        successCount: stats.success,
        errorCount: stats.errors,
        totalTokens: stats.tokens,
        averageDurationMs: this.avg(stats.durations),
      });
    }

    const persistence: PersistenceMetrics[] = [];
    for (const [backend, stats] of this.persistenceStats.entries()) {
      persistence.push({
        backend,
        readCount: stats.reads,
        writeCount: stats.writes,
        updateCount: stats.updates,
        errorCount: stats.errors,
      });
    }

    return {
      workflow: {
        totalRuns: this.workflowTotal,
        successfulRuns: this.workflowSuccess,
        failedRuns: this.workflowFailed,
        averageDurationMs: this.avg(this.workflowDurations),
      },
      phases,
      providers,
      persistence,
      collectedAt: new Date().toISOString(),
    };
  }

  reset(): void {
    this.workflowTotal = 0;
    this.workflowSuccess = 0;
    this.workflowFailed = 0;
    this.workflowDurations = [];
    this.phaseStats.clear();
    this.providerStats.clear();
    this.persistenceStats.clear();
  }

  private avg(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private min(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    return Math.min(...values);
  }

  private max(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    return Math.max(...values);
  }
}

let globalCollector: MetricsCollector | null = null;

export function getGlobalMetricsCollector(): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new SimpleMetricsCollector();
  }
  return globalCollector;
}

export function setGlobalMetricsCollector(collector: MetricsCollector): void {
  globalCollector = collector;
}

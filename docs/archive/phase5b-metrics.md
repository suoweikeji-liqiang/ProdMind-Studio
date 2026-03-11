# Phase 5B: Minimal Metrics Surface

## Overview

This document describes the minimal metrics capabilities added in Phase 5B. The goal is to provide basic operational visibility without building a heavy monitoring platform.

## Design Principles

1. **In-Memory Only**: No external monitoring system required
2. **Basic Counters**: Track counts and durations, not complex histograms
3. **Aggregate View**: Summary statistics, not per-event details
4. **Opt-In Display**: Metrics available but not forced on users

## Metrics Categories

### Workflow Metrics

```typescript
type WorkflowMetrics = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDurationMs?: number;
};
```

Tracks overall workflow execution statistics.

### Phase Metrics

```typescript
type PhaseMetrics = {
  phase: 'challenge' | 'decision' | 'asset';
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDurationMs?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
};
```

Tracks per-phase execution statistics.

### Provider Metrics

```typescript
type ProviderMetrics = {
  provider: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalTokens?: number;
  averageDurationMs?: number;
};
```

Tracks LLM provider usage and performance.

### Persistence Metrics

```typescript
type PersistenceMetrics = {
  backend: string;
  readCount: number;
  writeCount: number;
  updateCount: number;
  errorCount: number;
};
```

Tracks persistence layer operations.

## Implementation

### Metrics Collector

```typescript
class SimpleMetricsCollector implements MetricsCollector {
  handleEvent(event: ObservabilityEvent): void;
  getMetrics(): SystemMetrics;
  reset(): void;
}
```

- Subscribes to observability events
- Aggregates statistics in memory
- Provides snapshot via `getMetrics()`
- Can be reset for testing

### Integration

Metrics collector automatically subscribes to global event emitter:

```typescript
import { getGlobalEmitter, getGlobalMetricsCollector } from '@prodmind/shared-types';

const emitter = getGlobalEmitter();
const collector = getGlobalMetricsCollector();

emitter.subscribe(event => collector.handleEvent(event));
```

## Current Capabilities

✅ **Can track:**
- Workflow success/failure rates
- Phase execution counts and durations
- Provider request counts and latencies
- Persistence operation counts

❌ **Cannot track (deferred):**
- Percentile distributions (p50, p95, p99)
- Time-series data
- Custom metrics
- Metric retention beyond process lifetime

## Usage Examples

### Getting Current Metrics

```typescript
import { getGlobalMetricsCollector } from '@prodmind/shared-types';

const metrics = getGlobalMetricsCollector().getMetrics();

console.log(`Total runs: ${metrics.workflow.totalRuns}`);
console.log(`Success rate: ${metrics.workflow.successfulRuns / metrics.workflow.totalRuns}`);
```

### Resetting Metrics

```typescript
// Useful for testing or session boundaries
getGlobalMetricsCollector().reset();
```

## Display Guidelines

### CLI Display
- Show metrics summary after workflow completion
- Include success rate, duration, provider calls
- Keep output concise (3-5 lines max)

### Web Display
- Optional metrics panel (collapsed by default)
- Show current session metrics
- No heavy dashboard UI

## Limitations

1. **No Persistence**: Metrics lost when process ends
2. **No Aggregation**: Simple averages, no percentiles
3. **No Alerting**: No threshold-based alerts
4. **No Export**: No integration with external systems

## Future Enhancements (Deferred)

- Metrics persistence to file/database
- Percentile calculations (p50, p95, p99)
- Time-series data with retention policy
- Metrics export to Prometheus/StatsD
- Custom metric definitions
- Alerting based on thresholds

---

**Status**: Phase 5B foundation - minimal metrics without monitoring platform.

# Observability Standards

## Overview

ProdMind-Studio implements structured observability to enable diagnostic visibility without building a heavy monitoring platform. This document describes the observability capabilities, how to use them, and current limitations.

## Observability Architecture

### Three-Layer Model

1. **Events**: Structured diagnostic events emitted during execution
2. **Metrics**: Aggregated statistics collected from events
3. **Correlation**: Context propagation for tracing execution flow

### Components

- **Event Emitter**: Publishes observability events to subscribers
- **Metrics Collector**: Aggregates events into statistics
- **Correlation Context**: Tracks workflow/phase/step relationships
- **Error Normalization**: Structures failures for diagnosis

## Event Types

### Workflow Events
- Workflow start/end
- Phase start/end (challenge, decision, asset)
- Status transitions

### Provider Events
- Provider request start/end/error
- Model and operation tracking
- Duration and token counts

### Persistence Events
- Read/write/update operations
- Backend identification
- Success/failure tracking

### Recovery Events
- Retry attempts
- Skip decisions
- Recovery success/failure

## Using Observability

### For Operators

**View workflow summary:**
```bash
prodmind-studio workflow "build a todo app"
# Displays run ID, status, duration, provider usage
```

**View detailed history:**
```bash
prodmind-studio history list
prodmind-studio history show <runId>
```

**Diagnose failures:**
When a workflow fails, the CLI displays:
- Run ID for reference
- Failed phase
- Error message
- Command to view full details

### For Developers

**Subscribe to events:**
```typescript
import { getGlobalEmitter } from '@prodmind/shared-types';

getGlobalEmitter().subscribe(event => {
  console.log('Event:', event.type, event.operation);
});
```

**Access metrics:**
```typescript
import { getGlobalMetricsCollector } from '@prodmind/shared-types';

const metrics = getGlobalMetricsCollector().getMetrics();
console.log('Success rate:', metrics.workflow.successfulRuns / metrics.workflow.totalRuns);
```

**Propagate correlation:**
```typescript
import { createCorrelationContext, withPhase } from '@prodmind/shared-types';

const correlation = createCorrelationContext();
const phaseCorrelation = withPhase(correlation, 'challenge');
// Pass to provider, persistence, etc.
```

## Diagnosing Failures

When a workflow fails, follow this process:

1. **Note the Run ID** from the failure output
2. **View full details**: `prodmind-studio history show <runId>`
3. **Check phase status**: Identify which phase failed
4. **Review error message**: Understand the failure type
5. **Check correlation**: Trace the execution path

### Example Failure Diagnosis

```
--- Failure Details ---
Run ID: exec-1234567890
Failed Phase: challenge
Error: [PROVIDER_RATE_LIMIT] Rate limit exceeded, retry after 60s

Use "prodmind-studio history show exec-1234567890" for full details
```

This tells you:
- **What failed**: Challenge phase
- **Why**: Provider rate limit
- **Retryable**: Yes (indicated by error type)
- **Next step**: Wait and retry

## Current Capabilities

✅ **Can do:**
- Track workflow execution with correlation IDs
- Aggregate basic metrics (counts, durations)
- Normalize errors with context
- Display minimal summaries in CLI
- View execution history

❌ **Cannot do (deferred):**
- Distributed tracing across services
- External platform integration (Datadog, etc.)
- Advanced metrics (percentiles, histograms)
- Real-time dashboards
- Alerting and anomaly detection
- Long-term metrics retention

## Maturity Level

**Current**: Internal pilot ready
- Single-process observability
- In-memory metrics
- Basic diagnostic visibility
- Manual failure analysis

**Not yet**: Production-grade monitoring
- No external integrations
- No persistent metrics
- No automated alerting
- No advanced analytics

## Configuration

Observability is enabled by default with no configuration required. All events are emitted to the global emitter, and metrics are collected automatically.

To customize:
- Subscribe to specific event types
- Filter events by severity
- Reset metrics at session boundaries

## Performance Impact

Observability has minimal performance impact:
- Event emission: ~0.1ms per event
- Metrics aggregation: In-memory, negligible
- No network calls or I/O
- No blocking operations

## Future Enhancements

See `docs/phase5b-deferred.md` for planned improvements:
- External platform integration
- Distributed tracing
- Advanced metrics
- Persistent storage
- Alerting capabilities

---

**Status**: Phase 5B - minimal structured observability for internal pilot.

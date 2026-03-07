# Phase 5B: Observability Boundary

## Overview

This document defines the minimal observability contract for ProdMind-Studio. This is NOT a full distributed tracing platform or monitoring system - it's a structured foundation for diagnostic visibility.

## Design Principles

1. **Minimal Contract**: Define only what's needed for current diagnostic needs
2. **Clear Boundaries**: Separate runtime diagnostics from persisted history from future metrics
3. **Structured Events**: Replace ad-hoc string output with typed events
4. **Correlation Support**: Enable tracing a workflow execution across layers
5. **Failure Diagnosis**: Make failures answerable ("which step, why, what context")

## Observability Data Categories

### 1. Runtime Diagnostic Data
**Purpose**: Real-time visibility during execution
**Lifetime**: Session-scoped, may be discarded after run completes
**Examples**: Debug logs, progress indicators, intermediate state

### 2. Persisted History Data
**Purpose**: Post-execution analysis and audit trail
**Lifetime**: Stored in persistence backend
**Examples**: Workflow runs, phase executions, results

### 3. Metrics Surface Data
**Purpose**: Aggregate statistics for monitoring
**Lifetime**: Collected and aggregated over time
**Examples**: Success/failure counts, duration histograms, operation counts

## Core Contracts

### Correlation Context

```typescript
type CorrelationContext = {
  runId: string;           // Required: workflow run identifier
  phaseId?: string;        // Optional: challenge/decision/asset phase
  stepId?: string;         // Optional: specific step within phase
  parentId?: string;       // Optional: for nested operations
};
```

**Usage**: Propagated through all layers to enable trace correlation.

### Observability Events

Four event types cover the system:

1. **WorkflowEvent**: Workflow and phase lifecycle
2. **ProviderEvent**: LLM provider interactions
3. **PersistenceEvent**: Data storage operations
4. **RecoveryEvent**: Retry and recovery attempts

All events share:
- `eventId`: Unique event identifier
- `timestamp`: ISO 8601 timestamp
- `severity`: debug | info | warning | error
- `correlation`: CorrelationContext
- `source`: Layer that emitted the event

### Failure Diagnosis

```typescript
type NormalizedError = {
  code: string;              // e.g., 'PROVIDER_RATE_LIMIT'
  message: string;           // User-friendly message
  retryable: boolean;        // Can this be retried?
  context: FailureContext;   // Where/when it failed
  originalError?: string;    // Raw error for debugging
  metadata?: Record<string, unknown>;
};
```

**Purpose**: Enable answering "which step failed, why, and what was the context?"

### Metrics Surface

```typescript
type SystemMetrics = {
  workflow: WorkflowMetrics;      // Total/success/failure counts
  phases: PhaseMetrics[];         // Per-phase statistics
  providers: ProviderMetrics[];   // Per-provider statistics
  persistence: PersistenceMetrics[]; // Per-backend statistics
  collectedAt: string;
};
```

**Implementation**: In-memory aggregation, no heavy monitoring system.

## Field Classification

### Required Fields
- `eventId`, `timestamp`, `severity`, `correlation.runId`, `source`, `type`, `operation`
- These fields MUST be present in all events

### Optional Fields
- `phaseId`, `stepId`, `parentId`, `durationMs`, `metadata`, `errorType`
- These fields provide additional context when available

### Derived Fields
- `averageDurationMs`, `totalTokens`, aggregate counts
- Computed from collected events, not stored per-event

## Observability vs Business Data

**Observability data** is for diagnostic and monitoring purposes:
- Event streams, metrics, traces
- May be sampled, aggregated, or discarded
- Schema optimized for querying and analysis

**Business data** is the core domain model:
- Projects, challenges, decisions, assets
- Must be fully persisted and consistent
- Schema optimized for application logic

**Boundary**: Observability events reference business entities by ID but don't duplicate their content.

## Integration Points

### Engines (challenge/decision/asset)
- Emit WorkflowEvent at phase start/end
- Emit RecoveryEvent on retry attempts
- Propagate correlation context to provider/persistence

### LLM Adapter
- Emit ProviderEvent for all provider interactions
- Include correlation context in events
- Normalize provider errors to NormalizedError

### Persistence Layer
- Emit PersistenceEvent for all operations
- Include correlation context in events
- Track operation success/failure

### CLI/Web Apps
- Subscribe to events for real-time visibility
- Display minimal observability summary
- Do NOT construct business events themselves

## Current Limitations

1. **No distributed tracing**: Correlation is local to single process
2. **No external platforms**: No integration with Datadog, Honeycomb, etc.
3. **No sampling**: All events emitted (may add sampling later)
4. **No retention policy**: Events kept in memory until process ends
5. **No query API**: Events consumed via subscription only

## Deferred to Future Phases

- External observability platform integration
- Distributed tracing with span propagation
- Event sampling and filtering
- Long-term event storage
- Advanced query and analysis tools
- Alerting and anomaly detection

## Validation

Contract validation via:
1. Zod schemas for all types
2. Unit tests for event emission
3. Integration tests for correlation propagation
4. Type-level tests for contract compliance

---

**Status**: Phase 5B foundation - minimal structured observability without platform expansion.

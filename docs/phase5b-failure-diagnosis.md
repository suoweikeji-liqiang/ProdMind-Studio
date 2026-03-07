# Phase 5B: Failure Diagnosis

## Overview

This document describes the failure diagnosis capabilities added in Phase 5B. The goal is to make failures answerable: "which step failed, why, and what was the context?"

## Design Principles

1. **Structured Errors**: Replace generic error messages with normalized error objects
2. **Context Preservation**: Capture correlation context at failure point
3. **Retryability Signal**: Indicate whether an error can be retried
4. **Diagnostic Path**: Enable tracing from symptom to root cause

## Normalized Error Structure

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

## Error Codes

Error codes follow the pattern: `{SOURCE}_{OPERATION}`

Examples:
- `PROVIDER_RATE_LIMIT` - Provider rate limit exceeded
- `PROVIDER_AUTH_FAILED` - Provider authentication failed
- `PERSISTENCE_WRITE_FAILED` - Persistence write operation failed
- `WORKFLOW_PHASE_FAILED` - Workflow phase execution failed

## Failure Context

```typescript
type FailureContext = {
  runId: string;           // Workflow run identifier
  phaseId?: string;        // challenge/decision/asset
  stepId?: string;         // Specific step within phase
  source: string;          // Layer that failed
  operation: string;       // Operation that failed
  timestamp: string;       // When it failed
};
```

## Integration Points

### Provider Layer
- Normalizes provider-specific errors to standard types
- Includes correlation context in error
- Signals retryability based on error type

### Persistence Layer
- Wraps storage errors with context
- Distinguishes transient vs permanent failures
- Preserves original error for debugging

### Engine Layer
- Catches normalized errors from lower layers
- Adds phase/step context
- Emits recovery events when retrying

## Diagnostic Workflow

When a workflow fails:

1. **Capture**: Error normalized at failure point with full context
2. **Propagate**: Error bubbles up with context preserved
3. **Log**: Structured event emitted with correlation ID
4. **Display**: User sees friendly message, operator sees full diagnostics

## Current Capabilities

✅ **Can diagnose:**
- Which phase failed (challenge/decision/asset)
- Which operation failed (provider call, persistence write, etc.)
- Whether error is retryable
- Full correlation path (runId → phaseId → stepId)

❌ **Cannot diagnose (deferred):**
- Cross-service failures (single process only)
- Historical failure patterns
- Automated root cause analysis
- Failure prediction

## Usage Examples

### Creating a Normalized Error

```typescript
import { createNormalizedError } from '@prodmind/shared-types';

const error = createNormalizedError(
  correlation,
  'provider',
  'rate_limit',
  'Rate limit exceeded, retry after 60s',
  true,
  originalError
);
```

### Formatting for Display

```typescript
import { formatErrorForUser, formatErrorForDiagnostics } from '@prodmind/shared-types';

// User-facing
console.log(formatErrorForUser(error));
// Output: [PROVIDER_RATE_LIMIT] Rate limit exceeded, retry after 60s

// Operator diagnostics
console.log(formatErrorForDiagnostics(error));
// Output: Multi-line diagnostic with full context
```

## Coordination with Recovery

Failure diagnosis integrates with existing recovery semantics:

1. Error normalized at failure point
2. Retryable flag checked by recovery logic
3. Recovery event emitted with attempt number
4. If recovery succeeds, workflow continues
5. If recovery fails, final error includes all attempts

## Limitations

1. **Single Process**: No distributed tracing across services
2. **No Aggregation**: Each error independent, no pattern detection
3. **No Persistence**: Errors not stored long-term (only in workflow history)
4. **Manual Analysis**: No automated root cause analysis

## Future Enhancements (Deferred)

- Error aggregation and pattern detection
- Automated retry strategy selection
- Failure prediction based on historical data
- Integration with external error tracking platforms
- Advanced root cause analysis

---

**Status**: Phase 5B foundation - structured failure diagnosis without heavy platform.

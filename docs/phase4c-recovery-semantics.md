# Phase 4C: Recovery Semantics

## Overview

Defines minimal failure recovery and retry capabilities for workflow phases.

## Recovery Scope

### Recoverable Failures

**Challenge Phase Failure**
- Can retry from beginning with same idea
- Previous partial state discarded
- New run ID generated

**Decision Phase Failure**
- Can retry with existing challenge artifact
- Challenge results preserved
- Decision re-executed from scratch

**Asset Phase Failure**
- Can retry with existing challenge + decision artifacts
- Only asset generation re-executed

### Non-Recoverable States

- Partial LLM responses (must restart phase)
- Network timeouts (must restart phase)
- Corrupted artifacts (must restart from failed phase)

## Retry Strategy

**Manual Retry Only** (Phase 4C scope)
- User explicitly re-runs workflow command
- System detects existing artifacts
- Skips completed phases automatically

**Automatic Retry** (Deferred to Phase 5)
- Exponential backoff
- Max retry limits
- Transient error detection

## Implementation

### Phase Skip Logic

```typescript
// If challenge.md exists and valid -> skip challenge
// If decision.json exists and valid -> skip decision
// Always run asset phase (idempotent)
```

### Error Context Preservation

All phase failures record:
- Error message
- Timestamp
- Phase name
- Retry count (if applicable)

## Deferred

- Automatic retry with backoff
- Partial phase checkpointing
- Distributed transaction recovery
- Workflow pause/resume

# Phase 4C: Persistence Boundary

## Overview

This document defines the minimal persistence boundary for workflow runs, enabling history, recovery, and observability without introducing heavy database productization.

## Persistence Strategy

**Principle**: File-based persistence aligned with existing asset bundle pattern.

**Location**: `{projectPath}/.prodmind/history/`

## What Must Be Persisted

### 1. Workflow Run Record

```typescript
interface WorkflowRun {
  runId: string;                    // Unique identifier
  idea: string;                     // Original input
  status: WorkflowStatus;           // Current state
  startedAt: string;                // ISO timestamp
  completedAt?: string;             // ISO timestamp
  phases: PhaseExecution[];         // Phase-level tracking
  error?: string;                   // Failure reason
}

type WorkflowStatus = 'running' | 'completed' | 'failed';
```

### 2. Phase Execution

```typescript
interface PhaseExecution {
  phase: 'challenge' | 'decision' | 'asset';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  retryCount?: number;
}
```

### 3. Workflow Result

```typescript
interface WorkflowResult {
  runId: string;
  challenge?: {
    artifactPath: string;           // Relative path
    hypothesesCount: number;
  };
  decision?: {
    artifactPath: string;
    recommendation: string;          // Summary only
  };
  assets?: {
    projectPath: string;
    files: string[];                 // Generated files
  };
}
```

## What Remains Ephemeral

- In-memory workflow queue (Web server)
- Intermediate LLM responses (logged but not persisted)
- Full challenge/decision session state (only artifacts persisted)
- Real-time status updates (reconstructed from persisted state)

## File Structure

```
{projectPath}/
  .prodmind/
    history/
      runs.jsonl              # Append-only run records
      {runId}/
        run.json              # Full run details
        result.json           # Final result (if completed)
```

## Persistence Operations

### Save Run
- Append to `runs.jsonl` (one line per run)
- Write `{runId}/run.json` on status change
- Write `{runId}/result.json` on completion

### List Runs
- Read `runs.jsonl` (most recent first)
- Support basic filtering by status

### Read Run
- Read `{runId}/run.json` for details
- Read `{runId}/result.json` for results

## Recovery Semantics

### Recoverable States
- **Failed challenge**: Can retry from beginning
- **Failed decision**: Can retry with existing challenge artifact
- **Failed asset**: Can retry with existing decision artifact

### Non-Recoverable States
- Partial LLM responses (must restart phase)
- In-flight network requests (must restart phase)

## Observability Data

Persisted in `PhaseExecution`:
- Phase start/end timestamps
- Phase duration
- Retry count
- Error messages

## Deferred

- Multi-user access control
- Database-backed persistence
- Complex query/filtering
- Workflow versioning
- Audit logs
- Distributed tracing

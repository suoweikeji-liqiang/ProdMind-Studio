# Phase 5A: Persistence Abstraction Boundary

## Overview

This document defines the persistence abstraction boundary introduced in Phase 5A to enable evolution from file-based storage to alternative backends without disrupting the system.

## Core Principle

**Abstraction before migration**: Define clear boundaries now, extend implementations later.

## Persistence Core vs Backend-Specific

### Persistence Core (shared-types)

The `PersistenceRepository` interface defines the contract all backends must implement:

```typescript
interface PersistenceRepository {
  saveRun(run: WorkflowRun): Promise<void>;
  updateRun(run: WorkflowRun): Promise<void>;
  saveResult(result: WorkflowResult): Promise<void>;
  listRuns(limit?: number): Promise<WorkflowRun[]>;
  getRun(runId: string): Promise<WorkflowRun | null>;
  getResult(runId: string): Promise<WorkflowResult | null>;
}
```

**Core capabilities:**
- CRUD operations for workflow runs and results
- List/query operations with optional limits
- Null-safe retrieval (returns null if not found)

### Backend-Specific Implementation

Each backend implements `PersistenceRepository` with storage-specific details:

**File Backend** (`file-repository.ts`):
- Stores runs in `.prodmind/history/{runId}/`
- Uses JSONL index for fast listing
- No external dependencies

**Future backends** (SQLite, PostgreSQL):
- Must implement the same interface
- Handle their own connection management
- Provide backend-specific optimizations

## Why Abstraction First?

1. **Validate the boundary**: Ensure the interface works for multiple backends before heavy migration
2. **Preserve stability**: File backend remains default and fully functional
3. **Enable experimentation**: Add lightweight backends (SQLite) without committing to heavy infrastructure
4. **Defer complexity**: Avoid premature PostgreSQL productization with migrations, ops, monitoring

## Architecture

```
┌─────────────────────────────────────────┐
│         HistoryStore (facade)           │
│  - Maintains projectPath context        │
│  - Delegates to PersistenceRepository   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      PersistenceRepository (interface)  │
│  - Backend-agnostic contract            │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ FileRepository│    │SQLiteRepository│
│ (default)     │    │ (Phase 5A)    │
└──────────────┘    └──────────────┘
```

## Extension Points

To add a new backend:

1. Implement `PersistenceRepository` interface
2. Handle connection/initialization in constructor
3. Map domain types to storage format
4. Register in backend selection mechanism

## Non-Goals (Phase 5A)

- Full PostgreSQL productization
- Schema migrations framework
- Multi-tenancy / workspace isolation
- Advanced query capabilities (search, filters)
- Distributed transactions

These remain deferred until clear product need emerges.

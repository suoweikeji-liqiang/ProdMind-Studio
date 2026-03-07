# Data Compatibility and Migration Notes

## Overview

This document defines compatibility rules between persistence backends to ensure data portability and prevent format fragmentation.

## Core Compatibility Contract

All persistence backends MUST maintain compatibility on these core fields:

### WorkflowRun Schema

```typescript
{
  runId: string;           // UUID, primary key
  idea: string;            // Original user input
  status: 'running' | 'completed' | 'failed';
  startedAt: string;       // ISO 8601 timestamp
  completedAt?: string;    // ISO 8601 timestamp
  phases: PhaseExecution[];
  error?: string;
}
```

### WorkflowResult Schema

```typescript
{
  runId: string;           // Foreign key to WorkflowRun
  challenge?: {
    artifactPath: string;
    hypothesesCount: number;
  };
  decision?: {
    artifactPath: string;
    recommendation: string;
  };
  assets?: {
    projectPath: string;
    files: string[];
  };
}
```

## Backend-Specific Storage

Backends may use different storage mechanisms but MUST preserve semantic equivalence:

### File Backend
- Stores as JSON files in `.prodmind/history/{runId}/`
- Uses JSONL index for listing
- Direct file system access

### SQLite Backend
- Stores in relational tables
- JSON columns for nested structures
- SQL queries for listing

### Future PostgreSQL Backend
- Must maintain same schema semantics
- May add indexes, constraints, triggers
- Must support same query patterns

## Compatibility Rules

1. **Timestamps**: Always ISO 8601 strings, never Unix epochs
2. **IDs**: Always strings (UUIDs), never integers
3. **Optional fields**: Use `undefined` in TypeScript, `NULL` in SQL
4. **Nested objects**: Preserve structure, may serialize as JSON in SQL
5. **Arrays**: Preserve order, may serialize as JSON in SQL

## Migration Strategy (Future)

When adding PostgreSQL or other backends:

1. **No automatic migration**: Users explicitly choose backend
2. **Export/import tools**: Provide utilities to move data between backends
3. **Schema versioning**: Track schema version in metadata
4. **Backward compatibility**: New backends must read old formats

## Non-Goals (Phase 5A)

- Automatic schema migrations
- Cross-backend replication
- Multi-backend queries
- Data transformation pipelines

These remain deferred until clear product need.

## Testing Strategy

Contract tests validate compatibility:

```typescript
// Same test suite runs against all backends
describe('Backend Compatibility', () => {
  backends.forEach(backend => {
    it(`${backend} preserves data structure`, async () => {
      // Save with backend A
      // Read with backend B
      // Assert equality
    });
  });
});
```

## SQLite Build Requirements

**Windows**: Requires Visual Studio Build Tools or similar C++ compiler
**macOS/Linux**: Usually works out of box with system compilers

If SQLite backend fails to load, system falls back to file backend automatically.

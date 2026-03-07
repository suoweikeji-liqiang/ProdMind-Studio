# Phase 5A Deferred Items

## SQLite Native Compilation

**Issue**: SQLite backend requires native compilation (better-sqlite3)
**Status**: Implementation complete, requires build tools
**Requirements**:
- Windows: Visual Studio Build Tools
- macOS/Linux: System C++ compiler

**Workaround**: System falls back to file backend if SQLite unavailable

## Items Deferred to Phase 5B or Later

### Persistence
- Automatic schema migrations
- Cross-backend data export/import tools
- PostgreSQL backend implementation
- Multi-backend replication
- Advanced query capabilities (search, filters)

### Provider Integration
- Provider marketplace
- Dynamic provider discovery
- Multi-provider routing
- Provider-specific optimizations in engines
- Advanced retry strategies with exponential backoff

### Configuration
- Configuration file system (.prodmindrc)
- Configuration UI in CLI
- Complex config merging (user/project/env)
- Configuration validation and schema

### Observability
- Full distributed tracing
- Observability dashboard
- Metrics aggregation
- Log shipping to external systems

### Productization (Not Phase 5)
- Authentication / RBAC
- Multi-user collaboration
- Workspace management
- Heavy PostgreSQL ops stack
- Advanced observability platform

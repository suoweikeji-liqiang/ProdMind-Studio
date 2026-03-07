# Backend and Provider Support Matrix

## Persistence Backends

| Backend | Status | Default | Usage | Limitations | Requirements |
|---------|--------|---------|-------|-------------|--------------|
| **File** | Production-ready | ✓ Yes | Local development, single-user, <100 workflows | No query/filter, no pagination | None |
| **SQLite** | Experimental | ✗ No | Validation, local testing | Requires native compilation | C++ compiler (Visual Studio on Windows) |
| **PostgreSQL** | Not implemented | ✗ No | Deferred to Phase 5B+ | N/A | N/A |

### File Backend

**Current Status:** Production-ready
**Intended Usage:** Default persistence for internal pilot
**Configuration:**
```bash
# Default - no config needed
node dist/index.js workflow "your idea"

# Custom path
PERSISTENCE_PATH=/custom/path node dist/index.js workflow "your idea"
```

**Limitations:**
- Suitable for <100 workflows
- No advanced query capabilities
- No pagination
- Linear scan for listing

**Storage Location:** `{projectPath}/.prodmind/history/`

### SQLite Backend

**Current Status:** Experimental (validation backend)
**Intended Usage:** Validate persistence abstraction
**Configuration:**
```bash
PERSISTENCE_BACKEND=sqlite node dist/index.js workflow "your idea"
```

**Limitations:**
- Requires native compilation (better-sqlite3)
- Windows: Requires Visual Studio Build Tools
- macOS/Linux: Usually works with system compiler
- Falls back to file backend if compilation fails

**Storage Location:** `{projectPath}/.prodmind/history.db`

## Provider Modes

| Provider | Status | Default | Usage | Limitations | Requirements |
|----------|--------|---------|-------|-------------|--------------|
| **Fake** | Production-ready | ✓ Yes | CI, testing, local dev | Pre-configured responses only | None |
| **OpenAI** | Opt-in | ✗ No | Real provider smoke testing | API costs, rate limits | API key |
| **Anthropic** | Opt-in | ✗ No | Real provider smoke testing | API costs, rate limits | API key |

### Fake Provider

**Current Status:** Production-ready
**Intended Usage:** Default for CI and local development
**Configuration:**
```bash
# Default - no config needed
node dist/index.js workflow "your idea"
```

**Benefits:**
- No API costs
- Deterministic output
- Fast execution
- CI-safe

**Limitations:**
- Pre-configured responses only
- No real LLM capabilities

### Real Provider (OpenAI)

**Current Status:** Opt-in
**Intended Usage:** Smoke testing, validation
**Configuration:**
```bash
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx node dist/index.js workflow "your idea"
```

**Cost:** ~$0.01-0.10 per workflow (depends on model)
**Limitations:**
- Requires API key
- Incurs costs
- Subject to rate limits
- Not default for CI

### Real Provider (Anthropic)

**Current Status:** Opt-in
**Intended Usage:** Smoke testing, validation
**Configuration:**
```bash
PROVIDER_MODE=real PROVIDER_TYPE=anthropic ANTHROPIC_API_KEY=sk-ant-xxx node dist/index.js workflow "your idea"
```

**Cost:** ~$0.01-0.10 per workflow (depends on model)
**Limitations:**
- Requires API key
- Incurs costs
- Subject to rate limits
- Not default for CI

## Compatibility Matrix

| Backend | Fake Provider | Real Provider |
|---------|---------------|---------------|
| File | ✓ Supported | ✓ Supported |
| SQLite | ✓ Supported | ✓ Supported |

All backend/provider combinations are supported. Selection is independent.

## Future Roadmap

**Phase 5B+:**
- PostgreSQL backend (production-grade)
- Provider health checks
- Automatic retry strategies
- Multi-provider fallback

**Not Planned:**
- Provider marketplace
- Dynamic provider discovery
- Cross-backend replication

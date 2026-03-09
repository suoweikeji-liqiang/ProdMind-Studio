# Backend and Provider Support Matrix

## Persistence Backends

| Backend | Status | Default | Intended Usage | Notes |
|---------|--------|---------|----------------|-------|
| File | Internal-pilot ready | Yes | Default single-user workflows | Stable default path |
| SQLite | Validated secondary backend when environment supports native binding | No | Local operator validation and secondary-backend confidence checks | Use `node scripts/validate-sqlite-backend.mjs`; skip is explicit when binding is unavailable |
| PostgreSQL | Deferred | No | Out of current scope | Heavy DB productization intentionally deferred |

## Provider Modes

| Provider Mode | Status | Default | Intended Usage | Notes |
|---------------|--------|---------|----------------|-------|
| Fake | Internal-pilot ready | Yes | CI, tests, local development | Deterministic and cost-free |
| OpenAI | Opt-in internal-pilot | No | Real-provider validation and local single-user runs | Adapter-owned routing/policy summary available |
| Anthropic | Opt-in internal-pilot | No | Real-provider validation and local single-user runs | Adapter-owned routing/policy summary available |

## Provider Routing and Reliability

| Capability | Fake | OpenAI | Anthropic | Notes |
|------------|------|--------|-----------|-------|
| Capability-aware route selection | Yes | Yes | Yes | Adapter checks required capabilities before execution |
| Deterministic default path | Yes | Yes | Yes | Primary route evaluated first |
| Mismatch rejection | Yes | Yes | Yes | Clear selection failure when no route satisfies requirements |
| Explicit fallback only | Yes | Yes | Yes | Fallback remains opt-in, not marketplace routing |
| Conservative timeout policy | Yes | Yes | Yes | Effective timeout is clamped to policy limits |
| Conservative retry policy | Yes | Yes | Yes | Effective retries are clamped to policy limits |
| Failure stage visibility | Yes | Yes | Yes | Selection / primary / fallback stages exposed in summaries |
| Usage summary | Estimated | Provider-dependent | Provider-dependent | Marked available / estimated / unavailable |
| Cost summary | Minimal | Estimated or unavailable | Estimated or unavailable | Not billing-grade |

## Validation Paths

| Validation Path | Status | Blocking Default CI | Notes |
|-----------------|--------|---------------------|-------|
| Fake-provider tests | Ready | Yes | Default quality gate path |
| Real-provider smoke | Opt-in operator-run | No | Use `node scripts/smoke-real-provider.mjs` |
| SQLite validation | Opt-in operator-run | No | Use `node scripts/validate-sqlite-backend.mjs` |

## CLI / Web Visibility

| Surface | Provider/Model | Route/Policy | Retries/Timeouts | Fallback | Usage/Cost |
|---------|----------------|--------------|------------------|----------|------------|
| CLI workflow summary | Yes | Yes | Yes | Yes | Yes |
| CLI history show | Yes | Yes | Yes | Yes | Yes |
| Web results page | Yes | Yes | Yes | Yes | Yes |

## Explicitly Not in Scope

- Provider marketplace
- Dynamic provider discovery
- Billing ledger
- Budget control product
- Dashboard analytics product
- Multi-user provider governance

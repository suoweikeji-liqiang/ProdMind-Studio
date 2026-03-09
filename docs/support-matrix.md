# Backend and Provider Support Matrix

## Persistence Backends

| Backend | Status | Default | Intended Usage | Notes |
|---------|--------|---------|----------------|-------|
| File | Internal-pilot ready | Yes | Default single-user workflows | Suitable for current internal pilot |
| SQLite | Validation / environment-dependent | No | Abstraction validation and local experiments | Native binding availability still matters |
| PostgreSQL | Deferred | No | Not in Phase 5C scope | Heavy DB productization intentionally deferred |

## Provider Modes

| Provider Mode | Status | Default | Intended Usage | Notes |
|---------------|--------|---------|----------------|-------|
| Fake | Internal-pilot ready | Yes | CI, tests, local development | Deterministic, no API cost |
| OpenAI | Opt-in internal-pilot | No | Real-provider validation and local single-user runs | Bounded retry/timeout, explicit fallback only |
| Anthropic | Opt-in internal-pilot | No | Real-provider validation and local single-user runs | Bounded retry/timeout, explicit fallback only |

## Provider Capability / Reliability Surface

| Capability | Fake | OpenAI | Anthropic | Notes |
|------------|------|--------|-----------|-------|
| Streaming | Yes | Yes | Yes | Validated through adapter contract |
| Structured output path | Yes | Yes | Yes | Adapter encapsulates fallback parsing path |
| Capability-aware rejection | Yes | Yes | Yes | Mismatch handled in `llm-adapter` |
| Bounded retry | Yes | Yes | Yes | Conservative adapter-owned policy |
| Bounded timeout | Yes | Yes | Yes | Per-attempt timeout policy |
| Explicit fallback | Yes | Yes | Yes | Only when configured |
| Usage summary | Estimated | Provider-dependent | Provider-dependent | Marked available / estimated / unavailable |
| Cost summary | Minimal | Estimated or unavailable | Estimated or unavailable | Not billing-grade |

## CLI / Web Visibility

| Surface | Provider/Model | Retries | Timeout/Fallback | Usage/Cost |
|---------|----------------|---------|------------------|------------|
| CLI workflow summary | Yes | Yes | Yes | Yes |
| CLI history show | Yes | Yes | Yes | Yes |
| Web results page | Yes | Yes | Yes | Yes |

## Explicitly Not in Scope

- Provider marketplace
- Dynamic provider discovery
- Billing ledger
- Dashboard analytics product
- Multi-user provider governance

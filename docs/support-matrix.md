# Support Matrix

## V1 User Surfaces

| Surface | Status | Intended Usage | Notes |
|---------|--------|----------------|-------|
| Web home | Internal V1 candidate | Start topic-first sessions | Primary entry |
| Web session/history/replay | Migrating V1 surface | Continue sessions and revisit process history | Conversation-first target surface |
| Web workflow/results | Legacy compatibility | Submit and inspect old workflow runs | Transitional path during migration |
| CLI workflow | Internal V1 candidate | Operator-run legacy workflow | Secondary surface and V1 baseline |
| CLI history list/detail | Internal V1 candidate | Operator revisit and diagnosis | Stronger text-based recovery guidance |

## Persistence Backends

| Backend | Status | Default | Intended Usage | Notes |
|---------|--------|---------|----------------|-------|
| File | Internal-pilot ready | Yes | Default single-user sessions and legacy workflows | Stable path for V1 |
| SQLite | Validated secondary backend | No | Optional operator validation | Depends on native binding support |
| PostgreSQL | Deferred | No | Out of V1 scope | Heavy DB productization intentionally deferred |

## Provider Modes

| Mode | Status | Default | Intended Usage | Notes |
|------|--------|---------|----------------|-------|
| Fake | Internal-pilot ready | Yes | Tests, CI, local usage | Deterministic and cost-free |
| OpenAI | Opt-in internal-pilot | No | Real-provider smoke and local validation | Adapter-owned routing and policy summary available |
| Anthropic | Opt-in internal-pilot | No | Real-provider smoke and local validation | Adapter-owned routing and policy summary available |

## Provider Visibility

| Surface | Provider/Model | Route/Policy | Retries/Timeouts | Fallback | Usage/Cost |
|---------|----------------|--------------|------------------|----------|------------|
| CLI workflow summary | Yes | Yes | Yes | Yes | Yes |
| CLI history show | Yes | Yes | Yes | Yes | Yes |
| Web results | Yes | Yes | Yes | Yes | Yes |
| Web history detail | Yes | Minimal | Yes | Yes | Minimal |

## Validation Paths

| Validation Path | Status | Blocking Default CI | Notes |
|-----------------|--------|---------------------|-------|
| `pnpm run check:all` | Required | Yes | Main V1 gate |
| Fake-provider package tests | Ready | Yes | Default verification path |
| Real-provider smoke | Opt-in operator-run | No | Requires credentials and spends tokens |
| SQLite validation | Opt-in operator-run | No | May skip with explicit native-binding reason |

## Explicitly Out Of Scope

- auth / RBAC
- multi-user collaboration
- workspace / tenant support
- provider marketplace
- billing system
- dashboard analytics product
- heavy DB platformization

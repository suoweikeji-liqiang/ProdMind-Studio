# Phase 5D Routing Policy

## Intent

Phase 5D tightens provider routing without introducing a provider platform. Routing remains owned by `packages/llm-adapter`.

## Rules

- Deterministic default path: primary route is evaluated first.
- Capability-aware selection: required capabilities are checked before execution.
- Mismatch rejection: if no eligible route satisfies required capabilities, the adapter returns a normalized selection failure.
- Explicit fallback only: fallback is attempted only when explicitly configured and policy-eligible.
- No app-owned routing: CLI and Web consume summaries only.

## Selection Flow

1. Build the primary route candidate.
2. Build the explicit fallback candidate if configured.
3. Check required capabilities against the primary route.
4. If primary matches, execute primary.
5. If primary mismatches and explicit fallback matches, route directly to fallback.
6. If primary fails with an eligible failure type and explicit fallback is allowed, attempt fallback.
7. Otherwise return a normalized failure summary.

## What This Is Not

- No provider marketplace
- No dynamic provider ranking
- No weighted scoring engine
- No route selection in engines or apps

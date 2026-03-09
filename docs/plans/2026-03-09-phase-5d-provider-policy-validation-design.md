# Phase 5D Provider Policy Validation Design

**Date:** 2026-03-09

## Goal

Tighten provider routing and reliability behavior from the Phase 5C baseline without turning ProdMind-Studio into a provider platform. Phase 5D is a policy tuning and validation pass focused on adapter-owned routing, conservative defaults, stronger operator-run validation, clearer SQLite secondary-backend validation, and an evidence-based budget guardrails assessment.

## Scope Boundaries

Formal code changes are limited to:

- `packages/llm-adapter`
- `packages/shared-types`
- `packages/asset-engine`
- `apps/cli`
- `apps/web`
- `docs`
- `scripts`
- `tests`

Explicitly out of scope:

- auth / RBAC
- multi-user collaboration
- provider marketplace UI
- billing system
- heavy dashboard platform
- PostgreSQL productization
- large UI redesign
- non-provider-related engine refactors

## Design Principles

1. Provider routing remains adapter-owned.
2. Deterministic selection beats dynamic strategy.
3. Conservative defaults beat aggressive recovery.
4. Validation paths stay operator-run and non-CI-blocking when they need real infrastructure.
5. Budget control is evidence-driven; no half-built billing features.

## Options Considered

### Option 1: Adapter-owned policy routing refinement

Keep provider policy logic inside `packages/llm-adapter`, add deterministic route resolution, capability-aware candidate checks, bounded override normalization, and richer execution summaries.

Why this is recommended:

- Preserves module boundaries from Phase 5C.
- Improves reliability without introducing a provider platform.
- Keeps apps and persistence layers as consumers of contract-backed summaries only.

### Option 2: App-owned provider policy assembly

Move route and policy decisions into CLI/Web config layers.

Why rejected:

- Leaks provider logic into apps.
- Creates duplicate policy behavior across surfaces.
- Violates the 5D requirement that routing remain adapter-owned.

### Option 3: Separate policy engine or provider registry

Build a generalized routing layer with provider registration, scoring, or dynamic ranking.

Why rejected:

- This is provider platform work, not a policy tuning pass.
- Increases abstraction cost without evidence that current pilot usage needs it.

## Recommended Architecture

### 1. Shared provider policy contract refinement

Extend the Phase 5C provider contracts with small, explicit policy and routing structures:

- reliability policy fields with default and maximum bounds
- fallback mode constrained to explicit opt-in behavior
- route candidate / resolution / rejection structures
- execution summary fields that explain selection stage, failure stage, and effective policy snapshot

This remains a contract layer only. It is not a registry, catalog, or provider marketplace surface.

### 2. Adapter-owned route resolution

The adapter will normalize primary and optional fallback configuration into a deterministic candidate list. Route selection will stay simple:

1. Evaluate the primary route first.
2. If the primary route cannot satisfy required capabilities, reject immediately unless an explicit fallback candidate exists and satisfies the capability requirements.
3. If the primary route fails with an eligible failure type and fallback is explicitly allowed, try the fallback route.
4. If neither route is valid, return a normalized rejection with summary data.

This is stronger than the Phase 5C explicit fallback baseline because the adapter decides route eligibility before execution rather than treating fallback as a mostly reactive branch.

### 3. Conservative reliability defaults

Reliability policy will be tuned conservatively:

- bounded retry only
- explicit default timeout and hard maximum timeout
- explicit default retry count and hard retry ceiling
- fallback only when enabled through explicit configuration
- consistent retryable vs non-retryable classification retained from Phase 5C

Request overrides will be clamped by policy limits rather than accepted verbatim.

### 4. Execution and visibility model

Execution summaries remain the system-wide visibility surface. They will be expanded to expose:

- initial route candidate
- resolved route
- whether fallback was attempted or used
- failure stage
- effective timeout and retry values
- usage and cost summary

CLI, Web, and persistence consume these summaries. They do not implement provider logic.

### 5. Validation paths

Two validation paths will be strengthened:

- real-provider smoke, still opt-in and non-CI-blocking
- SQLite validation, environment-backed and clearly skipped when native binding support is unavailable

The file backend remains the default stable path. SQLite remains a validated secondary backend when the environment supports it.

### 6. Budget guardrails assessment

Budget guardrails will be assessed, not assumed. Evidence will be limited to:

- current internal pilot single-user scope
- existing usage and cost visibility surfaces
- operator-run smoke flow
- runbook and support matrix maturity

Absent evidence of uncontrolled spend or operator pain, the Phase 5D conclusion will be to defer implementation.

## Data Flow

1. Runtime config constructs a real or fake adapter.
2. Adapter normalizes provider candidates and policy bounds.
3. A request enters with optional capability requirements and optional override hints.
4. Adapter resolves the route deterministically.
5. Adapter executes with conservative timeout / retry bounds.
6. Adapter optionally executes explicit fallback if policy and failure type allow it.
7. Adapter records an execution summary with route, policy, failure-stage, and usage data.
8. CLI/Web display the summary; asset persistence stores the summary; docs describe operator expectations.

## Testing Strategy

1. Add failing contract tests for new routing and policy types.
2. Add failing adapter tests for deterministic route selection, override clamping, mismatch rejection, and fallback eligibility.
3. Add or extend smoke contract tests for stronger operator-run validation.
4. Add SQLite validation coverage or explicit skip-path assertions for native binding unavailability.
5. Run `pnpm run check:all`.

Real-provider smoke remains opt-in and is not added to the default CI gate.

## Documentation Plan

Add:

- `docs/phase5d-routing-policy.md`
- `docs/phase5d-reliability-policy.md`
- `docs/phase5d-smoke-ops.md`
- `docs/phase5d-budget-assessment.md`
- `docs/phase5d-deferred.md`

Update:

- `docs/runbook.md`
- `docs/release-readiness.md`
- `docs/support-matrix.md`
- `docs/README.md`

## Deferred Items

These remain deferred beyond Phase 5D unless pilot evidence changes:

- budget caps or kill switches
- quota ledgers
- billing-grade cost accounting
- dynamic provider ranking
- provider marketplace constructs
- dashboard analytics product
- heavy database productization

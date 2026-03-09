# Phase 5C Provider Maturity Design

**Date:** 2026-03-09

**Scope:** Provider maturity pass only. This design improves provider reliability, capability awareness, usage visibility, and validation without expanding into a provider platform, billing system, or dashboard product.

## Goals

- Formalize provider capability, reliability, and usage contracts.
- Move timeout, retry, fallback, and capability-aware selection into `packages/llm-adapter`.
- Keep engines and apps on contract-only consumption.
- Add minimal usage and cost visibility to persisted workflow history and operator surfaces.
- Strengthen local opt-in real-provider validation.

## Explicit Non-Goals

- No auth, RBAC, or multi-user work.
- No provider marketplace, dynamic provider discovery, or advanced routing engine.
- No budget enforcement or billing ledger.
- No heavy DB productization.
- No major UI redesign.

## Recommended Approach

Use a contract-first, adapter-centered design.

- `packages/shared-types` defines provider maturity contracts used across the repo.
- `packages/llm-adapter` owns provider selection, capability validation, timeout, retry, fallback, error normalization, and usage/cost summary generation.
- `packages/challenge-engine` and `packages/decision-engine` declare only minimal capability requirements per call.
- `packages/asset-engine` persists normalized provider execution summaries.
- `apps/cli` and `apps/web` only display normalized summaries.

## Capability Boundary

Capability is not enablement.

- Capability means what a provider/model path can do when selected.
- Enablement means whether it is currently configured, has credentials, or is chosen as primary/fallback.
- A provider may advertise `structuredOutput: true` while still not being active for the current run.

The contract distinguishes:

- Required fields: provider name, model name, capability flags, timeout/retry bounds, usage availability state.
- Optional fields: fallback target, cost estimate metadata, token breakdowns, streaming notes.
- Runtime-derived fields: retries performed, timeout encountered, fallback used, selected provider/model, usage/cost summary.

## Architecture

### 1. Shared Contracts

Introduce provider maturity types in `packages/shared-types`:

- `ProviderCapabilityProfile`
- `ProviderReliabilityPolicy`
- `ProviderUsageRecord`
- `ProviderUsageSummary`
- `ProviderSelectionRequirement`
- `ProviderSelectionResult`
- `ProviderExecutionSummary`

These contracts are used by the adapter, persisted with workflow history/results, and rendered by CLI/Web.

### 2. Adapter Reliability Layer

`packages/llm-adapter` becomes the single provider reliability layer:

1. Accept call requirements and optional execution policy overrides.
2. Resolve primary provider metadata.
3. Reject early if required capabilities are unavailable.
4. Run the request with bounded timeout and bounded retry.
5. Retry only normalized retryable failures.
6. Use fallback only when explicitly configured and only for allowed failure categories.
7. Emit observability events and return a normalized execution summary.

### 3. Engine Hooks

The engines add only minimal call requirement plumbing:

- `challenge-engine` role calls request `streaming`.
- Structured generation requests declare `structuredOutput`.
- No engine contains retry, timeout, fallback, or provider-specific branching.

### 4. Persistence and Surface

Workflow history/result contracts gain minimal provider summary storage.

- Store execution summaries, not raw provider payloads.
- Store usage/cost state as `available`, `estimated`, or `unavailable`.
- Keep the shape small enough for CLI/Web and operator inspection.

## Error Handling

The adapter exposes stable normalized failure modes:

- `capability_mismatch`
- `timeout`
- `retry_exhausted`
- `fallback_not_configured`
- `fallback_failed`
- existing normalized provider classes such as `rate_limit`, `auth`, `network`, `invalid_request`, `model_error`, `unknown`

Rules:

- Retry only when `retryable = true`.
- Retry is bounded and conservative.
- Timeout applies per attempt.
- Fallback is explicit only.
- Capability mismatch without explicit fallback is a hard stop with clear summary.

## Usage and Cost Surface

Phase 5C adds a minimal visibility surface, not a billing system.

- Record provider, model, request count, input/output/total tokens when available.
- Record cost as:
  - `available` when sourced directly
  - `estimated` when derived from configured rates and token usage
  - `unavailable` when the provider path does not expose stable values
- CLI and Web show only normalized summary values.

## Testing Strategy

Use TDD and keep CI fake-provider safe.

- Contract tests for shared types and fixtures.
- Adapter unit tests for capability validation, retry, timeout, fallback, and usage normalization.
- Engine tests for requirement propagation only.
- Asset-engine tests for provider summary persistence.
- CLI/Web tests for summary rendering only.
- Local opt-in real-provider smoke tests for streaming, structured output, retry/timeout behavior, fallback path when configured, and usage/cost visibility.

## Phase Split

### Phase 5C-1

- Shared provider maturity contracts
- Adapter reliability foundation
- Usage/cost surface
- Capability-aware selection basics

### Phase 5C-2

- Smoke workflow strengthening
- CLI/Web visibility
- Readiness and operator docs
- Final validation and deferred list updates

This ordering is kept because the second half depends directly on the first half's contracts and summaries.

## Deferred Beyond 5C

- Multi-provider marketplace UX
- Dynamic provider registration/discovery
- Advanced routing policies by role/workload/cost budget
- Automated budget guardrails
- Historical cost analytics dashboards
- Cross-user provider governance

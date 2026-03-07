# Test Layout

## Purpose
Defines where tests and shared test assets live so that Phase 1/2/3 migrations follow one layout.

## Directory Rules
- `tests/fixtures/`
  - Shared static inputs (session seeds, parser inputs, state samples).
  - Reused by multiple packages.
- `tests/golden/`
  - Golden outputs for artifact/export stability checks.
  - Changes require explicit review in PR.
- `tests/fakes/`
  - Deterministic fake providers and stubs (especially fake LLM provider).
- `tests/helpers/`
  - Cross-package test helpers (tmp dirs, data loaders, assert utilities).

## Colocated vs Centralized Tests
- Colocated (`src/**/*.test.ts`) SHOULD be used for:
  - pure unit tests tied to one module
  - parser/rule/state utility tests
- Centralized (`tests/**`) SHOULD be used for:
  - cross-package integration tests
  - contract tests
  - golden file tests
  - fake provider shared implementations

## Package-Level Expectations
- `packages/shared-types`
  - colocated unit + contract tests
- `packages/llm-adapter`
  - colocated unit + shared fake provider tests from `tests/fakes`
- `packages/asset-engine`
  - colocated unit + golden tests using `tests/golden`
- `packages/challenge-engine`, `packages/decision-engine`
  - colocated rule/state tests + centralized flow regression tests
- `apps/cli`, `apps/web`
  - app-level integration/e2e tests should be centralized under `tests/`

## TODO Replacement Path
- Current scaffold provides directories and check scripts only.
- Next step is to add first concrete suites:
  - `tests/fakes/fake-llm-provider.*`
  - `tests/golden/asset-engine/*.md`
  - cross-engine contract tests under `tests/integration/`


# Phase 5D Provider Policy Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tighten adapter-owned provider routing and reliability policy defaults, strengthen operator-run validation paths, and update visibility/docs without turning the system into a provider platform.

**Architecture:** Extend the shared provider contract with minimal routing and policy types, implement deterministic route resolution and conservative override clamping inside `packages/llm-adapter`, then expose richer execution summaries to CLI/Web/persistence and strengthen smoke/SQLite validation flows. Keep all provider decision logic inside the adapter and treat budget guardrails as an assessment-only outcome unless evidence clearly demands more.

**Tech Stack:** TypeScript, Vitest, Node.js scripts, existing workspace packages (`@prodmind/shared-types`, `@prodmind/llm-adapter`, `@prodmind/asset-engine`, CLI/Web apps)

---

### Task 1: Extend shared provider policy contracts

**Files:**
- Modify: `packages/shared-types/src/provider/contracts.ts`
- Modify: `packages/shared-types/src/index.ts`
- Test: `packages/shared-types/test/provider-contracts.test.ts`

**Step 1: Write the failing test**

Add test coverage for:
- reliability default/max policy fields
- explicit fallback mode
- route candidate / resolution / rejection schemas
- execution summary route and policy snapshot fields

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/shared-types/test/provider-contracts.test.ts`
Expected: FAIL because new contract fields/schemas do not exist yet.

**Step 3: Write minimal implementation**

Add the new schemas and exports needed for Phase 5D while preserving the Phase 5C contract surface.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/shared-types/test/provider-contracts.test.ts`
Expected: PASS

### Task 2: Refine adapter routing and conservative policy normalization

**Files:**
- Modify: `packages/llm-adapter/src/types.ts`
- Modify: `packages/llm-adapter/src/provider.ts`
- Modify: `packages/llm-adapter/src/runtime.ts`
- Test: `packages/llm-adapter/src/provider.test.ts`

**Step 1: Write the failing test**

Add tests for:
- deterministic route selection preferring primary when capable
- pre-execution fallback route selection when primary has capability mismatch and fallback is explicitly eligible
- mismatch rejection when no candidate satisfies required capabilities
- timeout and retry override clamping to policy maxima
- fallback blocked when policy mode is disabled
- failure stage / route resolution / policy snapshot in execution summary

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/llm-adapter/src/provider.test.ts`
Expected: FAIL because current adapter summaries and route logic do not support the new behavior.

**Step 3: Write minimal implementation**

Implement route candidate normalization, deterministic route resolution, conservative policy clamping, and richer execution summaries entirely inside `packages/llm-adapter`.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/llm-adapter/src/provider.test.ts`
Expected: PASS

### Task 3: Strengthen runtime config and visibility consumers

**Files:**
- Modify: `apps/cli/src/commands.ts`
- Modify: `apps/cli/src/observability.ts`
- Modify: `apps/cli/src/commands.test.ts`
- Modify: `apps/web/src/routes/workflow.ts`
- Modify: `apps/web/src/views/index.ts`
- Modify: `apps/web/src/views/result-renderer.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests for CLI and Web summaries to assert display of:
- provider/model
- route or fallback status
- retry count
- timeout/failure stage summary
- usage/cost summary

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/cli/src/commands.test.ts apps/web/src/web.test.ts`
Expected: FAIL because the new policy summary fields are not yet rendered.

**Step 3: Write minimal implementation**

Update CLI/Web to render only contract-backed route and reliability data from provider execution summaries.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/cli/src/commands.test.ts apps/web/src/web.test.ts`
Expected: PASS

### Task 4: Add environment-backed SQLite validation path

**Files:**
- Modify: `packages/asset-engine/src/persistence/sqlite-repository.ts`
- Modify: `packages/asset-engine/src/persistence/backend-integration.test.ts`
- Modify: `packages/asset-engine/src/history-store.test.ts`
- Modify: `scripts/test-package.mjs`
- Add or Modify: `scripts/validate-sqlite-backend.mjs`

**Step 1: Write the failing test**

Add validation coverage for:
- environment-backed SQLite validation entrypoint
- clear skip reason when native binding is unavailable
- provider execution summary persistence surviving the SQLite path when available

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/asset-engine/src/persistence/backend-integration.test.ts packages/asset-engine/src/history-store.test.ts`
Expected: FAIL because the validation path / skip behavior is not fully defined yet.

**Step 3: Write minimal implementation**

Add the validation entrypoint and make skip-path messaging explicit without changing the backend product scope.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/asset-engine/src/persistence/backend-integration.test.ts packages/asset-engine/src/history-store.test.ts`
Expected: PASS or deterministic skip in this environment with clear reason

### Task 5: Expand smoke validation flow

**Files:**
- Modify: `scripts/smoke-real-provider.mjs`
- Modify: `tests/smoke/provider.test.ts`
- Add or Modify: `docs/phase5d-smoke-ops.md`

**Step 1: Write the failing test**

Add smoke contract tests covering:
- operator-run guidance presence
- structured output validation
- policy validation grouping
- usage/cost visibility expectations
- fallback visibility expectations when configured

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/smoke/provider.test.ts`
Expected: FAIL because the 5D smoke expectations are not fully documented or exposed yet.

**Step 3: Write minimal implementation**

Enhance the smoke script output and docs without making real-provider execution part of CI.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/smoke/provider.test.ts`
Expected: PASS

### Task 6: Update docs and deferred assessment

**Files:**
- Add: `docs/phase5d-routing-policy.md`
- Add: `docs/phase5d-reliability-policy.md`
- Add: `docs/phase5d-budget-assessment.md`
- Add: `docs/phase5d-deferred.md`
- Modify: `docs/runbook.md`
- Modify: `docs/release-readiness.md`
- Modify: `docs/support-matrix.md`
- Modify: `docs/README.md`

**Step 1: Write the failing test**

No code test. Use doc review criteria:
- routing remains adapter-owned
- smoke and SQLite validation maturity are stated conservatively
- budget guardrails conclusion is explicit and evidence-based

**Step 2: Write minimal implementation**

Document the 5D behavior, operator workflows, maturity boundaries, and deferred items.

### Task 7: Final verification

**Files:**
- Verify only

**Step 1: Run targeted tests**

Run:
- `pnpm exec vitest run packages/shared-types/test/provider-contracts.test.ts`
- `pnpm exec vitest run packages/llm-adapter/src/provider.test.ts`
- `pnpm exec vitest run apps/cli/src/commands.test.ts apps/web/src/web.test.ts`
- `pnpm exec vitest run tests/smoke/provider.test.ts`

Expected: PASS

**Step 2: Run workspace validation**

Run: `pnpm run check:all`
Expected: PASS

**Step 3: Record environment-specific limitations**

Document whether SQLite native validation ran or skipped in this environment, and confirm that real-provider smoke remained opt-in and was not executed without credentials.

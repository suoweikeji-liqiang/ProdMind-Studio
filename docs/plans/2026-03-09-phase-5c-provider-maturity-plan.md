# Phase 5C Provider Maturity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a provider maturity layer with formal capability/reliability/usage contracts, bounded timeout/retry/fallback handling, minimal capability-aware routing, stronger smoke validation, and minimal CLI/Web visibility.

**Architecture:** Add shared contracts first, then implement an adapter-centered reliability layer that returns normalized execution summaries. Engines pass only capability requirements, asset-engine persists summaries, and CLI/Web render those summaries without owning provider logic.

**Tech Stack:** TypeScript, Vitest, Zod, existing `ai` SDK adapters, Node scripts, Express web app.

---

### Task 1: Shared Provider Maturity Contracts

**Files:**
- Create: `docs/phase5c-provider-capability-boundary.md`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/src/workflow/history.ts`
- Create: `packages/shared-types/src/provider/contracts.ts`
- Test: `packages/shared-types/test/provider-contracts.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import {
  ProviderCapabilityProfileSchema,
  ProviderExecutionSummarySchema,
} from '../src/index.js';

describe('provider maturity contracts', () => {
  it('accepts a capability profile with required, optional, and runtime-derived sections', () => {
    const parsed = ProviderCapabilityProfileSchema.parse({
      providerName: 'openai',
      modelName: 'gpt-4o-mini',
      capabilities: { structuredOutput: true, streaming: true },
      reliability: { timeoutMs: 10000, maxRetries: 1, fallbackEligible: true },
    });
    expect(parsed.providerName).toBe('openai');
  });

  it('accepts a provider execution summary with usage and fallback state', () => {
    const parsed = ProviderExecutionSummarySchema.parse({
      selectedProvider: 'openai',
      selectedModel: 'gpt-4o-mini',
      attempts: 1,
      retriesPerformed: 0,
      timeoutCount: 0,
      fallbackUsed: false,
      usage: { requestCount: 1, tokenAvailability: 'unavailable', costAvailability: 'unavailable' },
    });
    expect(parsed.fallbackUsed).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @prodmind/shared-types test`
Expected: FAIL because provider maturity schemas do not exist yet.

**Step 3: Write minimal implementation**

Add provider contract schemas and extend workflow history/result types with optional provider execution summary arrays.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @prodmind/shared-types test`
Expected: PASS with new contract tests green.

**Step 5: Commit**

```bash
git add packages/shared-types docs/phase5c-provider-capability-boundary.md docs/plans/2026-03-09-phase-5c-provider-maturity-*.md
git commit -m "feat: add phase 5c provider maturity contracts"
```

### Task 2: Adapter Capability Selection and Reliability Core

**Files:**
- Modify: `packages/llm-adapter/src/types.ts`
- Modify: `packages/llm-adapter/src/provider.ts`
- Modify: `packages/llm-adapter/src/fake-provider.ts`
- Modify: `packages/llm-adapter/src/observability.ts`
- Modify: `packages/llm-adapter/src/index.ts`
- Test: `packages/llm-adapter/src/provider.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { createFakeProvider, createProviderRouter } from './index.js';

describe('adapter reliability', () => {
  it('rejects capability mismatch without implicit fallback', async () => {
    const adapter = createProviderRouter({
      primary: createFakeProvider({ default: 'ok' }, { structuredOutput: false }),
    });

    await expect(
      adapter.generateStructured([{ role: 'user', content: 'x' }], schema, undefined, {
        requiredCapabilities: { structuredOutput: true },
      })
    ).rejects.toThrow(/capability_mismatch/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @prodmind/llm-adapter test`
Expected: FAIL because routing/reliability APIs are not implemented.

**Step 3: Write minimal implementation**

Implement:

- provider profile metadata
- capability validation
- bounded timeout
- bounded retry
- explicit optional fallback
- normalized execution summary capture
- fake provider hooks for deterministic failure/timeout/usage simulation

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @prodmind/llm-adapter test`
Expected: PASS with reliability tests green.

**Step 5: Commit**

```bash
git add packages/llm-adapter
git commit -m "feat: add adapter reliability and capability routing"
```

### Task 3: Engine Requirement Hooks

**Files:**
- Modify: `packages/challenge-engine/src/roles.ts`
- Modify: `packages/challenge-engine/src/runner.ts`
- Modify: `packages/decision-engine/src/orchestrator.ts`
- Test: `packages/challenge-engine/src/convergence.test.ts`
- Test: `tests/contracts/decision-model.test.ts`

**Step 1: Write the failing test**

```typescript
it('passes streaming requirement for role calls', async () => {
  const adapter = createRecordingAdapter();
  await callRole(adapter, 'architect', 'idea');
  expect(adapter.lastRequest?.requiredCapabilities?.streaming).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @prodmind/challenge-engine test`
Expected: FAIL because capability requirement plumbing is missing.

**Step 3: Write minimal implementation**

Extend engine call sites to pass capability requirements only; do not add retry or fallback logic.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @prodmind/challenge-engine test && pnpm --filter @prodmind/decision-engine test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/challenge-engine packages/decision-engine
git commit -m "feat: add capability requirement hooks to engines"
```

### Task 4: Persist Provider Execution Summaries

**Files:**
- Modify: `packages/asset-engine/src/history-store.ts`
- Modify: `packages/asset-engine/src/index.ts`
- Test: `packages/asset-engine/src/history-store.test.ts`

**Step 1: Write the failing test**

```typescript
it('persists workflow results with provider execution summaries', async () => {
  await store.saveResult(testDir, {
    runId: 'run-usage',
    providerExecutions: [{ selectedProvider: 'fake', selectedModel: 'fake-default', attempts: 1, retriesPerformed: 0, timeoutCount: 0, fallbackUsed: false, usage: { requestCount: 1, tokenAvailability: 'estimated', costAvailability: 'unavailable' } }],
  });
  const result = await store.getResult(testDir, 'run-usage');
  expect(result?.providerExecutions).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @prodmind/asset-engine test`
Expected: FAIL because result schema and persistence path do not include provider summaries.

**Step 3: Write minimal implementation**

Persist normalized provider execution summaries with runs/results using the shared-types contract.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @prodmind/asset-engine test`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/asset-engine
git commit -m "feat: persist provider execution summaries"
```

### Task 5: CLI and Web Visibility

**Files:**
- Create: `docs/phase5c-usage-surface.md`
- Modify: `apps/cli/src/commands.ts`
- Modify: `apps/cli/src/observability.ts`
- Modify: `apps/cli/src/commands.test.ts`
- Modify: `apps/web/src/routes/workflow.ts`
- Modify: `apps/web/src/views/result-renderer.ts`
- Modify: `apps/web/src/state/workflow-store.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

```typescript
it('renders provider reliability summary in workflow output', async () => {
  const summary = renderProviderSummary({
    selectedProvider: 'fake',
    selectedModel: 'fake-default',
    attempts: 2,
    retriesPerformed: 1,
    timeoutCount: 0,
    fallbackUsed: false,
    usage: { requestCount: 1, tokenAvailability: 'estimated', totalTokens: 42, costAvailability: 'unavailable' },
  });
  expect(summary).toContain('Retries: 1');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @prodmind/cli test && pnpm --filter @prodmind/web test`
Expected: FAIL because reliability summary rendering does not exist.

**Step 3: Write minimal implementation**

Render contract-backed reliability/usage summaries in CLI and Web using persisted summaries only.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @prodmind/cli test && pnpm --filter @prodmind/web test`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/cli apps/web docs/phase5c-usage-surface.md
git commit -m "feat: expose provider reliability visibility in cli and web"
```

### Task 6: Smoke Workflow and Operator Docs

**Files:**
- Create: `docs/phase5c-smoke-validation.md`
- Modify: `scripts/smoke-real-provider.mjs`
- Modify: `tests/smoke/provider.test.ts`
- Modify: `docs/runbook.md`
- Modify: `docs/release-readiness.md`
- Modify: `docs/support-matrix.md`
- Modify: `docs/README.md`

**Step 1: Write the failing test**

```typescript
it('documents the enhanced real-provider smoke workflow', async () => {
  const docs = readFileSync('docs/phase5c-smoke-validation.md', 'utf8');
  expect(docs).toContain('usage/cost visibility');
  expect(docs).toContain('fallback behavior');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm run check:docs`
Expected: FAIL because Phase 5C docs are not present and index references are missing.

**Step 3: Write minimal implementation**

Enhance the smoke script and update operator/readiness/support docs to reflect Phase 5C maturity honestly.

**Step 4: Run test to verify it passes**

Run: `pnpm run check:docs`
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts tests/smoke docs
git commit -m "docs: update phase 5c provider maturity guidance"
```

### Task 7: Full Validation

**Files:**
- Modify: `docs/phase5b-deferred.md`
- Modify: `docs/phase5c-deferred.md`

**Step 1: Run focused verification**

Run:

```bash
pnpm --filter @prodmind/shared-types test
pnpm --filter @prodmind/llm-adapter test
pnpm --filter @prodmind/asset-engine test
pnpm --filter @prodmind/cli test
pnpm --filter @prodmind/web test
```

Expected: PASS.

**Step 2: Run full workspace quality gates**

Run: `pnpm run check:all`
Expected: PASS.

**Step 3: Record deferred items**

Update deferred tracking with anything discovered that trends toward provider platformization or billing/dashboard work.

**Step 4: Commit**

```bash
git add docs
git commit -m "chore: finalize phase 5c validation and deferred items"
```

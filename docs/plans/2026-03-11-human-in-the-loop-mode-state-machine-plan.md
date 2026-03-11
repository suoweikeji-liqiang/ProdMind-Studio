# Human-in-the-Loop Mode State Machine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the session experience around explicit per-mode state machines so challenge, decision, and requirement-build all enforce timely human checkpoints.

**Architecture:** Keep one shared session shell in the Web app and add explicit mode-phase metadata to live session state. Implement each mode as a sub-state machine with typed user actions, then update the session page to render the current phase, required user action, and allowed next transitions instead of treating every message as generic content.

**Tech Stack:** TypeScript, Express, existing session persistence in `@prodmind/asset-engine`, Web session shell in `apps/web`, mode engines in `packages/challenge-engine` and `packages/decision-engine`.

## Status Snapshot (2026-03-11)

This implementation plan is now complete and serves as a delivery record for the shipped session shell.

- Task 1: completed, including persisted `currentPhase`, `requiredUserAction`, and `interactionState`
- Task 2: completed, including challenge interrupt phases in the Web state machine
- Task 3: completed, including explicit decision frame confirmation before recommendation
- Task 4: completed, including artifact-level progression and explicit versioned finalization
- Task 5: completed, including `nextRecommendedMode`, `modeTransitionWarning`, and `recommendedRollbackMode`
- Task 6: completed, including focused tests, package builds, and doc synchronization

Current caveat:

- `idle` is defined in the interaction-state enum but is still reserved rather than emitted by the active Web routes

---

### Task 1: Add Session Phase Metadata

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/src/workflow/history.ts`
- Modify: `apps/web/src/state/session-store.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add assertions in `apps/web/src/web.test.ts` that the session payload exposes phase-oriented UI fields such as current phase and required user action instead of only current mode.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because the session response and rendered page do not yet expose the new phase contract.

**Step 3: Write minimal implementation**

Add explicit phase metadata to the session state model and include it in the session route responses for the active mode.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts packages/shared-types/src/workflow/history.ts apps/web/src/state/session-store.ts apps/web/src/routes/sessions.ts apps/web/src/web.test.ts
git commit -m "feat: add session phase metadata"
```

### Task 2: Rebuild Challenge Mode Around Two Human Checkpoints

**Files:**
- Modify: `packages/challenge-engine/src/runner.ts`
- Modify: `packages/challenge-engine/src/runner.test.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests that challenge mode now progresses through:

- architect framing
- waiting for problem correction
- objection generation
- waiting for objection response
- grounding

Add route/UI assertions that the first user submission does not immediately perform the full round.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/challenge-engine/src/runner.test.ts apps/web/src/web.test.ts`

Expected: FAIL because challenge currently consumes one generic message and runs a full round.

**Step 3: Write minimal implementation**

Split challenge-mode user actions into typed phases and update the Web route and page so each submission is interpreted by current phase, not by a generic content field.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/challenge-engine/src/runner.test.ts apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/challenge-engine/src/runner.ts packages/challenge-engine/src/runner.test.ts apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts
git commit -m "feat: restore challenge checkpoints"
```

### Task 3: Rebuild Decision Mode Around Frame Confirmation

**Files:**
- Modify: `packages/decision-engine/src/orchestrator.ts`
- Modify: `packages/decision-engine/src/orchestrator.test.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests asserting that decision mode first produces a decision frame, then waits for frame confirmation before running tradeoff analysis and recommendation synthesis.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/decision-engine/src/orchestrator.test.ts apps/web/src/web.test.ts`

Expected: FAIL because decision mode currently runs all steps in one pass.

**Step 3: Write minimal implementation**

Split decision orchestration into multiple explicit phases and teach the session route/UI to accept frame-correction and priority-adjustment actions.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/decision-engine/src/orchestrator.test.ts apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/decision-engine/src/orchestrator.ts packages/decision-engine/src/orchestrator.test.ts apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts
git commit -m "feat: add decision frame checkpoints"
```

### Task 4: Rebuild Requirement-Build Around Artifact-Level Advancement

**Files:**
- Modify: `packages/asset-engine/src/writer.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/web.test.ts`
- Test: `packages/asset-engine/src/session-store.test.ts`

**Step 1: Write the failing test**

Add tests that requirement-build proposes the artifact layer to advance and does not silently rewrite all artifacts after every user input.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts packages/asset-engine/src/session-store.test.ts`

Expected: FAIL because requirement-build currently regenerates the whole draft pack immediately.

**Step 3: Write minimal implementation**

Add artifact-selection phase handling and limit draft generation to the selected artifact layer, while preserving explicit finalization behavior.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts packages/asset-engine/src/session-store.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/asset-engine/src/writer.ts apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts packages/asset-engine/src/session-store.test.ts
git commit -m "feat: add artifact-level requirement workflow"
```

### Task 5: Add Cross-Mode Handoff Guidance

**Files:**
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/web.test.ts`
- Modify: `docs/README.md`

**Step 1: Write the failing test**

Add tests that the UI shows recommended next mode and explicit rollback guidance when upstream work is incomplete.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because mode switching currently has no maturity guidance.

**Step 3: Write minimal implementation**

Expose next-mode recommendation and rollback hints in the session payload and render them in the session shell.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts docs/README.md
git commit -m "feat: add cross-mode guidance"
```

### Task 6: Run Integrated Verification

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/plans/2026-03-11-human-in-the-loop-mode-blueprint-design.md`
- Modify: `docs/plans/2026-03-11-mode-state-machine-design.md`

**Step 1: Run focused package tests**

Run:

```bash
pnpm exec vitest run packages/challenge-engine/src/runner.test.ts packages/decision-engine/src/orchestrator.test.ts packages/asset-engine/src/session-store.test.ts apps/web/src/web.test.ts
```

Expected: PASS

**Step 2: Run package builds**

Run:

```bash
pnpm --filter @prodmind/challenge-engine build
pnpm --filter @prodmind/decision-engine build
pnpm --filter @prodmind/app-web build
```

Expected: PASS

**Step 3: Update docs to match shipped behavior**

Update docs so the product no longer reads like a generic session shell with freeform mode switching and instead documents explicit phase-based human checkpoints.

**Step 4: Commit**

```bash
git add docs/README.md docs/plans/2026-03-11-human-in-the-loop-mode-blueprint-design.md docs/plans/2026-03-11-mode-state-machine-design.md
git commit -m "docs: document human-in-the-loop mode state machine"
```

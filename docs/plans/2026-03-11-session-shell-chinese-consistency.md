# Session Shell Chinese Consistency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the session-first Web shell read consistently in Chinese, clean the README product framing, and remove obsolete skipped Web tests.

**Architecture:** This pass is render-layer and docs only. Internal mode keys, session APIs, and legacy compatibility routes remain unchanged; the implementation maps existing mode keys to Chinese display labels at the view layer and aligns tests with that contract.

**Tech Stack:** TypeScript, Express view string renderers, Vitest

---

### Task 1: Lock the new UI copy in tests

**Files:**
- Modify: `apps/web/src/web.test.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add assertions that the rendered session shell, history page, and replay page expose:

- `质疑模式`
- `裁决模式`
- `需求共建模式`
- `只在需求共建模式下启用`
- `建议`

Also assert the replay renderer does not expose `Legacy Workflow` or `Recommendation` in the normal page shell.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @prodmind/app-web exec vitest run src/web.test.ts`

Expected: FAIL because the current `HEAD` renderers still expose mixed English mode labels and legacy fallback wording.

**Step 3: Remove obsolete skipped tests**

Delete the two `it.skip(...)` blocks that are already replaced by active fake-provider coverage for:

- session listing
- full replay reopening

**Step 4: Run test to verify it still fails for the intended renderer assertions**

Run: `pnpm --filter @prodmind/app-web exec vitest run src/web.test.ts`

Expected: FAIL only on the new copy assertions, not because of syntax or test duplication problems.

### Task 2: Implement localized mode labels and replay fallback copy

**Files:**
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write minimal implementation**

- Introduce a single display-label helper in the inline browser scripts for session/history/replay pages.
- Replace visible mode labels from `challenge 质疑`, `decision 裁决`, `requirement-build 需求共建` to the Chinese-first labels.
- Update session-page helper text that references `requirement-build` so the visible copy says "需求共建模式".
- Update replay fallback strings so user-visible text becomes Chinese, including the recommendation label.

**Step 2: Run test to verify it passes**

Run: `pnpm --filter @prodmind/app-web exec vitest run src/web.test.ts`

Expected: PASS

### Task 3: Reframe the README around the session-first Web product

**Files:**
- Modify: `README.md`

**Step 1: Write the failing expectation indirectly via scope review**

Confirm the README still says:

- Web is migrating away from workflow semantics
- CLI `workflow` command is the operator example

These statements are now out of date for the user-facing product framing.

**Step 2: Write minimal implementation**

- Describe Web as the primary, session-first path.
- Keep CLI documented as an optional operator or compatibility path.
- Remove the note that Web is still migrating.
- Keep any unavoidable legacy CLI command examples, but frame them as compatibility/operator usage.

**Step 3: Run targeted verification**

Run: `rg -n "migrating away from workflow|workflow-style commands|session-first|primary product surface|CLI" README.md`

Expected: the stale migration language is gone and the new framing is present.

### Task 4: Verify the full scoped change

**Files:**
- Modify: `apps/web/src/views/index.ts`
- Modify: `apps/web/src/web.test.ts`
- Modify: `README.md`

**Step 1: Run focused tests**

Run: `pnpm --filter @prodmind/app-web exec vitest run src/web.test.ts`

Expected: PASS

**Step 2: Run project quality check if time allows**

Run: `pnpm run check:all`

Expected: PASS, or capture any unrelated failures explicitly.

**Step 3: Review diff**

Run: `git diff -- apps/web/src/views/index.ts apps/web/src/web.test.ts README.md docs/plans/2026-03-11-session-shell-chinese-consistency-design.md docs/plans/2026-03-11-session-shell-chinese-consistency.md`

Expected: Only the scoped Chinese consistency, README framing, and plan-doc changes appear.

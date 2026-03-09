# V1 Sprint Single-User Workbench Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close ProdMind-Studio into a V1 single-user decision workbench candidate with a clearer Web-led journey, stronger result readability, useful history revisit, clearer failure/recovery semantics, and conservative release documentation.

**Architecture:** Keep the current engine, provider, and persistence boundaries intact. Improve only thin-shell presentation and operator semantics in Web and CLI, use persisted history as the revisit path, and add explicit V1 boundary/readiness/checklist docs instead of introducing new platform features.

**Tech Stack:** TypeScript, Express, Vitest, Node.js scripts, existing workspace packages (`@prodmind/app-web`, `@prodmind/app-cli`, `@prodmind/asset-engine`, `@prodmind/shared-types`)

---

### Task 1: Add failing tests for V1 Web rendering and revisit behavior

**Files:**
- Modify: `apps/web/src/web.test.ts`
- Modify: `apps/web/src/views/result-renderer.ts`
- Modify: `apps/web/src/views/index.ts`

**Step 1: Write the failing test**

Add tests for:
- home page V1 framing and history CTA
- workflow page clearer state/recovery wording
- results page conclusion-first sections
- provider summary remaining secondary
- history list and history detail page renderers

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`
Expected: FAIL because the new renderers and wording do not exist yet.

**Step 3: Write minimal implementation**

Add the new view helpers and update the renderers without moving business logic into Web.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`
Expected: PASS

### Task 2: Add failing tests for Web history/data fallback

**Files:**
- Modify: `apps/web/src/web.test.ts`
- Modify: `apps/web/src/routes/workflow.ts`
- Modify: `apps/web/src/server.ts`

**Step 1: Write the failing test**

Add tests covering:
- history routes exposed at `/history` and `/history/:runId`
- result page script falling back to `/api/workflow/history/:runId`
- history detail explaining phase status and available artifacts

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`
Expected: FAIL because these page routes and fallback flow are incomplete.

**Step 3: Write minimal implementation**

Expose the new read-only pages and reuse existing history APIs.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`
Expected: PASS

### Task 3: Add failing tests for CLI history and failure semantics

**Files:**
- Modify: `apps/cli/src/commands.test.ts`
- Modify: `apps/cli/src/commands.ts`
- Modify: `apps/cli/src/observability.ts`

**Step 1: Write the failing test**

Add tests for:
- history list output showing status summary and revisit guidance
- history detail output showing artifacts and provider summary
- failure summary showing where failure happened, what to do next, and how to inspect history

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/cli/src/commands.test.ts`
Expected: FAIL because current wording is too thin.

**Step 3: Write minimal implementation**

Tighten CLI wording and history presentation while keeping logic in existing command/orchestration paths.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/cli/src/commands.test.ts`
Expected: PASS

### Task 4: Add V1 boundary and release docs

**Files:**
- Add: `docs/v1-boundary.md`
- Add: `docs/v1-release-checklist.md`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/runbook.md`
- Modify: `docs/release-readiness.md`
- Modify: `docs/support-matrix.md`
- Modify: `docs/migration-plan.md` if needed

**Step 1: Write the minimal implementation**

Document:
- V1 must-have / nice-to-have / out-of-scope
- Web-first and CLI-secondary usage
- fake vs real provider path
- known limitations acceptable for V1
- release blockers vs acceptable limitations

### Task 5: Run V1 acceptance verification

**Files:**
- Verify only

**Step 1: Run focused tests**

Run:
- `pnpm exec vitest run apps/web/src/web.test.ts`
- `pnpm exec vitest run apps/cli/src/commands.test.ts`

Expected: PASS

**Step 2: Run workspace gate**

Run: `pnpm run check:all`
Expected: PASS

**Step 3: Run acceptance checks**

Verify and document:
- fake-provider workflow path
- Web main path coverage by tests/rendering
- CLI history/revisit path
- real-provider smoke status in this environment

**Step 4: Update release docs with evidence**

Record:
- Ready for internal V1 release: yes/no
- blockers
- acceptable known limitations

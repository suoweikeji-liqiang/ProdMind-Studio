# Conversation-First Thinking Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reframe ProdMind-Studio as a Chinese, conversation-first internal thinking tool with topic-based sessions, manual mode switching, visible multi-role dialogue, full process persistence, and per-mode draft/final artifact handling.

**Architecture:** Preserve the existing engines as capability backends, but replace the product shell and persistence model around them. Introduce session-centered shared types and storage first, then build a new Web session flow, restore V1-like challenge interaction, and finally add decision and requirement-build modes on the same session spine while keeping legacy workflow routes only as compatibility paths.

**Tech Stack:** TypeScript, Express, Vitest, Node.js filesystem persistence, existing workspace packages (`@prodmind/app-web`, `@prodmind/shared-types`, `@prodmind/asset-engine`, `@prodmind/challenge-engine`, `@prodmind/decision-engine`, `@prodmind/llm-adapter`)

---

### Task 1: Lock the new product direction in docs before code changes

**Files:**
- Create: `docs/product-principles.md`
- Modify: `README.md`
- Modify: `docs/v1-boundary.md`
- Modify: `docs/architecture.md`
- Modify: `docs/migration-plan.md`
- Modify: `docs/module-boundary.md`

**Step 1: Write the minimal implementation**

Document the new non-negotiable rules:
- topic-first entry
- Chinese multi-round conversation as the main path
- manual persistent mode switching
- visible multi-role output across all modes
- session-centered history and replay
- drafts plus explicit finalization
- no collaboration in this phase

**Step 2: Verify doc language is consistent**

Search for terms that pull the product back toward the old model:

Run: `rg "single-user decision workbench|workflow|results page|pipeline" README.md docs`

Expected: remaining matches are either intentionally updated or explicitly marked as legacy compatibility.

**Step 3: Commit**

```bash
git add docs/product-principles.md README.md docs/v1-boundary.md docs/architecture.md docs/migration-plan.md docs/module-boundary.md
git commit -m "docs: redefine product as conversation-first thinking tool"
```

### Task 2: Add session-centered shared types and keep workflow types as compatibility only

**Files:**
- Create: `packages/shared-types/src/session/conversation.ts`
- Create: `packages/shared-types/src/session/artifacts.ts`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/src/workflow/history.ts`
- Create: `packages/shared-types/test/session-model.test.ts`

**Step 1: Write the failing test**

Add schema tests for:
- `ConversationSession`
- `ConversationEvent`
- `ModeState`
- `ArtifactVersion`
- compatibility note that `WorkflowRun` / `WorkflowResult` remain legacy types

Use concrete examples such as:

```ts
expect(ConversationModeSchema.parse("challenge")).toBe("challenge");
expect(ConversationEventSchema.parse({
  type: "mode_switched",
  sessionId: "s1",
  timestamp: "2026-03-10T00:00:00.000Z",
  mode: "decision",
})).toBeTruthy();
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/shared-types/test/session-model.test.ts`

Expected: FAIL because the new schemas and exports do not exist.

**Step 3: Write minimal implementation**

Add the new session schemas and export them from `packages/shared-types/src/index.ts`. Keep `packages/shared-types/src/workflow/history.ts` available, but mark its model as legacy compatibility in comments and naming where possible.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/shared-types/test/session-model.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared-types/src/session packages/shared-types/src/index.ts packages/shared-types/src/workflow/history.ts packages/shared-types/test/session-model.test.ts
git commit -m "feat: add conversation session shared types"
```

### Task 3: Add session persistence and per-mode artifact versioning in asset-engine

**Files:**
- Create: `packages/asset-engine/src/session-store.ts`
- Modify: `packages/asset-engine/src/history-store.ts`
- Modify: `packages/asset-engine/src/index.ts`
- Modify: `packages/asset-engine/src/history-store.test.ts`
- Create: `packages/asset-engine/src/session-store.test.ts`

**Step 1: Write the failing test**

Add tests covering:
- create and load a session
- append timeline events
- update one mode without overwriting other modes
- save draft artifact
- finalize versioned artifact

Use a shape like:

```ts
expect(savedSession.currentMode).toBe("challenge");
expect(versions.map((item) => item.version)).toEqual([1, 2]);
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/asset-engine/src/session-store.test.ts`

Expected: FAIL because the session store and versioned artifact logic do not exist.

**Step 3: Write minimal implementation**

Persist:
- `session.json`
- `events.json`
- `modes/<mode>.json`
- `artifacts/<mode>/draft.json`
- `artifacts/<mode>/vN.json`

Do not remove the old history store yet; keep it for workflow compatibility.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run packages/asset-engine/src/session-store.test.ts packages/asset-engine/src/history-store.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/asset-engine/src/session-store.ts packages/asset-engine/src/index.ts packages/asset-engine/src/history-store.ts packages/asset-engine/src/session-store.test.ts packages/asset-engine/src/history-store.test.ts
git commit -m "feat: add session persistence and artifact versioning"
```

### Task 4: Add a new Web session API and in-memory session state

**Files:**
- Create: `apps/web/src/state/session-store.ts`
- Create: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/server.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add Web tests for:
- `POST /api/sessions` creates a session from a topic
- `GET /api/sessions/:id` returns session state
- `POST /api/sessions/:id/mode` switches mode persistently
- `POST /api/sessions/:id/messages` appends a user message to the active mode

Use assertions such as:

```ts
expect(response.statusCode).toBe(201);
expect(body.session.currentMode).toBe("challenge");
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because these routes and session state helpers do not exist.

**Step 3: Write minimal implementation**

Create a thin session API backed by the new asset-engine session store and a small in-process cache for live state. Do not push engine logic into the routes.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS for the new session API tests.

**Step 5: Commit**

```bash
git add apps/web/src/state/session-store.ts apps/web/src/routes/sessions.ts apps/web/src/server.ts apps/web/src/web.test.ts
git commit -m "feat: add web session api"
```

### Task 5: Replace the workflow-first pages with a session-first Web shell

**Files:**
- Modify: `apps/web/src/views/index.ts`
- Modify: `apps/web/src/server.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests for:
- home page requiring topic entry
- `/sessions/:id` rendering a session layout
- `/sessions` rendering session history
- `/sessions/:id/replay` rendering session replay
- the old `/workflow` page no longer being the primary CTA

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because the current views still center workflow execution and results pages.

**Step 3: Write minimal implementation**

Update the renderers so the page structure is:
- home
- session
- sessions history
- session replay

Keep the legacy workflow pages reachable only if needed for compatibility, but remove them from primary navigation and primary copy.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/views/index.ts apps/web/src/server.ts apps/web/src/web.test.ts
git commit -m "feat: add session-first web shell"
```

### Task 6: Restore V1-style challenge interaction as the first live mode on Web

**Files:**
- Modify: `packages/challenge-engine/src/runner.ts`
- Modify: `packages/challenge-engine/src/convergence.test.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests for:
- posting multiple user turns to a challenge session
- persisting visible role outputs to the timeline
- keeping challenge mode active until the user switches mode
- generating challenge draft summary updates after a round

**Step 2: Run test to verify it fails**

Run:
- `pnpm exec vitest run packages/challenge-engine/src/convergence.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because Web currently runs only a single challenge round in workflow style.

**Step 3: Write minimal implementation**

Extend the challenge path to support:
- repeated rounds within one session
- mode-local challenge message history
- timeline event emission for visible role output
- summary draft refresh after each round

Avoid redesigning all challenge prompts in this step; restore the multi-round interaction spine first.

**Step 4: Run test to verify it passes**

Run:
- `pnpm exec vitest run packages/challenge-engine/src/convergence.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/challenge-engine/src/runner.ts packages/challenge-engine/src/convergence.test.ts apps/web/src/routes/sessions.ts apps/web/src/web.test.ts
git commit -m "feat: restore multi-round challenge sessions on web"
```

### Task 7: Add decision mode switching and visible multi-role decision output

**Files:**
- Modify: `packages/decision-engine/src/orchestrator.ts`
- Modify: `packages/decision-engine/src/orchestrator.test.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests for:
- switching from challenge to decision mode
- appending decision-mode user turns without mixing challenge message history
- rendering decision-specific visible role output
- updating only the decision draft panel by default after a mode switch

**Step 2: Run test to verify it fails**

Run:
- `pnpm exec vitest run packages/decision-engine/src/orchestrator.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because the current decision engine is workflow-step oriented and the Web layer has no mode switch behavior.

**Step 3: Write minimal implementation**

Adapt decision orchestration to the session model:
- define decision role identities
- create visible decision role events
- keep mode-local state isolated
- return updated draft summary data to the right-side panel

**Step 4: Run test to verify it passes**

Run:
- `pnpm exec vitest run packages/decision-engine/src/orchestrator.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/decision-engine/src/orchestrator.ts packages/decision-engine/src/orchestrator.test.ts apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts
git commit -m "feat: add decision mode sessions"
```

### Task 8: Add requirement-build mode with draft/final artifact handling

**Files:**
- Modify: `packages/asset-engine/src/writer.ts`
- Modify: `packages/asset-engine/src/session-store.ts`
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Modify: `apps/web/src/web.test.ts`
- Modify: `packages/asset-engine/src/session-store.test.ts`

**Step 1: Write the failing test**

Add tests for:
- requirement-build mode turns producing draft spec data
- explicit finalize action creating `v1`, `v2`, ... artifacts
- finalized versions remaining immutable after later conversation
- right panel showing drafts and finalized versions separately

**Step 2: Run test to verify it fails**

Run:
- `pnpm exec vitest run packages/asset-engine/src/session-store.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because artifact finalization is not session-aware yet.

**Step 3: Write minimal implementation**

Use the existing asset-engine writer as the content sink, but wrap it in:
- requirement-build draft state
- explicit finalize endpoints
- per-version persisted artifacts

Keep the first version small: draft summary plus finalized `idea/spec/acceptance/tasks` output.

**Step 4: Run test to verify it passes**

Run:
- `pnpm exec vitest run packages/asset-engine/src/session-store.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/asset-engine/src/writer.ts packages/asset-engine/src/session-store.ts packages/asset-engine/src/session-store.test.ts apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts
git commit -m "feat: add requirement-build drafts and final artifacts"
```

### Task 9: Convert history and replay from workflow semantics to session semantics

**Files:**
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Modify: `packages/asset-engine/src/session-store.ts`
- Modify: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add tests for:
- listing sessions by topic and last active time
- reopening a session with full timeline data
- replay page showing mode switches and finalized outputs
- compatibility fallback when legacy workflow history exists but no session history exists

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: FAIL because the current history model is still run/result oriented.

**Step 3: Write minimal implementation**

Switch history UIs and APIs to session terminology first. Keep a compatibility reader for legacy workflow data only when reopening pre-migration records.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/sessions.ts apps/web/src/views/index.ts packages/asset-engine/src/session-store.ts apps/web/src/web.test.ts
git commit -m "feat: add session history and replay"
```

### Task 10: Run focused verification and full workspace checks

**Files:**
- Verify only

**Step 1: Run focused tests**

Run:
- `pnpm exec vitest run packages/shared-types/test/session-model.test.ts`
- `pnpm exec vitest run packages/asset-engine/src/session-store.test.ts`
- `pnpm exec vitest run packages/challenge-engine/src/convergence.test.ts`
- `pnpm exec vitest run packages/decision-engine/src/orchestrator.test.ts`
- `pnpm exec vitest run apps/web/src/web.test.ts`

Expected: PASS

**Step 2: Run the package gate**

Run: `pnpm run check:all`

Expected: PASS

**Step 3: Run manual product verification**

Verify:
- new session requires a topic
- challenge mode supports multiple rounds
- mode switching persists until changed
- right panel follows mode by default
- draft and finalized artifacts are both visible
- history is organized around sessions, not runs

**Step 4: Capture any residual compatibility gaps**

Document remaining legacy workflow routes and removal conditions in:
- `README.md`
- `docs/migration-plan.md`
- `docs/module-boundary.md`

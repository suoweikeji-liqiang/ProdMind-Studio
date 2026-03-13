# CLI+ Challenge Handoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the web `challenge` flow as strict as the CLI core loop, generate a structured handoff package at the end of each round, and have `decision` / `requirement-build` consume that handoff instead of starting from near-empty state.

**Architecture:** Add a typed `challenge_handoff` payload to the live session model, enforce step-by-step challenge validation in the route layer, and upgrade the challenge workbench model so the UI shows required checklists, explicit response-path gating, and downstream mode readiness. Downstream modes will render a lightweight handoff summary and seed their first step from the latest completed challenge handoff instead of relying only on free-form messages.

**Tech Stack:** TypeScript, Express, shared Zod schemas, Vitest, server-rendered HTML/JS in `apps/web`, existing `challenge-engine` role runner.

---

### Task 1: Add Structured Challenge Handoff Types And Persistence

**Files:**
- Modify: `packages/shared-types/src/session/conversation.ts`
- Modify: `apps/web/src/state/session-store.ts`
- Test: `apps/web/src/state/session-store.test.ts`

**Step 1: Write the failing test**

Add a test in `apps/web/src/state/session-store.test.ts` that:

- creates a live session
- injects a synthetic challenge handoff
- reloads the live session
- asserts the latest handoff is still present on the session state

Expected shape:

```ts
expect(state.session.challengeHandoffs).toHaveLength(1);
expect(state.session.challengeHandoffs[0].problemFrame.oneSentenceProblem).toBe('...');
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/web/src/state/session-store.test.ts
```

Expected: FAIL because `challengeHandoffs` does not exist on the session schema/state.

**Step 3: Write minimal implementation**

Add shared schemas and types in `packages/shared-types/src/session/conversation.ts`:

- `ChallengeProblemFrameSchema`
- `ChallengeUserConfirmedContextSchema`
- `ChallengeMvpScopeSchema`
- `ChallengeEvidenceTraceSchema`
- `ChallengeRoundStatusSchema`
- `ChallengeHandoffSchema`

Extend `ConversationSessionSchema` with:

```ts
challengeHandoffs: z.array(ChallengeHandoffSchema).default([]),
```

Then update `apps/web/src/state/session-store.ts`:

- ensure new sessions initialize `challengeHandoffs: []`
- preserve `challengeHandoffs` on mode switches and transitions
- add a helper to append/replace the latest handoff for the current round

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run apps/web/src/state/session-store.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared-types/src/session/conversation.ts apps/web/src/state/session-store.ts apps/web/src/state/session-store.test.ts
git commit -m "feat: add structured challenge handoff state"
```

### Task 2: Enforce Strict Challenge Step Gates In The Route Layer

**Files:**
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `packages/challenge-engine/src/runner.ts`
- Test: `apps/web/src/web.test.ts`
- Test: `packages/challenge-engine/src/runner.test.ts`

**Step 1: Write the failing tests**

Add route tests in `apps/web/src/web.test.ts` for these cases:

1. `problem_correction` is rejected if the user confirmation does not contain:
   - scenario
   - three pains
   - constraints
2. `objection_response` is rejected if `focusAction` is missing
3. round resolution is rejected if the generated grounding payload lacks:
   - `openConflicts`
   - `nextValidationActions`
4. switching to `requirement-build` is rejected if handoff maturity is insufficient

Add a runner test in `packages/challenge-engine/src/runner.test.ts` that fallback output for `architect` / `assassin` / `userGhost` / `grounder` still satisfies minimal section structure.

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts packages/challenge-engine/src/runner.test.ts
```

Expected: FAIL because the route accepts underspecified input and the current fallback structure is too loose.

**Step 3: Write minimal implementation**

In `apps/web/src/routes/sessions.ts`:

- add helpers to parse and validate:
  - architect framing sections
  - user confirmation slots
  - assassin sections
  - userGhost persona sections
  - grounder sections
- enforce the 6-step challenge flow with route guards
- require `focusAction` for the user response step
- refuse to complete the round without `openConflicts` and `nextValidationActions`

In `packages/challenge-engine/src/runner.ts`:

- tighten fallback builders so each role includes the required headings
- ensure grounder fallback contains:
  - strongest hypotheses
  - MVP boundary
  - unresolved conflicts
  - next actions
  - falsification block

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts packages/challenge-engine/src/runner.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/sessions.ts packages/challenge-engine/src/runner.ts apps/web/src/web.test.ts packages/challenge-engine/src/runner.test.ts
git commit -m "feat: enforce strict challenge step gates"
```

### Task 3: Build The Handoff Package At End Of Each Completed Challenge Round

**Files:**
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/state/session-store.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing test**

Add a route test that:

- runs one successful challenge round
- reads the session
- asserts that `session.challengeHandoffs[0]` exists
- asserts the handoff contains:
  - `problemFrame`
  - `userConfirmedContext`
  - `strongestCounterHypothesis`
  - `adoptionRisks`
  - `mvpScope`
  - `openConflicts`
  - `nextValidationActions`
  - `roundStatus`

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts -t "creates a structured challenge handoff"
```

Expected: FAIL because the route only stores free-form messages and draft summaries.

**Step 3: Write minimal implementation**

In `apps/web/src/routes/sessions.ts`:

- add parsers that normalize completed role output into a handoff object
- on successful grounding, build `challenge_handoff`
- persist it via the session-store helper from Task 1
- compute `round_status.mature_enough_for_decision`
- compute `round_status.mature_enough_for_requirement_build`

Keep original role messages unchanged; the handoff is additive.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts -t "creates a structured challenge handoff"
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/sessions.ts apps/web/src/state/session-store.ts apps/web/src/web.test.ts
git commit -m "feat: generate challenge handoff packages"
```

### Task 4: Upgrade The Challenge Workbench To Reflect Hard Gates

**Files:**
- Modify: `apps/web/src/views/challenge-workbench-model.ts`
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/views/challenge-workbench-model.test.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing tests**

Add model/view tests that assert:

1. the focus card exposes required checklist items for the current step
2. the user response step requires a selected response path
3. the workbench renders explicit missing-item warnings
4. mode-switch CTA is disabled when handoff maturity is insufficient

Example assertions:

```ts
expect(model.focusCard.checklist).toContainEqual({
  key: 'scenario',
  label: '场景/行业',
  completed: false,
});
expect(html).toContain('data-focus-action="partial_accept"');
expect(html).toContain('id="challengeChecklistPanel"');
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run apps/web/src/views/challenge-workbench-model.test.ts apps/web/src/web.test.ts
```

Expected: FAIL because the current workbench shows guidance copy but not hard-gate checklist state.

**Step 3: Write minimal implementation**

In `apps/web/src/views/challenge-workbench-model.ts`:

- extend the focus-card model with:
  - `stepNumber`
  - `stepTotal`
  - `checklist`
  - `modeSwitchBlockedReason`
  - `handoffReadiness`
- add explicit response path actions for the user response step

In `apps/web/src/views/index.ts`:

- render checklist panel above the composer
- render missing-item warnings
- disable downstream mode buttons with an explicit reason
- show “you cannot continue until…” copy tied to checklist completeness

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec vitest run apps/web/src/views/challenge-workbench-model.test.ts apps/web/src/web.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/views/challenge-workbench-model.ts apps/web/src/views/index.ts apps/web/src/views/challenge-workbench-model.test.ts apps/web/src/web.test.ts
git commit -m "feat: add hard-gate challenge workbench UI"
```

### Task 5: Make Decision And Requirement-Build Consume Challenge Handoff

**Files:**
- Modify: `apps/web/src/routes/sessions.ts`
- Modify: `apps/web/src/views/index.ts`
- Test: `apps/web/src/web.test.ts`

**Step 1: Write the failing tests**

Add route/UI tests that:

1. switch from a mature challenge round into `decision` and assert the response includes a visible handoff summary
2. switch into `requirement-build` and assert the first draft context uses:
   - `problemFrame`
   - `userConfirmedContext`
   - `mvpScope`
   - `constraints`
3. attempt to switch into `requirement-build` with insufficient maturity and assert a blocked response with a clear reason

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts -t "consumes challenge handoff"
```

Expected: FAIL because mode switching currently resets to generic initial phases with only topic/shared-context carry-over.

**Step 3: Write minimal implementation**

In `apps/web/src/routes/sessions.ts`:

- on mode switch, inspect latest challenge handoff
- seed `decision` with a structured handoff summary block
- seed `requirement-build` draft context from:
  - `problemFrame`
  - `userConfirmedContext`
  - `mvpScope`
  - `constraints`
- reject downstream switches when maturity rules fail

In `apps/web/src/views/index.ts`:

- surface a lightweight handoff panel for `decision` and `requirement-build`
- label it as inherited from the latest challenge round, not user-entered from scratch

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts -t "consumes challenge handoff"
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/routes/sessions.ts apps/web/src/views/index.ts apps/web/src/web.test.ts
git commit -m "feat: seed downstream modes from challenge handoff"
```

### Task 6: Full Verification And Documentation Touch-Up

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/plans/2026-03-13-cli-plus-challenge-handoff-design.md`
- Test: `apps/web/src/web.test.ts`
- Test: `apps/web/src/views/challenge-workbench-model.test.ts`
- Test: `apps/web/src/state/session-store.test.ts`
- Test: `packages/challenge-engine/src/runner.test.ts`

**Step 1: Write any missing regression tests**

Add any missing coverage for:

- five-round limit plus strict handoff generation
- fallback output structure
- blocked mode switching reasons
- downstream preheat visibility

**Step 2: Run the focused test suite**

Run:

```bash
pnpm exec vitest run apps/web/src/web.test.ts apps/web/src/views/challenge-workbench-model.test.ts apps/web/src/state/session-store.test.ts packages/challenge-engine/src/runner.test.ts
```

Expected: PASS

**Step 3: Run build verification**

Run:

```bash
pnpm --filter @prodmind/shared-types build
pnpm --filter @prodmind/challenge-engine build
pnpm --filter @prodmind/app-web build
```

Expected: PASS

**Step 4: Update docs**

Update `docs/README.md` to reflect:

- `challenge` is now the strict upstream mode
- downstream modes consume challenge handoff
- incomplete maturity blocks requirement drafting

If the implementation deviates from the design doc, update the design doc with a short “Implemented Notes” section.

**Step 5: Commit**

```bash
git add docs/README.md docs/plans/2026-03-13-cli-plus-challenge-handoff-design.md docs/plans/2026-03-13-cli-plus-challenge-handoff-plan.md
git commit -m "docs: record cli-plus challenge handoff workflow"
```

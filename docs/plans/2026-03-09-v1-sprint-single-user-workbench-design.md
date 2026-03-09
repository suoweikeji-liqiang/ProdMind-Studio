# V1 Sprint Single-User Workbench Design

**Date:** 2026-03-09

## Goal

Close ProdMind-Studio into a V1 candidate for a single-user decision workbench. The sprint focuses on polishing the Web-led happy path, making results and recovery semantics clearer, tightening history revisit, and aligning docs and acceptance gates with the actual internal-pilot maturity level.

## Scope Boundaries

Formal code changes are limited to:

- `apps/web`
- `apps/cli`
- `docs`
- `scripts`
- `tests`

Optional supporting hooks remain allowed only where already approved by V1 scope and existing system boundaries:

- `packages/asset-engine` for read-only history/result retrieval already exposed to thin shells
- no provider-policy rework unless needed for contract-backed display

Explicitly out of scope for V1:

- auth / RBAC
- multi-user collaboration
- workspaces / tenants
- provider marketplace
- billing system
- heavy dashboard platform
- mobile app
- heavy DB productization
- major UI redesign
- non-workbench engine refactors

## Product Boundary

V1 is a single-user decision workbench with:

1. idea input
2. challenge round
3. decision summary
4. asset output
5. history revisit
6. basic recovery and failure guidance

Web is the primary entry. CLI remains an operator-oriented secondary path.

## Design Principles

1. Keep Web and CLI thin.
2. Improve clarity before adding capability.
3. Prefer structured result rendering over chat-style output.
4. Surface recovery semantics without building auto-orchestration.
5. Keep readiness language conservative: internal V1 candidate, not broader rollout.

## Approved Information Architecture

### Web entry points

Keep or add only these pages:

- `/`
- `/workflow`
- `/results/:id`
- `/history`
- `/history/:runId`

No dashboard, no operator control plane, no multi-user workspace shell.

### Main journey

The primary Web path remains:

`Home -> Workflow -> Running status -> Results -> History revisit`

The path should answer four questions clearly:

1. Where do I start?
2. What stage is running now?
3. What happened after completion or failure?
4. How do I revisit an earlier run?

## Recommended Architecture

### 1. Home page polish

The home page should frame ProdMind-Studio as a single-user decision workbench, with:

- one clear primary CTA to start a workflow
- one secondary CTA to review history
- short explanation of what the workflow produces

### 2. Workflow page polish

The workflow page remains a thin shell over the workflow API and should clarify:

- what input is expected
- which workflow stage is currently running
- what skip/recovery semantics mean when artifacts already exist
- what the system already did if a failure occurs
- what the user can do next

This remains read-only status and submission behavior. No business logic is pulled into the page.

### 3. Results page polish

The results page should shift from “data dump” to “conclusion first”:

- challenge: hypotheses, conflicts, MVP boundary, next actions
- decision: recommendation, risks, hypotheses, options
- assets: output location and generated artifacts
- provider summary: secondary operational context

The page should also fall back to persisted history data if the in-memory workflow state no longer contains full result data.

### 4. History and revisit

Add a thin read-only history list and detail experience:

- history list shows run idea, status, timing, and summary signal
- history detail shows phase status, failure state if any, artifacts, and provider summary
- result revisit should work even after process-local state is gone

This is not a search or analytics system.

### 5. Failure and recovery semantics

The system should explain:

- where failure occurred
- what steps already completed
- whether fallback/retry happened
- whether a phase was skipped because artifacts already existed
- what the user can do next

Allowed next steps:

- rerun workflow
- inspect history detail
- inspect generated artifacts
- run opt-in real-provider validation when investigating provider issues

No automatic repair orchestration is added.

### 6. CLI alignment

CLI remains the operator companion surface and should align with Web semantics:

- clearer history list and detail output
- clearer failure wording
- clearer recovery wording
- continued provider summary visibility

### 7. Documentation and release gating

V1 requires explicit docs for:

- V1 boundary
- recommended run path
- fake vs real provider usage
- known limitations
- release checklist and acceptance gate

Readiness stays at internal pilot / single-user V1 candidate unless acceptance evidence says otherwise.

## Options Considered

### Option 1: Thin-shell V1 closing pass

Polish the existing workflow, result, history, and docs paths using the current module boundaries.

Why this is recommended:

- matches the approved V1 scope
- improves actual usability without reopening architecture
- preserves engine, persistence, and provider boundaries

### Option 2: Add a richer dashboard shell

Build a more analytical Web surface with multiple panes, filters, and operator controls.

Why rejected:

- this is dashboard product work, not V1 closeout
- adds surface area without improving the primary single-user journey enough

### Option 3: Rework engine output contracts first

Refactor engines to produce richer dedicated view models.

Why rejected:

- not needed for V1 closeout
- risks unnecessary engine churn
- existing summaries are sufficient for a presentation-layer polish pass

## Testing Strategy

1. Add failing Web tests for home, workflow, result, and history rendering.
2. Add failing CLI tests for history, failure, and provider summary wording.
3. Implement the minimum code to pass those tests.
4. Run focused package tests, then `pnpm run check:all`.
5. Run a V1 acceptance pass:
   - fake-provider happy path
   - Web main path verification
   - CLI history/revisit verification
   - opt-in real-provider smoke only if environment allows

## Documentation Plan

Add:

- `docs/v1-boundary.md`
- `docs/v1-release-checklist.md`
- `docs/plans/2026-03-09-v1-sprint-single-user-workbench-plan.md`

Update:

- `README.md`
- `docs/README.md`
- `docs/runbook.md`
- `docs/release-readiness.md`
- `docs/support-matrix.md`
- `docs/migration-plan.md` if wording needs V1 closeout alignment

## Deferred Items

Defer to V1.1 or later unless real pilot evidence changes:

- collaboration workflows
- auth and RBAC
- tenant/workspace concepts
- dashboard analytics product
- budget control product
- heavy database expansion
- mobile experience
- advanced history filtering or search

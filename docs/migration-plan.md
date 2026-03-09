# Migration Plan (Layered Refactor, Not Code Dump)

## Current Status

Migration phases through Phase 5D are complete enough to support the V1 sprint closeout.

Current product framing:

- single-user decision workbench
- Web-first usage
- CLI as operator assist
- internal-pilot scope only

Current release docs:

- [v1-boundary.md](v1-boundary.md)
- [v1-release-checklist.md](v1-release-checklist.md)
- [release-readiness.md](release-readiness.md)

## Total Principles
- Do not copy old repos wholesale.
- Extract kernel first, shell later.
- Keep all new docs/code inside `ProdMind-Studio`.
- Every migration step must map to concrete source files.
- Preserve behavior through contracts and tests, not by preserving old directory shapes.
- Prefer incremental compatibility shims over framework-coupled rewrites.

## Why Phase 1 Starts Where It Starts
- Target product is a pipeline from challenge/decision to structured assets.
- Asset accumulation is the final value sink and gives stable integration contracts for later engines.
- `requirement-co-builder` has the cleanest kernel modularity (state/projects/output/adapter), least UI coupling, and broad tests.
- Therefore Phase 1 should establish:
  - `asset-engine` base
  - shared cross-engine contracts in `shared-types`
  - provider abstraction in `llm-adapter`
- This enables challenge/decision extraction to plug into a stable artifact backend, instead of coupling directly to CLI/Web shells.

## Phase Roadmap

## Phase 1: Foundation + Asset Core ✅ COMPLETED

### Goal
- Build the migration substrate and land the first production-grade engine (`asset-engine`) with minimal shell.

### Status: COMPLETED (2026-03-07)

### Completed Work
- ✅ Defined canonical shared contracts in `packages/shared-types`:
  - `domain/project.ts`: ProjectState, Message, Projection, Compression
  - `generation/llm.ts`: LLMAdapter, LLMMessage, LLMProvider, LLMConfig
  - `persistence/store.ts`: ProjectStore, AssetWriter
- ✅ Implemented `packages/asset-engine` kernel:
  - `store.ts`: atomic persistence with crash recovery
  - `writer.ts`: artifact compiler (idea/spec/acceptance/tasks)
- ✅ Implemented `packages/llm-adapter` minimal provider interface:
  - `provider.ts`: OpenAI/Anthropic support with fallback
  - `fake-provider.ts`: deterministic testing provider
- ✅ Added test coverage:
  - Unit tests for store and fake provider
  - Golden path test for complete asset generation
- ✅ Workspace build/test scaffolding functional

### Migrated Files
From `requirement-co-builder`:
- `src/state/schema.ts` → `packages/shared-types/src/domain/project.ts`
- `src/state/index.ts` → `packages/asset-engine/src/store.ts`
- `src/state/atomic.ts` → `packages/asset-engine/src/store.ts` (merged)
- `src/output/artifacts.ts` → `packages/asset-engine/src/writer.ts`
- `src/output/compile.ts` → `packages/asset-engine/src/writer.ts` (merged)
- `src/adapters/llm.ts` → `packages/llm-adapter/src/provider.ts`

### Intentionally NOT Migrated
- CLI shell (commander, inquirer, chalk, ora)
- Dialogue engine (dialogue/*)
- Display utilities (display/*)
- Research features (projects/research.ts)
- Config management (config/*)
- Utility functions (utils/id.ts, utils/paths.ts)
- Project listing/management

### Next Steps
See [phase1-asset-engine.md](./phase1-asset-engine.md) for detailed Phase 1 documentation.

## Phase 1: Foundation + Asset Core

### Goal
- Build the migration substrate and land the first production-grade engine (`asset-engine`) with minimal shell.

### Source Inputs
- Primary: `requirement-co-builder`
- Secondary references:
  - `prodmind-v1` export contracts
  - `prodmind-v2/prodmind2-*` snapshot/report concepts

### Work Items
- Define canonical shared contracts in `packages/shared-types`.
- Implement `packages/asset-engine` kernel:
  - state schema + atomic persistence
  - project lifecycle
  - snapshot/research
  - artifact compiler (`spec/acceptance/tasks`)
- Implement `packages/llm-adapter` minimal provider interface (without wiring UI).
- Add thin compile-time scaffolding for workspace build/test.

### Risks
- Risk: overfitting assets to current CLI file layout.
  - Mitigation: design DTO-level contracts first in `shared-types`.
- Risk: leaking shell semantics into engine.
  - Mitigation: no `commander`/readline in engine packages.

## Phase 2: Challenge Engine Extraction ✅ COMPLETED

### Goal
- Extract adversarial debate kernel from `prodmind-v1`/legacy `prodmind-v2` into `packages/challenge-engine`.

### Status: COMPLETED (2026-03-07)

### Completed Work
- ✅ Implemented `packages/challenge-engine` kernel:
  - `roles.ts`: 4 roles with inline prompts (architect, assassin, userGhost, grounder)
  - `rules.ts`: 5 conflict detection rules
  - `runner.ts`: single round execution + summary builder
- ✅ Extended `packages/shared-types`:
  - `domain/challenge.ts`: ChallengeSession, ChallengeRound, ChallengeSummary, etc.
- ✅ Added test coverage:
  - Unit tests for all rule detection functions
  - Golden path test for complete challenge round

### Migrated Files
From `prodmind-v1`:
- `prodmind-cli/src/roles/index.ts` → `packages/challenge-engine/src/roles.ts` (simplified)
- `prodmind-cli/src/consensus-check.ts` → `packages/challenge-engine/src/rules.ts`
- `prodmind-cli/src/debate.ts` → `packages/challenge-engine/src/runner.ts` (core logic only)
- `prodmind-cli/src/storage.ts` types → `packages/shared-types/src/domain/challenge.ts`

### Intentionally NOT Migrated
- CLI interaction loop (inquirer prompts)
- Terminal display (chalk, dividers)
- Session persistence (saveSession, listSessions)
- Markdown export
- Config management
- Prompt file loading
- Fallback generation
- Multi-round history management

### Next Steps
See [phase2-challenge-engine.md](./phase2-challenge-engine.md) for detailed Phase 2 documentation.

## Phase 2.5: Challenge-Asset Integration ✅ COMPLETED

### Goal
- Bridge challenge-engine and asset-engine before Phase 3 to stabilize contracts.

### Status: COMPLETED (2026-03-07)

### Completed Work
- ✅ Defined challenge-to-asset handoff contract
- ✅ Implemented minimal multi-round session state
- ✅ Added convergence and stop-condition logic
- ✅ Connected challenge-engine to asset-engine
- ✅ Added golden path for multi-round persistence

### Key Contracts Introduced
- `ChallengeArtifact`, `ChallengeToAssetHandoff`
- `ChallengeSessionState`, `ChallengeProgressStatus`
- `Hypothesis`, `FalsificationCheck`, `NextAction`

### Deferred to Phase 3+
- decision-engine business logic
- challenge-decision coordination
- CLI/Web shells
- Advanced convergence strategies

### Next Steps
See [phase2_5-challenge-asset-integration.md](./phase2_5-challenge-asset-integration.md) for detailed documentation.

## Phase 2: Challenge Engine Extraction

### Goal
- Extract adversarial debate kernel from `prodmind-v1`/legacy `prodmind-v2` into `packages/challenge-engine`.

### Source Inputs
- Primary:
  - `prodmind-v1/prodmind-cli/src/{debate.ts,consensus-check.ts,roles/index.ts,export.ts,storage.ts}`
  - `prodmind-v1/prodmind-web/src/lib/engine/{debate.ts,roles.ts,consensus-check.ts,convergence.ts,export.ts}`
- Patch reference:
  - `prodmind-v2/prodmind-web` differences (falsification regex, typed role stream, DB/init fixes)

### Work Items
- Normalize round protocol and conflict-rule pipeline as framework-agnostic functions.
- Define challenge event stream contracts in `shared-types`.
- Move prompt loading and role-call adapters behind `llm-adapter`.
- Port convergence logic and export formatting contracts.

### Risks
- Risk: behavior drift between CLI and Web variants.
  - Mitigation: create golden tests using historical session fixtures.
- Risk: multilingual regex/prompt assumptions break.
  - Mitigation: include CN/EN test cases for conflict/falsification checks.

## Phase 3: Decision Engine Extraction ✅ COMPLETED

### Goal
- Extract stateful multi-agent decision orchestration into `packages/decision-engine`.

### Status: COMPLETED (2026-03-07)

### Completed Work
- ✅ Implemented `packages/decision-engine` kernel:
  - `session.ts`: decision session state management
  - `orchestrator.ts`: decision step execution and summary builder
- ✅ Extended `packages/shared-types`:
  - `domain/decision.ts`: DecisionSession, DecisionStep, DecisionSummary
- ✅ Implemented decision-to-asset handoff
- ✅ Added golden path test for decision orchestration

### Migrated Files
From `prodmind-v2`:
- Core decision logic → `packages/decision-engine/src/orchestrator.ts`
- Session state → `packages/decision-engine/src/session.ts`
- Types → `packages/shared-types/src/domain/decision.ts`

### Intentionally NOT Migrated
- Scheduler policy (deferred to Phase 4B+)
- Context builder (deferred)
- Parser extraction (deferred)
- Supabase schema coupling
- Web UI components

### Risks
- Risk: hard coupling to Supabase schema and auth context.
  - Mitigation: split storage adapter interface from domain core.
- Risk: parser fragility from prompt format drift.
  - Mitigation: parser tests with variant outputs.

## Phase 4A: CLI Composition Layer (IN PROGRESS)

### Goal
- Implement thin CLI composition layer to connect challenge → decision → asset into executable main path.

### Status: IN PROGRESS (2026-03-07)

### Scope
- ✅ Define CLI boundary (composition only, no engine logic)
- 🔄 Implement minimal command surface (init, challenge, decision, assets, workflow)
- 🔄 Compose full engine workflow (idea → challenge → decision → assets)
- 🔄 Add E2E CLI golden path test
- 🔄 Introduce minimal workflow metadata hooks
- ❌ NOT implementing Web UI (deferred to Phase 4B)
- ❌ NOT implementing full planning system (deferred)

### Work Items
1. Define CLI responsibility boundary
2. Implement minimal commands: init, challenge, decision, assets, workflow
3. Compose engines into executable pipeline
4. Add E2E golden path test
5. Add minimal workflow metadata contract

### Risks
- Risk: CLI absorbing engine logic
  - Mitigation: strict boundary documentation + quality gates
- Risk: scope creep into Web UI or planning system
  - Mitigation: explicit deferred items list

### Next Steps
- Phase 4B: Web UI composition layer
- Phase 5: Convergence and hardening

## Phase 4B: Web Composition Layer (IN PROGRESS)

### Goal
- Implement thin Web composition layer that wraps validated CLI workflow into minimal usable Web interface.

### Status: IN PROGRESS (2026-03-07)

### Scope
- ✅ Define Web composition boundary (see phase4b-web-boundary.md)
- 🔄 Establish minimal Web app shell (landing, workflow, results pages)
- 🔄 Implement workflow execution entry from Web
- 🔄 Add staged progress feedback (queued → running → complete)
- 🔄 Render structured results (not chat bubbles)
- 🔄 Add Web E2E happy path test
- 🔄 Keep Web thin and scope controlled
- ❌ NOT implementing auth/multi-user (deferred to Phase 4C+)
- ❌ NOT implementing heavy frontend architecture (deferred)

### Work Items
1. Define Web responsibility boundary and forbidden patterns
2. Establish minimal page structure (landing, workflow, results)
3. Implement workflow execution entry (idea → challenge → decision → assets)
4. Add stage-level progress feedback (not just spinner)
5. Render structured results with proper semantic display
6. Add Web-level E2E happy path test
7. Document deferred items (auth, collaboration, planning system UI)
8. Validate boundaries and quality gates

### Source Inputs
- Web shell references:
  - `prodmind-v1/prodmind-web/src/app/**`
  - `prodmind-v2/prodmind2-web/src/app/**` + `src/components/**`
- Validated CLI workflow from Phase 4A

### Risks
- Risk: reintroducing engine logic into route handlers/components.
  - Mitigation: strict boundary documentation (phase4b-web-boundary.md) + quality gates
- Risk: scope creep into heavy product frontend.
  - Mitigation: explicit deferred items list + thin composition principle

### Next Steps
- Phase 4C: Advanced Web features (auth, collaboration)
- Phase 5: Convergence and hardening

## Phase 5: Convergence, Hardening, and Cleanup

### Goal
- Stabilize behavior, validate migration completeness, and retire redundant paths.

### Source Inputs
- All migrated packages and test fixtures from three source repos.

### Work Items
- End-to-end scenario suites:
  - challenge-only
  - decision-only
  - challenge -> decision -> asset pipeline
- Regression checks for export artifacts.
- Document final architecture and deprecate source-specific assumptions.

### Risks
- Risk: silent regressions in output quality.
  - Mitigation: snapshot-based artifact diff tests and UAT baselines.

## Phase-to-Repo Matrix
- Phase 1: mainly `requirement-co-builder` (+ minor references to `prodmind-v1/v2`)
- Phase 2: mainly `prodmind-v1` (+ legacy patches from `prodmind-v2/prodmind-web`)
- Phase 3: mainly `prodmind-v2/prodmind2-*`
- Phase 4: all three repos (shell composition only)
- Phase 5: unified repo only (validation and convergence)

## Phase 1 Starting File Set (Concrete)
- `requirement-co-builder/src/state/schema.ts`
- `requirement-co-builder/src/state/index.ts`
- `requirement-co-builder/src/state/atomic.ts`
- `requirement-co-builder/src/projects/index.ts`
- `requirement-co-builder/src/projects/snapshot.ts`
- `requirement-co-builder/src/projects/research.ts`
- `requirement-co-builder/src/output/compile.ts`
- `requirement-co-builder/src/output/artifacts.ts`
- `requirement-co-builder/src/adapters/llm.ts` (contract extraction only)

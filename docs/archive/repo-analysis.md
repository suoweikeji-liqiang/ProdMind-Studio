# Repo Analysis for Product Unification

## Scope and Method
- Analysis date: 2026-03-06.
- Source repos scanned:
  - `D:\work\product-unification\prodmind-v1`
  - `D:\work\product-unification\prodmind-v2`
  - `D:\work\product-unification\requirement-co-builder`
- Evidence basis:
  - Top-level structure
  - `README` / usage docs
  - all discovered `package.json`
  - `src` and key folders (`cli`, `web`, `engine`, `state`, `output`, `roles`, `scheduler`, `types`, `api`)
  - concrete entry files and implementation files

## Repo 1: `prodmind-v1`

### Structural Facts
- Top level: `prodmind-cli/` + `prodmind-web/` (two independent Node projects), no workspace manager at root.
- Engineering shape: multi-app repository (not a formal monorepo).
- Product orientation: adversarial challenge engine around cognitive stress-test debate.

### Entrypoints
- CLI entry:
  - `prodmind-cli/package.json` -> `bin.prodmind = ./dist/index.js`
  - source entry: `prodmind-cli/src/index.ts`
- Web entry:
  - Next.js app in `prodmind-web/src/app/page.tsx`
  - API entry for orchestration: `prodmind-web/src/app/api/debate/route.ts`

### Kernel Capability Locations (to preserve)
- Role mechanism and role execution:
  - CLI: `prodmind-cli/src/roles/index.ts`
  - Web: `prodmind-web/src/lib/engine/roles.ts`
- Round orchestration / state-machine:
  - CLI: `prodmind-cli/src/debate.ts`
  - Web: `prodmind-web/src/lib/engine/debate.ts`
- Conflict rules (alternative hypothesis / consensus alert / tech escape / falsification):
  - CLI: `prodmind-cli/src/consensus-check.ts`
  - Web: `prodmind-web/src/lib/engine/consensus-check.ts`
- State model:
  - CLI JSON state: `prodmind-cli/src/storage.ts` (`Session`, `Round`, `GrounderOutput`)
  - Web DB state: `prodmind-web/src/lib/db/schema.ts` + `prodmind-web/src/types/index.ts`
- Convergence logic:
  - `prodmind-web/src/lib/engine/convergence.ts`
- Document/export logic:
  - CLI markdown export: `prodmind-cli/src/export.ts`
  - Web markdown/json export: `prodmind-web/src/lib/engine/export.ts`

### Outer-Shell Capability Locations (not Phase 1 priority)
- CLI shell:
  - command routing, inquirer interaction, terminal style in `prodmind-cli/src/index.ts`
- Web shell:
  - UI components and pages under `prodmind-web/src/components/**`, `src/app/**` (except API composition routes)
  - i18n, styling, layout wrappers

### Migration Fitness
- Good Phase 1 candidates:
  - conflict-rule pure functions
  - role-call contract and prompt loading abstraction
  - round orchestration protocol (without CLI/Web IO)
  - export formatter contract
- Not Phase 1:
  - Next.js pages/components
  - CLI inquirer command UX

## Repo 2: `prodmind-v2`

### Structural Facts
- Top level contains four app folders:
  - legacy: `prodmind-cli/`, `prodmind-web/`
  - v2 line: `prodmind2-cli/`, `prodmind2-web/`
- Engineering shape: multi-product collection repo (not workspace-based monorepo).
- Product orientation:
  - legacy pair remains challenge-focused
  - `prodmind2-*` introduces decision-state and richer orchestration

### Notable Duplicate/Overlap
- `prodmind-v2/prodmind-cli` is byte-equivalent to `prodmind-v1/prodmind-cli`.
- `prodmind-v2/prodmind-web` is near-equivalent to `prodmind-v1/prodmind-web` with targeted fixes:
  - stronger falsification validation regex (CN+EN)
  - typed role stream signatures
  - async DB init (`await client.executeMultiple`)
  - safer session fetch
  - extra conflict UI states

### Entrypoints (v2 line)
- CLI entry:
  - `prodmind2-cli/package.json` -> `bin.prodmind2 = ./dist/index.js`
  - source entry: `prodmind2-cli/src/index.ts`
- Web entry:
  - app redirect at `prodmind2-web/src/app/page.tsx` -> `/sessions`
  - orchestration API: `prodmind2-web/src/app/api/debate/route.ts`

### Kernel Capability Locations (to preserve)
- Decision state model and mutation logic:
  - CLI: `prodmind2-cli/src/storage.ts`, `prodmind2-cli/src/state.ts`
  - Web DB schema: `prodmind2-web/supabase/migrations/001_initial_schema.sql`
- Dynamic scheduler:
  - CLI: `prodmind2-cli/src/scheduler.ts`
  - Web: `prodmind2-web/src/lib/engine/scheduler.ts`
- Multi-agent role orchestration:
  - CLI: `prodmind2-cli/src/session.ts`, `prodmind2-cli/src/roles/index.ts`
  - Web: `prodmind2-web/src/lib/engine/debate.ts`, `src/lib/engine/roles.ts`, `src/lib/engine/context-builder.ts`
- Structured parser extraction:
  - `prodmind2-web/src/lib/engine/parsers.ts`
- Snapshot and confidence mechanics:
  - CLI snapshots in `prodmind2-cli/src/state.ts` + session persistence
  - Web snapshot persistence in `prodmind2-web/src/lib/engine/debate.ts` (`takeSnapshot`, confidence recalc)
- Export/report generation:
  - CLI: `prodmind2-cli/src/export.ts`
  - Web: `prodmind2-web/src/lib/engine/export.ts`

### Outer-Shell Capability Locations (not Phase 1 priority)
- War-room and dashboard UI:
  - `prodmind2-web/src/components/**`
  - Zustand view store `src/stores/session-store.ts` (UI-driven store)
- Auth/session shell:
  - Supabase auth pages and middleware
- CLI interactive menu shell:
  - provider/routing management UX in `prodmind2-cli/src/index.ts`

### Migration Fitness
- Good Phase 1+ candidates:
  - decision state tree model
  - scheduler rules
  - confidence algorithm
  - parser extraction logic
  - snapshot semantics
- Not Phase 1:
  - web war-room interface
  - auth/session page shell

## Repo 3: `requirement-co-builder`

### Structural Facts
- Single-package TypeScript CLI project (one `package.json` at root).
- Engineering shape: single-app CLI with modular `src/*` layering and broad unit tests.
- Product orientation: requirement asset building and project-state accumulation.

### Entrypoints
- CLI entry:
  - `package.json` -> `bin.req = ./dist/bin/req.js`
  - source entry: `src/bin/req.ts`
- No web application.

### Kernel Capability Locations (to preserve)
- Project state schema and stage model:
  - `src/state/schema.ts`
  - `src/dialogue/model.ts` (`concept -> direction -> structure -> executable`)
- Safe persistence and recovery:
  - `src/state/atomic.ts`
  - `src/state/index.ts`
- Project lifecycle and storage model:
  - `src/projects/index.ts`, `src/projects/schema.ts`
- Snapshot and research assets:
  - `src/projects/snapshot.ts`, `src/projects/research.ts`
- Dialogue kernel and guards:
  - `src/dialogue/engine.ts`
  - `src/dialogue/guards.ts`
  - `src/dialogue/logic-chain.ts`
  - `src/dialogue/render.ts`
  - `src/dialogue/explain.ts`
- Artifact generation:
  - round artifact sync: `src/output/artifacts.ts`
  - final compile: `src/output/compile.ts`
- LLM abstraction:
  - `src/adapters/llm.ts` (stream + structured generation + JSON repair fallback)

### Outer-Shell Capability Locations (not Phase 1 priority)
- Commander command structure in `src/bin/req.ts`
- Terminal rendering style in `src/display/stream.ts`
- CLI conversation loop UX in `src/dialogue/session.ts`

### Migration Fitness
- Strong Phase 1 candidates:
  - `state/*`, `projects/*`, `output/*`, `adapters/llm.ts`
- Not Phase 1:
  - full `req` command shell and terminal presentation

## Cross-Repo Engineering Positioning

### `prodmind-v1`
- Best classified as: dual-app product prototype repo (CLI + Web).
- Strength: challenge/debate kernel, conflict rule set, and convergence framing.
- Weak point for early migration: UI shell duplication and mixed storage implementations.

### `prodmind-v2`
- Best classified as: multi-line experimental product repo (legacy + v2 in one place).
- Strength: decision-state orchestration, scheduler, snapshot semantics, multi-agent routing.
- Weak point for early migration: heavy web shell and Supabase integration coupling.

### `requirement-co-builder`
- Best classified as: single-package CLI with modular domain core.
- Strength: structured asset output pipeline and testable state model.
- Weak point for early migration: CLI command UX and terminal-specific concerns.

## Kernel vs Shell Summary (Phase 1 Filter)

### Keep Early (Kernel)
- Challenge: debate protocol, conflict rules, role contracts, convergence checks.
- Decision: state tree schema, agent scheduler, parser extraction, confidence/snapshot logic.
- Asset: project state persistence, snapshot, research log, artifact compile and sync.
- Cross-cutting: provider-agnostic LLM adapter contract, shared domain types.

### Defer (Shell)
- CLI command parsers and terminal style wrappers.
- Web pages/components/layouts and auth shells.
- UI state stores that primarily mirror presentation concerns.

## What Should Migrate in Phase 1 vs Not

### Suitable for Phase 1
- From `requirement-co-builder`:
  - `src/state/{schema.ts,index.ts,atomic.ts}`
  - `src/projects/{index.ts,snapshot.ts,research.ts}`
  - `src/output/{compile.ts,artifacts.ts}`
  - `src/adapters/llm.ts` (as design reference for `llm-adapter`)
- From `prodmind-v1` (or v2 legacy equivalent):
  - conflict-rule core (`consensus-check.ts`)
  - role-call abstraction shape
- From `prodmind-v2/prodmind2-*`:
  - decision state/scheduler/parsers definitions (no UI)

### Not Suitable for Phase 1
- `prodmind-web` / `prodmind2-web` page/component trees.
- interactive CLI shells in `prodmind-cli/src/index.ts`, `prodmind2-cli/src/index.ts`, `src/bin/req.ts`.
- Supabase auth/middleware and full web shell integration.


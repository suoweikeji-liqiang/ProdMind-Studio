# ProdMind-Studio

Unified repository for a layered product system:
- challenge and adversarial idea stress testing
- decision state orchestration
- structured requirement asset accumulation

This repo is intentionally migration-first:
- no large code copy from source repos
- engine boundaries before shell implementation
- standards and quality gates before feature volume

## Monorepo Layout
- `apps/cli` - CLI shell (thin composition layer)
- `apps/web` - Web shell (thin composition layer)
- `packages/challenge-engine` - challenge protocol and conflict rules
- `packages/decision-engine` - stateful decision orchestration
- `packages/asset-engine` - project state and artifact generation
- `packages/shared-types` - canonical cross-package contracts
- `packages/llm-adapter` - provider abstraction boundary
- `docs/` - architecture, standards, migration, execution docs
- `scripts/` - repo checks and quality gate scripts
- `tests/` - shared fixtures, golden outputs, fakes, helpers

## Local Commands
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run check:docs`
- `pnpm run check:boundaries`
- `pnpm run check:forbidden-deps`
- `pnpm run check:all`

## Standards Entry
See [docs/README.md](D:/work/product-unification/ProdMind-Studio/docs/README.md) for grouped navigation:
- architecture and boundaries
- UI/testing/quality standards
- migration and phase plans
- CI and execution guidance

Direct links:
- [repo-analysis.md](D:/work/product-unification/ProdMind-Studio/docs/repo-analysis.md)
- [module-boundary.md](D:/work/product-unification/ProdMind-Studio/docs/module-boundary.md)
- [migration-plan.md](D:/work/product-unification/ProdMind-Studio/docs/migration-plan.md)
- [ui-standards.md](D:/work/product-unification/ProdMind-Studio/docs/ui-standards.md)
- [testing-standards.md](D:/work/product-unification/ProdMind-Studio/docs/testing-standards.md)
- [quality-gates.md](D:/work/product-unification/ProdMind-Studio/docs/quality-gates.md)

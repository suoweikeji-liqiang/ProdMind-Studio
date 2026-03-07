# ProdMind-Studio

Unified repository for a layered product system:
- challenge and adversarial idea stress testing
- decision state orchestration
- structured requirement asset accumulation

**Current Stage:** Phase 5A complete - enhanced persistence and provider foundations

This repo is intentionally migration-first:
- no large code copy from source repos
- engine boundaries before shell implementation
- standards and quality gates before feature volume

## Phase 5A Enhancements

**Persistence:**
- Abstraction boundary defined (`PersistenceRepository` interface)
- File backend (default, production-ready)
- SQLite backend (validation, requires native compilation)

**Provider Integration:**
- Formalized provider boundary with error normalization
- Opt-in real provider smoke workflow
- Minimal observability hooks

**Configuration:**
- Environment-based backend/provider selection
- Safe defaults (file backend, fake provider)

See [docs/phase5a-completion-report.md](docs/phase5a-completion-report.md) for details.

## System Status

See [docs/system-maturity.md](docs/system-maturity.md) for current maturity assessment.

**Ready for:** Local development, single-user exploration, internal pilot demonstrations
**Not ready for:** Multi-user collaboration, production deployment at scale

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

**Quality Gates:**
- `pnpm run check:all` - Run all quality gates (recommended before commit)
- `pnpm run lint` - Lint all packages
- `pnpm run typecheck` - Type check all packages
- `pnpm run test` - Run all tests
- `pnpm run build` - Build all packages

**Development:**
- `pnpm run dev:cli` - Build and run CLI
- `pnpm run dev:web` - Build and run Web server

**Testing:**
- `pnpm run test:smoke` - Run smoke tests with real provider (requires API key)
- `pnpm run test:smoke-real` - Run real provider smoke test (OpenAI/Anthropic)

**Phase 5A Commands:**
```bash
# File backend (default)
pnpm run dev:cli workflow "your idea"

# SQLite backend (experimental)
PERSISTENCE_BACKEND=sqlite pnpm run dev:cli workflow "your idea"

# Real provider (opt-in, requires API key)
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx pnpm run dev:cli workflow "your idea"

# Real provider smoke test
OPENAI_API_KEY=sk-xxx pnpm run test:smoke-real
```

See [docs/configuration.md](docs/configuration.md) and [docs/support-matrix.md](docs/support-matrix.md) for details.

**Individual Checks:**
- `pnpm run check:docs` - Validate documentation
- `pnpm run check:boundaries` - Validate module boundaries
- `pnpm run check:forbidden-deps` - Check for forbidden dependencies

See [docs/runbook.md](docs/runbook.md) for detailed operational guide.

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

# ProdMind-Studio

ProdMind-Studio is now being closed into a V1 single-user decision workbench.

The intended operator path is:

`idea input -> challenge -> decision -> asset output -> history revisit -> basic recovery`

Current maturity: internal-pilot ready for single-user usage.

## What V1 Includes

- Web as the primary entry point
- CLI as a secondary operator surface
- Fake provider as the default safe path
- Opt-in real-provider validation path
- Persisted history and result revisit
- Provider reliability and usage summary visibility

## What V1 Does Not Include

- auth / RBAC
- multi-user collaboration
- workspaces / tenants
- provider marketplace
- billing system
- heavy dashboard platform
- mobile app
- heavy DB productization

See [docs/v1-boundary.md](docs/v1-boundary.md) for the explicit release boundary.

## Recommended Start

1. Install dependencies:

```bash
pnpm install
```

2. Run the full quality gate:

```bash
pnpm run check:all
```

3. Start Web, the primary V1 entry:

```bash
cd apps/web
pnpm run build
node dist/server.js
```

4. Optional CLI path:

```bash
cd apps/cli
pnpm run build
node dist/index.js workflow "your idea here"
```

## Provider Modes

- Default: fake provider
- Opt-in: real provider for local validation and smoke

Examples:

```bash
# Default fake-provider path
node apps/cli/dist/index.js workflow "your idea"

# Real provider path
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx MODEL_ID=gpt-4o-mini node apps/cli/dist/index.js workflow "your idea"

# Real-provider smoke
OPENAI_API_KEY=sk-xxx node scripts/smoke-real-provider.mjs
```

## Core Commands

```bash
pnpm run check:all
pnpm run build
pnpm run dev:web
pnpm run dev:cli
```

Package-specific validation:

```bash
node scripts/test-package.mjs --scope apps/web --package @prodmind/app-web
node scripts/test-package.mjs --scope apps/cli --package @prodmind/app-cli
```

## Docs

- [docs/v1-boundary.md](docs/v1-boundary.md)
- [docs/v1-release-checklist.md](docs/v1-release-checklist.md)
- [docs/runbook.md](docs/runbook.md)
- [docs/release-readiness.md](docs/release-readiness.md)
- [docs/support-matrix.md](docs/support-matrix.md)
- [docs/README.md](docs/README.md)
- [docs/ui-standards.md](docs/ui-standards.md)
- [docs/testing-standards.md](docs/testing-standards.md)
- [docs/quality-gates.md](docs/quality-gates.md)
- [docs/repo-analysis.md](docs/repo-analysis.md)
- [docs/module-boundary.md](docs/module-boundary.md)
- [docs/migration-plan.md](docs/migration-plan.md)

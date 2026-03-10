# ProdMind-Studio

ProdMind-Studio is a conversation-first internal thinking tool.

The intended primary journey is:

`topic input -> session -> mode-guided multi-round conversation -> draft summaries -> finalized artifacts -> history -> replay`

Current maturity: internal-pilot ready for single-user usage while the product migrates from legacy workflow semantics to session semantics.

## Product Position

- Web is the primary product surface
- CLI remains a secondary operator surface and baseline reference for the original V1 feel
- The main experience is Chinese multi-round conversation
- `challenge`, `decision`, and `requirement-build` are user-selected thinking modes
- Visible multi-role output and full process persistence are core product commitments

See [docs/product-principles.md](docs/product-principles.md) and [docs/v1-boundary.md](docs/v1-boundary.md) for the explicit product boundary.

## What V1 Includes

- Topic-first session entry
- Web session history and replay
- Fake provider as the default safe path
- Opt-in real-provider validation path
- Persisted session state and artifact revisit
- Provider reliability and usage summary visibility as operator context

## What V1 Does Not Include

- auth / RBAC
- multi-user collaboration
- workspaces / tenants
- provider marketplace
- billing system
- heavy dashboard platform
- mobile app
- heavy DB productization

## Recommended Start

1. Install dependencies:

```bash
pnpm install
```

2. Run the full quality gate:

```bash
pnpm run check:all
```

3. Start Web, the primary entry:

```bash
cd apps/web
pnpm run build
node dist/server.js
```

4. Optional CLI path:

```bash
cd apps/cli
pnpm run build
node dist/index.js workflow "your topic here"
```

Note:

- The current CLI still exposes legacy workflow-style commands.
- The current Web implementation is migrating away from workflow/results semantics toward session/history/replay semantics.

## Provider Modes

- Default: fake provider
- Opt-in: real provider for local validation and smoke
- Supported config sources for Web/CLI startup:
  - repo root `.env`
  - `apps/web/.env.local` or `apps/cli/.env.local`
  - shell / service-manager env vars override file values

Recommended precedence:

1. repo root `.env`
2. app-local `.env.local`
3. existing process env

After changing env files, restart the Web or CLI process.

Examples:

Repo root `.env`

```env
PROVIDER_MODE=fake
```

```env
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=qwen
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
MODEL_ID=qwen-plus
```

```env
PROVIDER_MODE=real
PROVIDER_TYPE=openai
PROVIDER_NAME=deepseek
PROVIDER_API_KEY=your-key
PROVIDER_BASE_URL=https://your-openai-compatible-endpoint
MODEL_ID=deepseek-chat
```

Optional Web-only override in `apps/web/.env.local`

```env
MODEL_ID=qwen-max
```

Command examples:

```bash
node apps/cli/dist/index.js workflow "your topic"
node scripts/smoke-real-provider.mjs
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

- [docs/product-principles.md](docs/product-principles.md)
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

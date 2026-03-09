# Operator Runbook

## Quick Start

### Prerequisites
- Node.js 18+
- `pnpm`

### Setup
```bash
pnpm install
pnpm run check:all
```

## Default Operating Mode

- Persistence default: file backend
- Provider default: fake provider
- System maturity: internal pilot ready, single-user only

## CLI

```bash
cd apps/cli
pnpm run build
node dist/index.js workflow "your idea here"
node dist/index.js history list
node dist/index.js history show <runId>
```

CLI provider summaries now expose:

- provider/model
- route/policy summary
- retries/timeouts
- fallback used or not
- failure stage
- usage/cost summary

## Web

```bash
cd apps/web
pnpm run build
node dist/server.js
```

Web results remain intentionally minimal and read-only. They expose the same contract-backed provider summary fields as CLI.

## Real Provider Usage

Real provider mode remains opt-in.

Examples:

```bash
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx MODEL_ID=gpt-4o-mini node apps/cli/dist/index.js workflow "your idea"
PROVIDER_MODE=real PROVIDER_TYPE=anthropic ANTHROPIC_API_KEY=sk-ant-xxx MODEL_ID=claude-3-5-haiku-20241022 node apps/cli/dist/index.js workflow "your idea"
```

Notes:

- Routing remains adapter-owned.
- Timeout and retry behavior are conservative.
- Fallback remains explicit-only.
- Usage/cost output is visibility only, not billing-grade.

## Real-Provider Smoke Validation

Operator-run and non-CI-blocking:

```bash
OPENAI_API_KEY=sk-xxx node scripts/smoke-real-provider.mjs
OPENAI_API_KEY=sk-xxx SMOKE_VALIDATE_POLICY=1 node scripts/smoke-real-provider.mjs
ANTHROPIC_API_KEY=sk-ant-xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
```

Expected coverage:

- structured output path
- retry / timeout behavior
- fallback visibility when explicitly configured
- usage/cost visibility

Cost note:

- Base smoke performs two real calls.
- Policy validation adds at least one more stress call.
- Explicit fallback can add extra calls.

## SQLite Validation

SQLite remains a validated secondary backend when the environment supports the native binding.

Operator-run validation:

```bash
node scripts/validate-sqlite-backend.mjs
```

Expected behavior:

- If native binding is available, the script performs a minimal round-trip validation.
- If native binding is unavailable, the script exits cleanly and prints the skip reason.

Do not treat SQLite as the default persistence backend for current pilot operations.

## Quality Gates

```bash
pnpm run check:all
```

Real-provider smoke and SQLite validation are intentionally not blocking default CI gates.

## Troubleshooting

### Workflow failure
```bash
node apps/cli/dist/index.js history show <runId>
```

Review:

- phase status
- provider execution summaries
- failure stage
- retry and timeout counts

### Native SQLite unavailable

Run:

```bash
node scripts/validate-sqlite-backend.mjs
```

If the script reports a skip reason, keep using the file backend in this environment.

## Known Limits

- No auth or multi-user support
- No provider marketplace
- No billing system
- No dashboard analytics product
- No heavy database productization
- Budget guardrails deferred pending stronger pilot evidence

# Operator Runbook

## Intended Usage

ProdMind-Studio currently runs as an internal-pilot, conversation-first internal thinking tool.

- Web is the primary entry.
- CLI is the secondary operator surface and baseline reference for the original V1 feel.
- Fake provider is the default stable mode.
- Real providers remain opt-in.

## Setup

### Prerequisites

- Node.js 18+
- `pnpm`

### Install And Verify

```bash
pnpm install
pnpm run check:all
```

## Recommended Web Path

```bash
cd apps/web
pnpm run build
node dist/server.js
```

Use the Web surface for:

- starting a new topic-first session
- continuing a multi-round mode-guided conversation
- reviewing draft summaries and finalized artifacts
- reopening prior sessions from history/replay

## CLI Path

```bash
cd apps/cli
pnpm run build
node dist/index.js workflow "your topic here"
node dist/index.js history list
node dist/index.js history show <runId>
```

Use CLI when you need:

- a terminal-driven legacy workflow run for operator debugging
- reviewing run history from the command line
- provider failure details and usage summary

## Fake Vs Real Provider

### Default fake-provider path

Use for CI, local development, and default internal-pilot verification.

```bash
node apps/cli/dist/index.js workflow "your topic"
```

### Real-provider path

Use only when validating real provider behavior.

Provider config can come from:

1. repo root `.env`
2. app-local `.env.local`
3. existing process env

Process env stays highest priority. After changing env files, restart Web or CLI.

Repo root `.env` examples:

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

```env
PROVIDER_MODE=real
PROVIDER_TYPE=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
MODEL_ID=claude-3-5-haiku-20241022
```

Optional app-local override:

`apps/web/.env.local`

```env
MODEL_ID=qwen-max
```

`apps/cli/.env.local`

```env
MODEL_ID=deepseek-reasoner
```

Direct shell override still works:

```bash
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx MODEL_ID=gpt-4o-mini node apps/cli/dist/index.js workflow "your topic"
```

Notes:

- routing and policy remain adapter-owned
- retry/timeout/fallback remain conservative
- usage/cost is visibility only, not billing-grade
- `PROVIDER_TYPE=openai` is the correct setting for Qwen or DeepSeek OpenAI-compatible endpoints
- `PROVIDER_NAME` is display-only; it does not change routing or reliability policy

## History And Revisit

### Web

- `/sessions` is the primary session history list
- `/sessions/:id` reopens the live session
- `/sessions/:id/replay` is the primary replay path
- Legacy `/history` and `/results/:id` redirect to the session paths automatically

### CLI

- `history list` shows run status, result summary, and revisit guidance
- `history show <runId>` shows phase status, artifacts, provider reliability, and next steps
- These commands show legacy workflow records; new sessions are managed from Web

## Failure And Recovery Semantics

The system does not implement heavy auto-repair orchestration.

Expected operator flow:

1. Identify which phase failed.
2. Check what already completed.
3. Review provider summary if provider behavior is relevant.
4. Revisit history before rerunning.
5. Rerun only after you know what changed.

## Real-Provider Smoke Validation

Operator-run and non-CI-blocking:

```bash
node scripts/smoke-real-provider.mjs
```

Optional policy-focused run:

```bash
SMOKE_VALIDATE_POLICY=1 node scripts/smoke-real-provider.mjs
```

Expected coverage:

- structured output path
- retry / timeout behavior
- fallback behavior when configured
- usage / cost visibility

Cost note:

- real-provider smoke spends real tokens
- fallback or policy validation can increase request count

## SQLite Validation

SQLite remains a validated secondary backend when native binding support is available.

```bash
node scripts/validate-sqlite-backend.mjs
```

Expected behavior:

- supported environment: round-trip validation runs
- unsupported environment: script exits cleanly with an explicit skip reason

The file backend remains the default stable path.

## Quality Gates

```bash
pnpm run check:all
```

Real-provider smoke and SQLite validation remain opt-in and non-blocking for default CI.

## Known Limits

- single-user only
- no auth or RBAC
- no multi-user collaboration
- no provider marketplace
- no billing system
- no heavy dashboard platform
- no heavy DB productization

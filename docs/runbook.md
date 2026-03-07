# Operator Runbook

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm installed (`npm install -g pnpm`)

### Initial Setup
```bash
# Clone and install
git clone <repo-url>
cd ProdMind-Studio
pnpm install
```

## Running the System

### CLI Usage

**Start CLI:**
```bash
cd apps/cli
pnpm run build
node dist/index.js
```

**Available Commands:**
```bash
# Initialize project
node dist/index.js init [path]

# Run full workflow
node dist/index.js workflow "your idea here" [path]

# Run individual phases
node dist/index.js challenge "your idea" [path]
node dist/index.js decision "problem statement" [path]

# View workflow history
node dist/index.js history list [path]
node dist/index.js history show <runId> [path]
```

### Web Usage

**Start Web Server:**
```bash
cd apps/web
pnpm run build
node dist/server.js
```

**Default:** http://localhost:3000

**API Endpoints:**
- `POST /workflow/execute` - Start workflow
- `GET /workflow/status/:id` - Check status
- `GET /workflow/history` - List runs
- `GET /workflow/history/:runId` - Get run details

## File Locations

### Workflow History
```
{projectPath}/.prodmind/history/
  runs.jsonl              # Append-only run list
  {runId}/
    run.json              # Full run details
    result.json           # Final results
```

### Workflow Artifacts
```
{projectPath}/
  challenge.md            # Challenge output
  assets/
    decision.json         # Decision output
  output/
    challenge.md          # Exported artifacts
    decision.json
```

## Recovery Operations

### Manual Retry
If a workflow fails, re-run the same command:
```bash
node dist/index.js workflow "same idea" ./same-path
```

**Phase Skip Detection:**
- If `challenge.md` exists → skips challenge phase
- If `assets/decision.json` exists → skips decision phase
- Asset phase always runs (idempotent)

### View Failure Details
```bash
node dist/index.js history show <runId>
```

## Observability (Phase 5B)

### Workflow Visibility

**During Execution:**
- Run ID displayed at start
- Phase progression shown (1/3, 2/3, 3/3)
- Real-time status updates

**After Completion:**
- Workflow summary with run ID, status, duration
- Provider usage statistics
- Success/failure indicators

**On Failure:**
- Failed phase identification
- Error message with code
- Guidance to view full details

### Viewing Metrics

Metrics are collected automatically during workflow execution:

```bash
# Workflow summary shown after completion
node dist/index.js workflow "idea"
# Output includes:
# - Run ID
# - Status (✓ Success / ✗ Failed)
# - Duration
# - Provider requests
```

### Diagnosing Failures

1. **Note the Run ID** from failure output
2. **View full details:**
   ```bash
   node dist/index.js history show <runId>
   ```
3. **Check phase status** to identify failure point
4. **Review error code** to understand failure type
5. **Determine if retryable** based on error type

**Common Error Codes:**
- `PROVIDER_RATE_LIMIT` - Retryable, wait and retry
- `PROVIDER_AUTH_FAILED` - Check API keys
- `PERSISTENCE_WRITE_FAILED` - Check disk space/permissions
- `WORKFLOW_PHASE_FAILED` - Check phase-specific logs

Check the `error` field and `phases` status.

## Testing

### Run All Quality Gates
```bash
# From repo root
pnpm run check:all
```

This runs:
- docs-check
- boundary-check
- forbidden-deps-check
- lint
- typecheck
- test
- build

### Run Smoke Tests
```bash
# Default: fake provider only
pnpm run test

# Opt-in: real provider (requires API key)
SMOKE_TEST_REAL_PROVIDER=1 pnpm run test
```

## Environment Variables

### Required
None (uses fake provider by default)

### Optional
- `SMOKE_TEST_REAL_PROVIDER=1` - Enable real provider smoke tests
- `ANTHROPIC_API_KEY` - Required if using real provider

**Phase 5A Configuration:**
- `PERSISTENCE_BACKEND` - Backend selection: `file` (default) | `sqlite`
- `PERSISTENCE_PATH` - Custom base path for file backend
- `PERSISTENCE_CONNECTION` - SQLite database path
- `PROVIDER_MODE` - Provider mode: `fake` (default) | `real`
- `PROVIDER_TYPE` - Real provider type: `openai` | `anthropic`
- `OPENAI_API_KEY` - OpenAI API key (if PROVIDER_MODE=real)
- `ANTHROPIC_API_KEY` - Anthropic API key (if PROVIDER_MODE=real)
- `MODEL_ID` - Custom model ID

## Backend and Provider Operations (Phase 5A)

### Persistence Backends

**File Backend (Default):**
```bash
# No configuration needed - works out of box
node dist/index.js workflow "your idea"

# Custom path
PERSISTENCE_PATH=/custom/path node dist/index.js workflow "your idea"
```

**SQLite Backend (Experimental):**
```bash
# Requires native compilation (Visual Studio on Windows)
PERSISTENCE_BACKEND=sqlite node dist/index.js workflow "your idea"

# Custom database path
PERSISTENCE_BACKEND=sqlite PERSISTENCE_CONNECTION=/path/to/db.sqlite node dist/index.js workflow "your idea"
```

**Status:** SQLite backend validates abstraction but requires C++ compiler. Falls back to file backend if unavailable.

### Provider Modes

**Fake Provider (Default - CI Safe):**
```bash
# No API keys needed, no costs
node dist/index.js workflow "your idea"
```

**Real Provider (Opt-in - Requires API Key):**
```bash
# OpenAI
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx node dist/index.js workflow "your idea"

# Anthropic
PROVIDER_MODE=real PROVIDER_TYPE=anthropic ANTHROPIC_API_KEY=sk-ant-xxx node dist/index.js workflow "your idea"

# Custom model
PROVIDER_MODE=real OPENAI_API_KEY=sk-xxx MODEL_ID=gpt-4o-mini node dist/index.js workflow "your idea"
```

**Cost Warning:** Real provider mode incurs API costs (~$0.01-0.10 per workflow).

### Real Provider Smoke Test

```bash
# OpenAI smoke test
OPENAI_API_KEY=sk-xxx node scripts/smoke-real-provider.mjs

# Anthropic smoke test
ANTHROPIC_API_KEY=sk-ant-xxx PROVIDER=anthropic node scripts/smoke-real-provider.mjs
```

Tests: streamText, generateStructured, getMetadata

See [docs/smoke-testing.md](smoke-testing.md) for details.

## Common Operations

### Development Workflow
```bash
# 1. Make changes
# 2. Run quality gates
pnpm run check:all

# 3. Test locally
cd apps/cli
pnpm run build
node dist/index.js workflow "test idea"

# 4. Check history
node dist/index.js history list
```

### Debugging Failed Workflows
```bash
# 1. List recent runs
node dist/index.js history list

# 2. Get failure details
node dist/index.js history show <runId>

# 3. Check artifact files
ls -la {projectPath}/.prodmind/history/{runId}/

# 4. Retry with same input
node dist/index.js workflow "same idea" {projectPath}
```

### Clean Workflow State
```bash
# Remove history
rm -rf {projectPath}/.prodmind/history/

# Remove artifacts
rm -rf {projectPath}/challenge.md
rm -rf {projectPath}/assets/
rm -rf {projectPath}/output/
```

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules dist
pnpm install
pnpm run build
```

### TypeScript Errors
```bash
# Check all packages
pnpm run typecheck
```

### Tests Fail
```bash
# Run tests with verbose output
pnpm run test -- --reporter=verbose
```

### History Not Persisting
- Check `.prodmind/history/` directory exists
- Verify write permissions
- Check `runs.jsonl` is being appended

## Performance Notes

- File-based persistence: suitable for <100 workflows
- Single-user only: no concurrent execution support
- Manual recovery: no automatic retry

## Known Limitations

- No authentication
- No multi-user support
- No real-time metrics
- SQLite backend requires native compilation (experimental)
- Real provider mode opt-in only (not default)
- Manual recovery only

See `docs/system-maturity.md` for full limitations.

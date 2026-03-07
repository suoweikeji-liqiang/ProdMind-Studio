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
- Fake LLM provider only (real provider deferred)
- Manual recovery only

See `docs/system-maturity.md` for full limitations.

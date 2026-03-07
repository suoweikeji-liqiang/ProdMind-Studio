# Phase 4A: CLI Boundary Definition

## CLI Responsibility

`apps/cli` is a **thin composition layer** that orchestrates the three engines:
- challenge-engine
- decision-engine
- asset-engine

### What CLI Does

1. **Command parsing** - Parse user commands and arguments
2. **Workflow orchestration** - Call engines in sequence
3. **I/O handling** - Read input files, write output artifacts
4. **Error reporting** - Surface engine errors to user

### What CLI Does NOT Do

1. **Business logic** - All domain logic stays in engines
2. **LLM interaction** - Handled by llm-adapter via engines
3. **Validation rules** - Engines own their validation
4. **State management** - Engines manage their own state
5. **Convergence logic** - challenge-engine owns this
6. **Decision scoring** - decision-engine owns this
7. **Asset generation** - asset-engine owns this

## Architecture Principle

```
CLI = f(challenge-engine, decision-engine, asset-engine)
```

CLI is a **pure composition function**. If logic can't be expressed as "call engine A, pass result to engine B", it belongs in an engine, not CLI.

## Anti-Patterns (Forbidden)

❌ CLI validates challenge rules → Should be in challenge-engine
❌ CLI scores decision options → Should be in decision-engine
❌ CLI formats asset output → Should be in asset-engine
❌ CLI retries LLM calls → Should be in llm-adapter
❌ CLI implements convergence → Should be in challenge-engine

## Allowed Patterns

✅ CLI reads idea.txt, calls challenge-engine
✅ CLI passes challenge result to decision-engine
✅ CLI writes decision result to disk via asset-engine
✅ CLI reports "challenge failed" to user
✅ CLI chains: idea → challenge → decision → assets

## Workflow Contract

Engines expose **minimal public APIs**:
- `challenge-engine`: `runChallengeRound()`, `evaluateConvergence()`
- `decision-engine`: `runDecisionOrchestration()`
- `asset-engine`: `createAssetWriter()`, `writeChallengeArtifact()`

CLI calls these APIs. CLI does not reach into engine internals.

# Module Boundary for ProdMind-Studio

## Boundary Principles
- Engines own domain behavior, not presentation.
- `apps/*` are composition layers only.
- `shared-types` is the single source of cross-package contracts.
- `llm-adapter` is the only package that talks to provider SDKs.
- Engines must not depend on web framework or CLI framework APIs.

## Dependency Direction
- Allowed direction:
  - `apps/cli` -> engines + `shared-types` + `llm-adapter`
  - `apps/web` -> engines + `shared-types` + `llm-adapter`
  - `challenge-engine` -> `shared-types` + `llm-adapter`
  - `decision-engine` -> `shared-types` + `llm-adapter`
  - `asset-engine` -> `shared-types`
  - `llm-adapter` -> external provider SDKs
- Forbidden direction:
  - engine -> `apps/*`
  - `shared-types` -> any engine/app
  - `asset-engine` -> provider SDKs directly

## `packages/challenge-engine`

### Owns
- Debate protocol and round lifecycle.
- Role taxonomy and role invocation contract.
- Conflict rules:
  - alternative hypothesis
  - consensus alert
  - tech-escape interception
  - falsification-block validation
  - forced-opposition trigger criteria
- Challenge-specific convergence evaluation.

### Does Not Own
- CLI question flow, terminal style, command parsing.
- Web rendering, SSE transport protocol details, page state.
- Database choice and framework-specific persistence wiring.

### Inputs/Outputs
- Input: idea text, round history, user responses, provider/model route selection.
- Output: structured round events and challenge conclusions (typed DTOs from `shared-types`).

## `packages/decision-engine`

### Owns
- Decision state tree model:
  - problem definition (versioned)
  - assumptions (status transitions)
  - risks (probability/severity)
  - simulation paths
  - confidence index
- Agent scheduling policy by state and round.
- Context builder for agent prompts.
- Structured extraction/parsing from agent outputs.
- Snapshot semantics and versioned decision-state transitions.

### Does Not Own
- Supabase/Auth wiring.
- War-room UI store and visualization components.
- CLI menu and interaction shell.

### Inputs/Outputs
- Input: session state, user action, scheduler policy inputs.
- Output: updated decision state, snapshot records, confidence updates, agent-event stream.

## `packages/asset-engine`

### Owns
- Project-state persistence primitives (atomic write, recovery, schema validation).
- Project lifecycle:
  - create/open/list/delete
  - snapshot
  - research logs
- Asset generation:
  - `idea.md`
  - `decisions.md`
  - `spec.md`
  - `acceptance.md`
  - `tasks.md`
- Artifact sync contracts from challenge/decision outputs into requirement assets.

### Does Not Own
- LLM direct calls.
- Debate/decision orchestration policy.
- CLI/Web shell operations.

### Inputs/Outputs
- Input: normalized domain events + project state.
- Output: filesystem artifacts and portable asset DTOs.

## `packages/shared-types`

### Owns
- Canonical domain types for:
  - challenge session/round/conflict
  - decision state tree/assumption/risk/snapshot
  - asset project/doc output
  - cross-engine event envelopes
- Runtime-safe schemas where needed (e.g., Zod validators for persisted payloads).

### Does Not Own
- Domain logic.
- IO side effects.
- Provider SDK types except thin adapter-facing contracts.

## `packages/llm-adapter`

### Owns
- Unified adapter interface:
  - stream text
  - structured generation
  - retry/error normalization
- Provider implementations (OpenAI-compatible and Anthropic-compatible first).
- Optional per-role/per-agent routing policy interface (configuration only).

### Does Not Own
- Prompt authoring policy of challenge/decision engines.
- Any session/state persistence.
- CLI/Web rendering.

## `apps/cli` in New Architecture

### Position
- Thin shell over engines.
- Responsibilities:
  - parse commands
  - collect user input
  - print streamed output
  - call engine APIs

### Non-Goals
- No embedded business rules from old repos.
- No duplicate state models.

## `apps/web` in New Architecture

### Position
- Thin transport + presentation layer.
- Responsibilities:
  - route requests and SSE/WebSocket transport
  - render UI
  - call engine APIs

### Non-Goals
- No challenge/decision core logic in route handlers/components.
- No standalone type definitions diverging from `shared-types`.

## Boundary Checkpoints for Migration
- Any migrated file referencing `next/*`, `commander`, `inquirer`, or UI components stays out of engine packages unless converted to a pure contract.
- Any provider SDK import outside `llm-adapter` is a boundary violation.
- Any duplicated type definition outside `shared-types` is a boundary violation.


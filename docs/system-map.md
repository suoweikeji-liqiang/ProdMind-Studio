# System Map

## Current Structure (Phase 4C)

```
ProdMind-Studio/
├── apps/
│   ├── cli/              Thin composition layer for command-line interface
│   └── web/              Thin composition layer for web interface
├── packages/
│   ├── challenge-engine/ Challenge protocol and conflict rules
│   ├── decision-engine/  Stateful decision orchestration
│   ├── asset-engine/     Project state and artifact generation
│   ├── shared-types/     Canonical cross-package contracts
│   └── llm-adapter/      Provider abstraction boundary
├── docs/                 Architecture, standards, migration docs
├── scripts/              Quality gate and validation scripts
└── tests/                Shared fixtures, golden outputs, helpers
```

## Component Responsibilities

### apps/cli
**Role:** Command-line interface composition
**Does:**
- Parse CLI arguments
- Orchestrate workflow execution
- Display results to terminal
- Manage history commands

**Does NOT:**
- Contain business logic
- Implement engine functionality
- Handle LLM communication directly

### apps/web
**Role:** Web interface composition
**Does:**
- HTTP server and routing
- Async workflow execution
- Status polling endpoints
- History API routes

**Does NOT:**
- Contain business logic
- Implement engine functionality
- Handle LLM communication directly

### packages/challenge-engine
**Role:** Challenge protocol and adversarial testing
**Does:**
- Run challenge rounds
- Manage challenge sessions
- Build challenge summaries
- Generate challenge artifacts

**Exports:**
- `runChallengeRound()`
- `buildChallengeSummary()`
- `createSession()`

### packages/decision-engine
**Role:** Decision state orchestration
**Does:**
- Orchestrate decision steps
- Manage decision sessions
- Build decision summaries
- Track decision state

**Exports:**
- `runDecisionOrchestration()`
- `createDecisionSession()`
- `buildDecisionSummary()`

### packages/asset-engine
**Role:** Project state and artifact generation
**Does:**
- Persist project state
- Write challenge artifacts
- Write decision artifacts
- Manage workflow history

**Exports:**
- `createProjectStore()`
- `writeChallengeArtifact()`
- `createHistoryStore()`

### packages/shared-types
**Role:** Canonical type contracts
**Does:**
- Define domain types (Project, Challenge, Decision)
- Define workflow types (WorkflowRun, PhaseExecution)
- Define persistence contracts
- Provide Zod schemas

**Exports:**
- All domain and workflow types
- Validation schemas

### packages/llm-adapter
**Role:** Provider abstraction
**Does:**
- Abstract LLM provider interface
- Provide fake provider for testing
- Define provider contract

**Exports:**
- `createFakeProvider()`
- Provider interface types

## Cross-Cutting Concerns

### Persistence (Phase 4C)
**Location:** `packages/asset-engine/src/history-store.ts`
**Storage:** File-based at `.prodmind/history/`
**Scope:** Workflow runs, phase execution, results

### Recovery (Phase 4C)
**Location:** `apps/cli/src/recovery.ts`
**Strategy:** Manual retry with phase skip detection
**Scope:** Challenge, Decision, Asset phases

### Observability (Phase 4C)
**Location:** Embedded in WorkflowRun/PhaseExecution types
**Data:** Timing, status, errors
**Access:** Via history store

## Data Flow

```
User Input (idea)
    ↓
CLI/Web (thin composition)
    ↓
Challenge Engine → Challenge Artifact
    ↓
Decision Engine → Decision Artifact
    ↓
Asset Engine → Project Files
    ↓
History Store → Workflow History
```

## Workflow Execution Path

1. **CLI/Web** receives user input
2. **CLI/Web** creates workflow run record
3. **Challenge Engine** processes idea → generates challenge artifact
4. **Decision Engine** processes problem → generates decision artifact
5. **Asset Engine** writes artifacts to disk
6. **History Store** persists workflow run and results
7. **CLI/Web** returns results to user

## Module Boundaries

**Strict Rules:**
- Apps MUST NOT contain business logic
- Engines MUST NOT depend on apps
- Engines MAY depend on shared-types and llm-adapter
- Apps MAY depend on all packages
- shared-types MUST NOT depend on anything except zod

**Validation:** `pnpm run check:boundaries`

## Current Limitations

- Single-user execution only
- File-based persistence only
- Fake LLM provider only
- Manual recovery only
- No real-time metrics

See `docs/system-maturity.md` for full assessment.

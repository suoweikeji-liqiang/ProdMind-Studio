# Phase 3: Decision Engine Boundary

## Scope

Phase 3 implements the **decision-engine** minimal kernel for structured decision analysis.

## What's Included

### Domain Model
- `DecisionOption`: Options with pros/cons
- `DecisionRisk`: Risks with severity levels
- `DecisionHypothesis`: Hypotheses with confidence and evidence
- `DecisionStep`: Individual analysis steps (hypothesis_eval, risk_eval, option_compare, summary)
- `DecisionSessionState`: Session state with steps and status
- `DecisionSummary`: Aggregated decision analysis

### Handoff Contracts
- `DecisionArtifact`: Output artifact for asset layer
- `DecisionToAssetHandoff`: Complete handoff with metadata

### Session Management
- `createDecisionSession()`: Initialize new decision session
- `appendStep()`: Add step to session (immutable)
- `updateStatus()`: Update session status (immutable)

### Orchestration
- `runDecisionStep()`: Execute single decision step with LLM
- `buildDecisionSummary()`: Extract summary from session steps
- `runDecisionOrchestration()`: Run complete 4-step decision flow

### Asset Integration
- `writeDecisionArtifact()`: Persist decision artifact to markdown

### Testing
- Contract validation tests for domain model
- Golden path test for complete decision flow

## What's Excluded

### Out of Scope for Phase 3
- CLI interface (deferred to app-cli)
- Web interface (deferred to app-web)
- Multi-round decision refinement
- User interaction during decision process
- Convergence evaluation
- Decision history tracking
- Advanced parsing of LLM responses

## Module Dependencies

```
decision-engine
├── depends on: shared-types, llm-adapter
└── used by: (future) app-cli, app-web

asset-engine
└── new: decision-writer.ts (decision artifact persistence)
```

## Boundary Enforcement

- decision-engine does NOT depend on asset-engine
- decision-engine does NOT depend on challenge-engine
- decision-engine does NOT import from app-cli or app-web
- All LLM interaction goes through llm-adapter interface

## Quality Gates

All checks passing:
- `pnpm check:all` (lint, typecheck, build, test)
- Contract tests validate domain model
- Golden path test validates end-to-end flow

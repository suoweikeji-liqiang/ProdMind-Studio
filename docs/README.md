# Docs Index

Documentation is grouped around the current conversation-first V1 direction: a topic-first internal thinking tool with Web as the main entry and CLI as an operator assist.

## V1 Release Docs

- [product-principles.md](product-principles.md)
- [v1-boundary.md](v1-boundary.md)
- [v1-release-checklist.md](v1-release-checklist.md)
- [runbook.md](runbook.md)
- [release-readiness.md](release-readiness.md)
- [support-matrix.md](support-matrix.md)

## Human-in-the-Loop Session Model

The current Web session shell now ships explicit human-in-the-loop state instead of a generic freeform chat loop.

- Session payloads expose `currentPhase`, `interactionState`, `requiredUserAction`, `lastCompletedStep`, and `nextRecommendedMode`
- Cross-mode guidance also exposes `modeTransitionWarning` and `recommendedRollbackMode`
- `challenge` includes two human checkpoints plus interrupt states for alternative hypothesis, false consensus, and tech escape
- `decision` waits for frame confirmation before tradeoff analysis and recommendation
- `requirement-build` advances one artifact layer at a time and only creates versions on explicit finalization
- `idle` remains a reserved interaction state; `completed` currently maps to archived sessions

- [plans/2026-03-11-human-in-the-loop-mode-blueprint-design.md](plans/2026-03-11-human-in-the-loop-mode-blueprint-design.md)
- [plans/2026-03-11-mode-state-machine-design.md](plans/2026-03-11-mode-state-machine-design.md)
- [plans/2026-03-11-human-in-the-loop-mode-state-machine-plan.md](plans/2026-03-11-human-in-the-loop-mode-state-machine-plan.md)

## Latest Provider / Validation Docs

- [phase5c-provider-capability-boundary.md](phase5c-provider-capability-boundary.md)
- [phase5c-usage-surface.md](phase5c-usage-surface.md)
- [phase5c-smoke-validation.md](phase5c-smoke-validation.md)
- [phase5d-routing-policy.md](phase5d-routing-policy.md)
- [phase5d-reliability-policy.md](phase5d-reliability-policy.md)
- [phase5d-smoke-ops.md](phase5d-smoke-ops.md)
- [phase5d-budget-assessment.md](phase5d-budget-assessment.md)

## Architecture

- [architecture.md](architecture.md)
- [repo-analysis.md](repo-analysis.md)
- [module-boundary.md](module-boundary.md)
- [system-map.md](system-map.md)
- [system-maturity.md](system-maturity.md)

## Standards

- [ui-standards.md](ui-standards.md)
- [testing-standards.md](testing-standards.md)
- [quality-gates.md](quality-gates.md)
- [observability-standards.md](observability-standards.md)
- [test-layout.md](test-layout.md)

## Historical Migration Records

- [migration-plan.md](migration-plan.md) -- full phase progression log (migration complete)
- [archive/](archive/) — completion reports and boundary docs from all phases

## Execution Planning

- [plans/2026-03-09-v1-sprint-single-user-workbench-design.md](plans/2026-03-09-v1-sprint-single-user-workbench-design.md)
- [plans/2026-03-09-v1-sprint-single-user-workbench-plan.md](plans/2026-03-09-v1-sprint-single-user-workbench-plan.md)
- [plans/2026-03-11-session-shell-chinese-consistency-design.md](plans/2026-03-11-session-shell-chinese-consistency-design.md)
- [plans/2026-03-11-session-shell-chinese-consistency.md](plans/2026-03-11-session-shell-chinese-consistency.md)

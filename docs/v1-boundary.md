# V1 Boundary

## Product Shape

ProdMind-Studio V1 is a single-user decision workbench.

The intended operator journey is:

`idea input -> challenge -> decision -> asset output -> history revisit -> basic recovery`

Web is the primary entry point. CLI remains a secondary operator surface.

## V1 Must-Have

- Web home page with a clear start path for a new workflow
- Web workflow execution path with stage visibility
- Web results page with structured challenge, decision, asset, and provider summary sections
- Web history list and history detail pages for revisit
- CLI workflow path for operator use
- CLI history list and history detail commands
- Persisted history and result retrieval for revisit after the live run is gone
- Basic failure and recovery semantics:
  - where the failure happened
  - what was already completed
  - what the operator should do next
- Fake provider as the default safe path
- Opt-in real-provider validation path
- Docs, runbook, and readiness language aligned with internal pilot reality

## Nice To Have But Deferrable

- Richer result copy polish beyond the current structured summaries
- More detailed history summaries or filtering
- More provider validation evidence from real pilot runs
- Optional budget guardrails if pilot evidence later justifies them
- Additional SQLite operator evidence in environments with native binding support

## Explicitly Out Of Scope For V1

- auth / RBAC
- multi-user collaboration
- workspaces / tenants
- provider marketplace
- billing system
- heavy dashboard platform
- mobile app
- heavy DB productization
- advanced analytics or reporting product
- orchestration beyond the current thin shells

## UX Boundary

- Web stays thin and read-only around engine outputs.
- CLI stays operator-oriented and secondary.
- History is for revisit, not team collaboration.
- Result rendering stays structured, not a chat shell.

## Provider Boundary

- Fake provider remains the default test and local-dev path.
- Real providers remain opt-in and operator-run.
- Provider logic stays in `packages/llm-adapter`, not in CLI or Web.
- Usage and cost visibility remains informational, not billing-grade.

## Deferred Backlog After V1

- collaboration and shared review workflows
- auth and operator roles
- dashboard analytics
- provider marketplace or ranking
- billing-grade usage controls
- heavier persistence backends and ops layers

# V1 Boundary

## Product Shape

ProdMind-Studio V1 is a conversation-first internal thinking tool.

The intended operator journey is:

`topic input -> session -> mode-guided multi-round conversation -> draft summaries -> finalized artifacts -> session history -> replay`

Web is the primary entry point. CLI remains a secondary operator surface and reference baseline for the original V1 experience.

## V1 Must-Have

- Web home page that requires a topic before a new session starts
- Web session page as the primary product surface
- Manual mode switching across:
  - `challenge`
  - `decision`
  - `requirement-build`
- Mode switching persists until the user changes it again
- Visible multi-role output in every mode
- Full session timeline persistence:
  - user messages
  - mode switches
  - role messages
  - draft updates
  - artifact finalization events
- Session history organized by topic/session, not by workflow run
- Session replay that can reopen the preserved process
- Per-mode draft summaries and explicit final artifact versions
- Chinese-first UI copy and serious product framing
- Fake provider as the default safe path
- Opt-in real-provider validation path
- Docs, runbook, and readiness language aligned with internal single-user pilot reality

## Nice To Have But Deferrable

- Richer role orchestration beyond the first Web session recovery of V1 behavior
- Stronger replay controls and timeline filtering
- Better artifact diffing between finalized versions
- More provider validation evidence from internal pilot runs
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
- automatic mode switching
- multi-topic freeform chat in one session

## UX Boundary

- Web is the main product surface and must be conversation-first.
- The session page is primary; workflow/result pages are legacy compatibility only.
- History is for session revisit and replay, not team collaboration.
- The UI must preserve visible multi-role thinking, not collapse everything into one assistant voice.
- The product should feel serious and cognitively demanding, not like a general chat assistant.

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

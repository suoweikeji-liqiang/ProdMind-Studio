# Product Principles

These principles are product rules for ProdMind-Studio. They exist to prevent future work from drifting back into a thin workflow runner.

## Non-Negotiable Principles

1. The main path is Chinese multi-round conversation.
2. A new session must start from an explicit topic.
3. One session serves one serious topic.
4. `challenge`, `decision`, and `requirement-build` are user-selected thinking modes, not fixed pipeline stages.
5. Mode switching is manual and remains in effect until the user changes it again.
6. Visible multi-role output is a signature capability and must remain present across all modes.
7. Each mode owns its own local context, summaries, and artifacts.
8. The session also owns a small shared fact layer for confirmed cross-mode context.
9. Full process history must be preserved; summaries and artifacts are layered on top of it.
10. Artifact creation follows automatic drafts plus explicit user finalization.
11. Session history and replay are first-class product features.
12. The product should feel serious and cognitively demanding, not casual or playful.

## Prohibited Drift

The product must not drift back toward:

- a single-submit workflow form
- a one-shot results page as the primary destination
- invisible chain-of-thought with only one assistant voice exposed
- freeform multi-topic chatting inside one session
- product copy that frames the system as a dashboard or provider console

## Delivery Guidance

When making product or UX decisions:

- prefer preserving the thinking process over compressing everything into summaries
- prefer session continuity over one-off runs
- prefer explicit user control over automatic mode switching
- prefer compatibility shims over redefining the product back into workflow semantics

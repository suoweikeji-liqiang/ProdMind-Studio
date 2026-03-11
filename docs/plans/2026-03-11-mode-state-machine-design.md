# Mode State Machine Design

**Date:** 2026-03-11

**Goal:** Define the target session state model, per-mode state machines, and cross-mode handoff rules for a human-in-the-loop ProdMind-Studio product.

## Purpose

This document refines the higher-level human-in-the-loop blueprint into explicit product state machines.

It is intentionally product-first, not implementation-first. The goal is to prevent the Web product from drifting back into a one-shot generator model.

## Design Summary

The product should be built on one shared session skeleton with three mode-specific sub-state machines:

- `challenge`
- `decision`
- `requirement-build`

The session shell owns:

- topic
- current mode
- current phase
- required user action
- timeline
- shared context

Each mode owns:

- its own internal phase progression
- its own valid user input semantics
- its own structured outputs
- its own completion and rollback rules

## Implementation Snapshot (2026-03-11)

The Web app now ships this state machine in product-facing form.

- Session payloads and the session page expose `interactionState` alongside `currentPhase`
- Current active routes emit `running_ai_step`, `waiting_user_input`, `ready_to_finalize`, and `blocked`
- `completed` maps to archived sessions; `idle` remains reserved for future pre-run shells
- `challenge` interrupt phases now surface as explicit blocked states instead of hidden rule-only diagnostics
- Cross-mode forward guidance and rollback hints are rendered directly in the session shell

## Session-Level State Machine

The top-level session states should be minimal and universal:

- `idle`
- `running_ai_step`
- `waiting_user_input`
- `ready_to_finalize`
- `completed`
- `blocked`

### Required session-level fields

Every live session should expose enough state for the UI to answer:

1. What just happened?
2. What is the system waiting on?
3. What kind of input is valid right now?

Minimum product-facing fields:

- `currentMode`
- `currentPhase`
- `interactionState`
- `requiredUserAction`
- `status`
- `lastCompletedStep`
- `nextRecommendedMode`

### Session-level product rules

1. A session is never "just chatting."
2. Every user input must have a defined semantic role.
3. Every AI completion must transition into a visible waiting state or a visible completion state.
4. The system must distinguish "thinking" from "waiting for you."

### Current emitted interaction states

As of 2026-03-11, the shipped Web flow uses:

- `running_ai_step` while a user turn is being processed
- `waiting_user_input` for normal checkpoints
- `ready_to_finalize` after recommendation/finalization checkpoints
- `blocked` for challenge interrupt phases and failed sessions

## Challenge Mode State Machine

Challenge mode exists to test whether the user is solving the right problem.

### Core sequence

1. `topic_submitted`
2. `architect_framing`
3. `waiting_user_problem_correction`
4. `objection_generation`
5. `waiting_user_objection_response`
6. `grounding`
7. `waiting_round_decision`

### Required user input semantics

Challenge mode must distinguish:

- `raw_topic`
- `problem_correction`
- `objection_response`
- `round_resolution`

These must not collapse into one generic freeform message type.

### Interrupting states

Challenge mode may also enter explicit interrupt states:

- `waiting_alternative_hypothesis_resolution`
- `waiting_false_consensus_break`
- `waiting_tech_escape_response`

These interruptions are product features, not optional diagnostics.

### Exit conditions

Challenge mode may exit to:

- another `challenge` round
- `decision`
- `completed`

It should not recommend `requirement-build` directly unless a path has already been implicitly selected and stabilized, which should be rare.

## Decision Mode State Machine

Decision mode exists to compare viable paths once the problem frame is stable enough.

### Core sequence

1. `decision_prompt_submitted`
2. `decision_frame_generation`
3. `waiting_user_frame_confirmation`
4. `tradeoff_analysis`
5. `waiting_user_priority_adjustment`
6. `recommendation_synthesis`
7. `waiting_decision_resolution`

### Required user input semantics

Decision mode must distinguish:

- `decision_problem`
- `frame_correction`
- `priority_adjustment`
- `decision_resolution`

### Product boundary

Decision mode is not allowed to emit a final recommendation before the user confirms the comparison frame.

If the user reveals that the team is still unclear about the problem itself, the mode should recommend rollback to `challenge`.

### Exit conditions

Decision mode may exit to:

- another `decision` pass
- `requirement-build`
- `challenge`
- `completed`

## Requirement-Build Mode State Machine

Requirement-build mode exists to convert relatively stable conclusions into structured assets.

### Core sequence

1. `artifact_goal_submitted`
2. `artifact_scope_detection`
3. `waiting_user_artifact_selection`
4. `draft_generation`
5. `waiting_user_draft_revision`
6. `ready_for_downstream_or_finalize`
7. `artifact_finalized`

### Required user input semantics

Requirement-build mode must distinguish:

- `artifact_goal`
- `artifact_selection`
- `draft_revision`
- `finalization_note`

### Product boundary

Requirement-build mode should not silently rewrite all artifacts on every turn.

The system should identify and propose the next artifact layer, but the human must confirm what is being advanced:

- `idea`
- `spec`
- `acceptance`
- `tasks`

### Exit conditions

Requirement-build mode may exit to:

- another pass on the same artifact
- the next artifact layer
- `decision`
- `challenge`
- `completed`

## Cross-Mode Handoff Rules

Mode transitions should reflect thinking maturity, not random navigation.

### `challenge -> decision`

Recommended only when:

- the problem definition has been user-corrected
- the current strongest assumptions are explicit
- the topic is mature enough for path comparison

### `decision -> requirement-build`

Recommended only when:

- one baseline direction has been accepted
- hard constraints are stable enough
- the team is ready to turn judgment into assets

### Valid rollback paths

The product must explicitly support:

- `decision -> challenge`
- `requirement-build -> decision`
- `requirement-build -> challenge`

Rollback is a sign of rigor, not a failure state.

## UI Contract

The session page should always render the current interaction contract.

Minimum visible contract:

- current mode
- current phase
- last completed AI/system step
- required user action
- current structured output
- unresolved items

The input composer must be labeled by the current semantic action, for example:

- "Confirm or correct the problem definition"
- "Respond to the objections above"
- "Confirm the decision criteria"
- "Revise the current spec draft"

## Timeline Contract

The timeline must preserve both content and role of each step.

Examples of event semantics:

- user submitted raw topic
- architect framed problem
- user corrected problem framing
- system generated objections
- user responded to objections
- grounder synthesized round
- user confirmed decision frame
- system generated recommendation
- user selected artifact layer
- artifact finalized

Without this level of semantic history, replay becomes a text dump rather than a reasoning trace.

## Success Criteria

This design is successful when:

1. Session creation is never confused with model execution.
2. Challenge mode contains two explicit human checkpoints per round.
3. Decision mode contains one checkpoint before analysis and one before final acceptance.
4. Requirement-build mode advances artifacts one level at a time unless the user explicitly asks otherwise.
5. Cross-mode transitions explain why the system recommends moving forward or rolling back.
6. The UI always shows whether the system is waiting on AI work or human judgment.

## Non-Goals

- Persistence schema details
- Exact API request shapes
- Specific React or view implementation
- Provider timeout or fallback tuning
- Final visual design

Those belong in implementation planning, not in this state-machine design.

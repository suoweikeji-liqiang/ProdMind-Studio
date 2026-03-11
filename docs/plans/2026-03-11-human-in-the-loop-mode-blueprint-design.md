# Human-in-the-Loop Mode Blueprint Design

**Date:** 2026-03-11

**Goal:** Define the target product shape for ProdMind-Studio as a human-led thinking workbench where AI advances the process but cannot silently skip critical judgment checkpoints.

## Implementation Snapshot (2026-03-11)

This blueprint is now mostly reflected in the shipped Web session shell.

- The shared session contract exposes `currentMode`, `currentPhase`, `interactionState`, `requiredUserAction`, `lastCompletedStep`, and `nextRecommendedMode`
- The UI now renders a phase/status banner, explicit rollback guidance, and a composer label tied to the expected human action
- `challenge` now runs through architect framing, problem correction, objection response, grounding, and explicit interrupt states
- `decision` now waits for user frame confirmation before tradeoff analysis and recommendation
- `requirement-build` now advances by artifact layer and only creates versioned outputs on explicit finalization
- `idle` remains reserved in the interaction-state enum; `completed` currently appears when a session is archived rather than during normal active turns

## Product Thesis

ProdMind-Studio should not behave like a one-shot generator. It should behave like a structured thinking system that keeps the human in control of:

- what problem is actually being discussed
- which objections matter
- which tradeoffs are acceptable
- when draft assets are mature enough to lock

The product value is not "AI produces more text." The value is "the system makes the reasoning process explicit and interruptible at the right moments."

## Core Product Rule

AI must not cross two high-risk cognitive steps in a row without a human checkpoint.

High-risk steps include:

- reframing the user topic into a problem definition
- changing the decision frame or evaluation criteria
- collapsing competing views into one recommendation
- turning discussion into artifacts that look authoritative

This rule should govern all three modes.

## Mode Relationship

The three modes are not equal-purpose buttons. They represent different stages of thinking maturity:

1. `challenge`: verify that the team is solving the right problem
2. `decision`: choose a direction once the frame is stable enough
3. `requirement-build`: turn the chosen direction into working artifacts

Users may still switch modes manually, but the product should clearly communicate the natural progression:

`challenge -> decision -> requirement-build`

## Shared Session Model

One session should represent one serious topic.

Every session should always make four things visible:

- current topic
- current mode
- current system output
- current required human action

The system should never leave the user guessing whether it is:

- waiting for model work
- waiting for human confirmation
- waiting for human rebuttal
- ready to finalize

## Global Interaction Rules

All modes should follow these rules:

1. Every AI turn must end with an explicit next-step expectation.
2. Every user turn must have a clear semantic role, not just "another message."
3. Draft outputs are revisable by default; finalized outputs require explicit human action.
4. The UI should distinguish "system is thinking" from "system is waiting for you."
5. The timeline must preserve both the content and the phase of each turn.

## Challenge Mode Target State

Challenge mode should fully restore the reference CLI rhythm. This mode exists to expose weak framing and false certainty before solutioning begins.

### Target round structure

1. User submits a topic or vague idea.
2. `architect` reframes it into a problem definition.
3. Human checkpoint 1: user confirms or corrects that definition.
4. `assassin` and `userGhost` challenge the confirmed framing.
5. Human checkpoint 2: user responds to those challenges.
6. `grounder` synthesizes hypotheses, unresolved conflicts, and the current MVP boundary.
7. User chooses whether to continue another round or stop.

### Why this is the correct shape

Without checkpoint 1, the system can challenge the wrong problem.

Without checkpoint 2, the system can synthesize around objections the user never actually answered.

Those two checkpoints are not UX overhead. They are the mode itself.

### Additional guardrails carried over from the reference system

Challenge mode should preserve the ability to interrupt normal flow when:

- a stronger alternative hypothesis appears
- all roles drift into false consensus
- the user responds with technology-first escape language instead of demand validation

These interruptions are not edge cases. They are the product's core discipline.

### Human role in challenge mode

The human is not just approving output. The human is:

- correcting the problem frame
- choosing whether objections stand or fail
- deciding whether another round is warranted

## Decision Mode Target State

Decision mode should help the user choose among viable paths, but only after the comparison frame is locked by the user.

### Current weakness to avoid

A one-shot sequence that generates hypothesis evaluation, risk evaluation, option comparison, and a final recommendation in one pass makes the human intervene too late.

If the evaluation frame is wrong, the recommendation is wrong by construction.

### Target flow

1. User states the decision to make.
2. System proposes:
   - candidate options
   - decision criteria
   - hard constraints
   - assumptions that materially affect the choice
3. Human checkpoint: user confirms or edits the decision frame.
4. System evaluates risks and tradeoffs using the confirmed frame.
5. Human checkpoint: user adjusts priorities, rejects assumptions, or requests another comparison pass.
6. System produces a recommendation with conditions and disqualifiers.
7. User either accepts, reopens, or sends the topic back to challenge mode.

### Human role in decision mode

The human should primarily control:

- what is being compared
- what "good enough" means
- which risks are acceptable

Decision mode is not there to replace judgment. It is there to structure it.

## Requirement-Build Mode Target State

Requirement-build mode should turn a relatively stable direction into structured assets, while keeping explicit human control over artifact maturity.

### Current weakness to avoid

If one user input silently rewrites all requirement artifacts at once, the system makes too many editorial decisions without confirming scope stability.

### Target flow

1. User brings in a chosen direction, boundary, or clarified need.
2. System identifies which artifact layer should advance next:
   - `idea`
   - `spec`
   - `acceptance`
   - `tasks`
3. Human checkpoint: user confirms that this is the right artifact to work on now.
4. System updates the selected artifact and shows explicit deltas or refreshed draft sections.
5. Human checkpoint: user revises, accepts, or asks for one more iteration.
6. Only explicit human finalization creates a versioned artifact.

### Human role in requirement-build mode

The human controls:

- which artifact is currently being matured
- whether the artifact is stable enough to move down the chain
- when a draft becomes a version

This mode should feel less adversarial than challenge mode, but more controlled than a general drafting assistant.

## Cross-Mode Handoffs

The system should encourage handoff discipline:

- `challenge -> decision` only when the problem frame and main assumptions are stable enough
- `decision -> requirement-build` only when one path has been chosen or explicitly nominated as the baseline

Manual switching should still be allowed, but the product should warn when upstream work is obviously incomplete.

Examples:

- entering `decision` without a stable problem statement
- entering `requirement-build` without an explicit chosen option

## Session UI Implications

The target session page should center the current interaction contract, not just raw conversation.

The page should always answer:

1. What did the system just do?
2. What is unresolved?
3. What do I need to do next?

Minimum visible components:

- topic and mode header
- phase/status banner
- main system output for the current step
- timeline of prior turns
- structured side panel for summaries, assumptions, risks, or draft artifacts
- composer that is labeled by the expected human action

Examples of composer labels:

- "Confirm or correct the problem definition"
- "Respond to the objections above"
- "Confirm the decision criteria"
- "Revise the spec draft"

## Product Success Criteria

This target direction is successful when:

1. A user never mistakes session creation for model execution.
2. Challenge mode always includes timely human correction before and after objections.
3. Decision mode never emits a final recommendation before the user confirms the comparison frame.
4. Requirement-build mode never silently promotes drafts to authoritative outputs.
5. Every mode exposes a clear "waiting on AI" or "waiting on human" state.
6. The product feels like a disciplined thinking system, not a chat wrapper around multiple prompts.

## Non-Goals For This Blueprint

- Detailed route or schema design
- Concrete frontend layout implementation
- Provider orchestration details
- Performance tuning strategy
- Exact persistence refactor steps

Those belong in later planning documents. This document defines the target product behavior and the role of human checkpoints.

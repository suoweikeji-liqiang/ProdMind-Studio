# Conversation-First Thinking Tool Design

**Date:** 2026-03-10

## Goal

Redirect ProdMind-Studio from a thin workflow runner into a conversation-first internal Web product for structured thinking. The product should preserve the strongest parts of the original V1 CLI experience while integrating challenge, decision, and requirement-build as user-selected thinking modes inside one serious, topic-driven conversation system.

## Product North Star

ProdMind-Studio is a Chinese-language internal thinking tool, not a general-purpose chat assistant and not a workflow dashboard.

The product exists to help company members think more rigorously through one topic at a time by:

1. forcing explicit topic framing before discussion starts
2. keeping the main experience as multi-round conversation
3. making multiple role perspectives visible
4. allowing the user to switch between three thinking modes
5. preserving the full reasoning process, not only summaries
6. turning mature discussion into structured drafts and finalized artifacts

## Scope Boundary

In scope for this direction change:

- Web-first experience
- single-user usage
- Chinese UI and Chinese-visible role naming
- topic-based sessions
- mode switching that persists until the user changes it again
- full timeline persistence
- draft and finalized artifact versioning
- history and replay centered on sessions

Explicitly out of scope for this phase:

- collaboration
- auth / RBAC
- workspaces / tenants
- analytics dashboard product
- billing
- mobile-native app
- automatic mode switching
- multi-topic freeform chat inside one session

## Approved Product Principles

These principles should become standing product rules, not implementation suggestions.

1. The main path is Chinese multi-round conversation.
2. A new session must start from an explicit topic input.
3. Challenge, decision, and requirement-build are thinking modes, not pipeline stages.
4. Visible multi-role output is a signature capability and must remain present across modes.
5. Each mode maintains its own private context and artifacts.
6. The session also keeps a minimal shared fact layer that survives mode switches.
7. Full process history is mandatory; summaries and artifacts are layered on top of it.
8. Artifact generation uses automatic drafts plus explicit user finalization.
9. The UI should feel serious and cognitively demanding, not casual or chatty.
10. Existing workflow-runner semantics are legacy compatibility only, not the future product model.

## Options Considered

### Option 1: Keep the workflow-runner product and polish it

Rejected because it solves shell quality, not the actual product problem. It preserves the wrong mental model: one submission, one run, one result page.

### Option 2: Port the original V1 CLI experience directly to Web

Valuable as a baseline and recovery strategy, but insufficient as the full product direction because it does not fully integrate decision and requirement-build as equal thinking modes.

### Option 3: Build a conversation-first Web product with V1 experience as the spine

Approved. This keeps the original V1 strengths while creating a more coherent merged product. Web becomes the deployment surface, but the interaction model remains topic-first, multi-round, multi-role, and process-preserving.

## Information Architecture

The top-level product structure should be reduced to four primary pages:

### 1. Home

Purpose:

- frame the tool as a serious internal thinking system
- require topic input before starting
- provide a clear entry to session history

Primary actions:

- create session from topic
- reopen prior session

### 2. Session

This is the primary product surface.

The page contains:

- topic header
- current mode and mode switcher
- central conversation timeline with visible role output
- right-side panel for current-mode draft summary, finalized versions, and structured artifacts
- bottom input composer for the active mode

### 3. Sessions History

History is organized by session, not by workflow run.

It should show:

- topic
- latest active mode
- session status
- last active time
- available finalized outputs by mode

### 4. Session Replay

Replay reopens a prior session in read-only or limited-edit form and focuses on:

- full timeline playback
- mode switch points
- per-mode summaries
- finalized artifact versions

The current `/workflow` and `/results/:id` pages should be treated as compatibility surfaces during migration, not long-term product entry points.

## Core Conversation Model

One session represents one serious topic.

### Session object

Minimum fields:

- `sessionId`
- `topic`
- `status`
- `currentMode`
- `sharedContext`
- `createdAt`
- `updatedAt`
- `lastActiveAt`

### Shared context

Shared context should stay intentionally small:

- topic framing
- hard constraints
- confirmed facts
- cited material

It should not become a dump of all mode-specific reasoning.

### Timeline

The session timeline is the canonical source of truth for process replay.

Minimum event types:

- `user_message`
- `mode_switched`
- `role_message`
- `draft_updated`
- `artifact_finalized`

This timeline must survive process restarts and power history/replay views.

## Mode Model

The system has three user-selected modes:

- `challenge`
- `decision`
- `requirement-build`

Mode switching is manual and persistent until changed again by the user.

Each mode owns:

- private message history
- role set
- draft summary
- draft artifacts
- finalized artifact versions

This gives the product three different thinking modes without mixing their raw conversation logs.

## Approved Role Design

All modes keep visible multi-role output, but each mode has its own role vocabulary and responsibilities.

### Challenge roles

- `架构师`: frames the problem, hypotheses, and structure
- `刺客`: attacks weak assumptions and false consensus
- `用户幽灵`: challenges the work from a real-user perspective
- `锚点官`: returns the discussion to facts, constraints, and verification

### Decision roles

- `方案官`: proposes viable paths and options
- `风险官`: surfaces failure modes, tradeoffs, and downside
- `权衡官`: compares options and explains sacrifices
- `裁决官`: produces the current recommendation and conditions

### Requirement-build roles

- `需求师`: structures scope, modules, and functional shape
- `用户代表`: keeps user value and scenarios honest
- `实施工程师`: tests implementation feasibility, boundaries, and dependencies
- `验收官`: converts ambiguity into acceptance criteria and tasks

Important constraint:

- not every role must speak on every turn
- the UI should make the roles visible, but the orchestration may choose only the relevant subset for a round

## Draft and Artifact Model

The product should preserve three layers of output:

### 1. Full process layer

The complete timeline of messages, role outputs, and mode switches.

### 2. Draft summary layer

Continuously updated mode-local summaries, such as:

- challenge: assumptions, conflicts, validation items
- decision: options, risks, current leaning
- requirement-build: scope, modules, acceptance points, open gaps

### 3. Artifact layer

Artifacts are handled as:

- continuously updated drafts
- explicit user finalization into immutable versions

The system should never silently replace a finalized version with later conversation output.

## Persistence Design

The current `WorkflowRun` / `WorkflowResult` model is too pipeline-shaped for the new product and should become compatibility data only.

Recommended persisted structure:

- `session.json`
- `timeline.jsonl` or `events.json`
- `modes/challenge.json`
- `modes/decision.json`
- `modes/requirement-build.json`
- `artifacts/<mode>/draft.json`
- `artifacts/<mode>/v1.json`
- `artifacts/<mode>/v2.json`

This structure supports:

- full replay
- mode-local restore
- versioned outputs
- recovery after restart

## Web UX Requirements

### Entry

Users must enter a topic before the session exists. This tool should not open with an empty casual chat box.

### Session layout

Recommended behavior:

- desktop: conversation center + right-side panel that is visible by default and collapsible
- mobile: conversation first, right-side content in a drawer or expandable panel

### Right-side panel behavior

Default behavior:

- when mode changes, the panel follows that mode

Advanced behavior:

- user may pin the current panel to keep referencing another mode while continuing the active conversation

### Tone and language

The product should use Chinese as the default visible language. It should feel serious, not promotional and not playful.

## Architecture Consequences

The current architecture should be reinterpreted as:

- `challenge-engine`: backing capability for challenge mode
- `decision-engine`: backing capability for decision mode
- `asset-engine`: backing capability for requirement-build output, session persistence, and versioned artifacts

The engines should no longer be framed as a fixed serial pipeline in product documentation.

## Migration Strategy

Recommended order:

1. update product docs and boundary docs first
2. introduce new session-centered shared types and persistence
3. build the new Web session shell
4. restore V1-like challenge experience on Web first
5. add decision mode on the same session spine
6. add requirement-build mode and artifact versioning
7. migrate history/replay to session semantics
8. de-emphasize legacy workflow routes after the new path is stable

## Documentation Updates Required

At minimum, update these documents during implementation:

- `README.md`
- `docs/v1-boundary.md`
- `docs/architecture.md`
- `docs/migration-plan.md`
- `docs/module-boundary.md`

Add:

- `docs/product-principles.md`

That new document should capture the non-negotiable product rules so future work does not drift back toward the workflow-runner model.

## Success Criteria

The new direction should be considered successful when:

1. a user starts from a topic, not from a workflow form
2. the main Web surface is a multi-round session page
3. mode switching is visible and persistent
4. visible multi-role output exists in all modes
5. full process history is preserved and replayable
6. drafts and finalized versions exist per mode
7. history is organized by session
8. product docs clearly describe the conversation-first model and no longer center the pipeline model

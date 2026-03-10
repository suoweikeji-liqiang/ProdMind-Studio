# ProdMind-Studio Architecture

## Product Goal

ProdMind-Studio unifies the strongest capabilities from ProdMind V1, ProdMind V2, and Requirement Co-Builder into one conversation-first internal product.

The unification target is not a fixed serial pipeline. It is one topic-driven session that lets the user switch between three thinking modes while preserving full process history and structured outputs.

## Product Model

The system should be understood as:

- one serious topic per session
- one shared fact layer per session
- three user-selected thinking modes
- visible multi-role output inside each mode
- layered persistence:
  - full timeline
  - per-mode draft summaries
  - finalized artifact versions

## Core Layers

### 1. `challenge-engine`

Owns the challenge mode capability:

- adversarial questioning
- assumption stress-testing
- conflict detection
- falsification pressure
- convergence signals for multi-round challenge discussions

Source lineage:

- `prodmind-v1`

### 2. `decision-engine`

Owns the decision mode capability:

- option framing
- risk analysis
- tradeoff reasoning
- recommendation building
- decision-state evolution inside a session

Source lineage:

- `prodmind-v2`

### 3. `asset-engine`

Owns the requirement-build and persistence capability:

- session persistence
- mode-local state persistence
- draft artifact storage
- finalized artifact versioning
- structured outputs such as `idea`, `spec`, `acceptance`, and `tasks`

Source lineage:

- `requirement-co-builder`

### 4. `shared-types`

Owns canonical cross-package contracts for:

- conversation sessions
- timeline events
- mode state
- draft and finalized artifacts
- challenge, decision, and asset DTOs

### 5. `llm-adapter`

Owns model/provider integration:

- provider configuration
- retries and timeouts
- streaming
- provider-specific normalization

## Architectural Consequence

The product shell should no longer frame the engines as a mandatory `challenge -> decision -> asset` pipeline.

Instead:

- `apps/web` provides a topic-first session product
- `apps/cli` remains a thin operator surface and a baseline reference for the original V1 experience
- the engines are capabilities behind mode switches, not fixed page stages

## Session-Centered Data Model

The long-term primary model should be:

- `ConversationSession`
- `ConversationEvent`
- `ModeState`
- `ArtifactVersion`

The current `WorkflowRun` / `WorkflowResult` model should be treated as legacy compatibility data while the product migrates.

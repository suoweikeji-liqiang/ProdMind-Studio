# Phase 4B: Web Composition Boundary

## 0. Document Purpose
Define the responsibility boundary for `apps/web` in the ProdMind-Studio architecture, ensuring it remains a thin composition layer that orchestrates engines without absorbing their business logic.

## 1. Web Layer Position

### What Web IS
- **Thin composition layer** over challenge-engine, decision-engine, and asset-engine
- **Transport and presentation** layer for engine outputs
- **User interaction** entry point for workflow execution
- **State visualization** layer for engine-managed state

### What Web IS NOT
- NOT a business logic container
- NOT an engine implementation host
- NOT a duplicate type definition source
- NOT a provider SDK consumer (only via llm-adapter)

## 2. Web Layer Responsibilities

### 2.1 MUST Own
- **Route handlers**: HTTP/API endpoints that receive user requests
- **Server actions**: Next.js server-side composition functions
- **UI components**: React components for display and interaction
- **Client state**: UI-specific state (loading, errors, form validation)
- **Transport**: SSE/WebSocket for streaming engine events
- **Layout**: Page structure, navigation, responsive design

### 2.2 MUST NOT Own
- **Challenge logic**: debate rounds, conflict rules, role invocation
- **Decision logic**: state tree, assumptions, risks, scheduling
- **Asset logic**: project persistence, artifact compilation
- **Provider calls**: direct LLM SDK usage (use llm-adapter only)
- **Domain state**: challenge sessions, decision state, project state (read-only view)

## 3. Layering Architecture

### 3.1 Three-Layer Model
```
┌─────────────────────────────────────┐
│  UI Layer (components, pages)       │  ← Display only
├─────────────────────────────────────┤
│  Composition Layer (actions, API)   │  ← Orchestrate engines
├─────────────────────────────────────┤
│  Engine Layer (packages/*)          │  ← Business logic
└─────────────────────────────────────┘
```

### 3.2 Layer Contracts
- **UI → Composition**: Component calls server action or API route
- **Composition → Engine**: Thin function calls engine APIs with typed contracts
- **Engine → Composition**: Returns typed DTOs from shared-types
- **Composition → UI**: Serializes engine outputs for client rendering

## 4. Forbidden Patterns

### 4.1 MUST NOT: Absorb Engine Logic
```typescript
// ❌ FORBIDDEN: Implementing challenge logic in route
export async function POST(req: Request) {
  const roles = ['architect', 'assassin', 'userGhost', 'grounder'];
  for (const role of roles) {
    const response = await llm.generate(rolePrompts[role]);
    // ... conflict detection logic ...
  }
}

// ✅ CORRECT: Delegate to engine
export async function POST(req: Request) {
  const { idea } = await req.json();
  const result = await runChallengeRound(idea, session);
  return Response.json(result);
}
```

### 4.2 MUST NOT: Duplicate Type Definitions
```typescript
// ❌ FORBIDDEN: Redefining types in Web
type ChallengeRound = { /* ... */ };

// ✅ CORRECT: Import from shared-types
import type { ChallengeRound } from '@prodmind/shared-types';
```

### 4.3 MUST NOT: Direct Provider Access
```typescript
// ❌ FORBIDDEN: Direct SDK usage
import OpenAI from 'openai';
const client = new OpenAI();

// ✅ CORRECT: Use llm-adapter
import { createProvider } from '@prodmind/llm-adapter';
const provider = createProvider(config);
```

### 4.4 MUST NOT: Business Logic in Components
```typescript
// ❌ FORBIDDEN: Conflict detection in component
function ChallengeView({ round }) {
  const hasConsensus = round.responses.every(r =>
    r.content.includes('同意') || r.content.includes('agree')
  );
}

// ✅ CORRECT: Display engine-computed state
function ChallengeView({ round }) {
  const { conflictsDetected, consensusReached } = round.summary;
}
```

## 5. Allowed Patterns

### 5.1 Workflow Composition
```typescript
// ✅ Orchestrate multiple engines in sequence
export async function runFullWorkflow(idea: string, projectPath: string) {
  // 1. Challenge
  const challengeResult = await runChallenge(idea, projectPath);

  // 2. Decision
  const decisionResult = await runDecision(
    challengeResult.summary.refinedIdea,
    projectPath
  );

  // 3. Assets
  const assets = await exportAssets(projectPath);

  return { challengeResult, decisionResult, assets };
}
```

### 5.2 Progress Tracking
```typescript
// ✅ Track workflow stages (UI state, not business logic)
type WorkflowStatus =
  | 'queued'
  | 'running_challenge'
  | 'running_decision'
  | 'running_assets'
  | 'completed'
  | 'failed';
```

### 5.3 Result Transformation for Display
```typescript
// ✅ Transform engine outputs for UI rendering
function transformChallengeForDisplay(summary: ChallengeSummary) {
  return {
    conflicts: summary.conflictsDetected.map(c => ({
      type: c.type,
      description: c.description,
      severity: mapSeverity(c.type),
    })),
    hypotheses: summary.hypotheses,
  };
}
```

## 6. Page-Level Boundaries

### 6.1 Landing/Home Page
- **Owns**: Project list display, navigation, create project UI
- **Does NOT Own**: Project state schema, persistence logic

### 6.2 Workflow Execution Page
- **Owns**: Input form, progress display, stage visualization
- **Does NOT Own**: Challenge/decision/asset execution logic

### 6.3 Results Page
- **Owns**: Structured result rendering, diff views, export UI
- **Does NOT Own**: Result computation, artifact compilation

## 7. Integration with Existing Standards

### 7.1 Alignment with module-boundary.md
- Web follows same dependency direction rules as CLI
- Web → engines + shared-types + llm-adapter (allowed)
- engines → Web (forbidden)

### 7.2 Alignment with ui-standards.md
- Web must implement structured views (not pure chat)
- Web must show workflow stages and state transitions
- Web must separate reasoning/result/artifact/warning/action

### 7.3 Alignment with quality-gates.md
- Web changes must pass boundary checks
- Web must not introduce forbidden dependencies
- Web must update docs when changing composition patterns

## 8. Validation Checklist

Before merging Web changes, verify:
- [ ] No engine logic duplicated in routes/actions/components
- [ ] No direct provider SDK imports (only via llm-adapter)
- [ ] No type definitions duplicating shared-types
- [ ] All business logic delegated to engine packages
- [ ] UI state separate from domain state
- [ ] Composition layer remains thin (<50 lines per function)
- [ ] No framework-specific code leaked into engines

## 9. Deferred to Phase 4C+

The following are explicitly OUT OF SCOPE for Phase 4B:
- Authentication and authorization
- Multi-user collaboration
- Database-backed session persistence
- Real-time collaboration features
- Advanced state management (Redux, Zustand, etc.)
- Full planning system UI
- Issue queue management UI
- Requirement unit tracking UI

## 10. Example: Correct Web Implementation

### Route Handler (Composition Layer)
```typescript
// apps/web/src/app/api/workflow/route.ts
import { runChallenge } from '@prodmind/challenge-engine';
import { runDecision } from '@prodmind/decision-engine';
import { exportAssets } from '@prodmind/asset-engine';
import type { WorkflowRequest, WorkflowResult } from '@prodmind/shared-types';

export async function POST(req: Request) {
  const { idea, projectPath }: WorkflowRequest = await req.json();

  // Thin orchestration only
  const challenge = await runChallenge(idea, projectPath);
  const decision = await runDecision(challenge.summary.refinedIdea, projectPath);
  const assets = await exportAssets(projectPath);

  const result: WorkflowResult = { challenge, decision, assets };
  return Response.json(result);
}
```

### Component (UI Layer)
```typescript
// apps/web/src/components/WorkflowProgress.tsx
import type { WorkflowStatus } from '@prodmind/shared-types';

export function WorkflowProgress({ status }: { status: WorkflowStatus }) {
  // Display only, no business logic
  return (
    <div>
      <StatusIndicator status={status} />
      <StageTimeline stages={getStagesForStatus(status)} />
    </div>
  );
}
```

## 11. Boundary Enforcement

### 11.1 Automated Checks
- Lint rule: no engine packages importing from apps/*
- Dependency check: no forbidden imports in Web
- Type check: all engine types from shared-types

### 11.2 Manual Review
- PR checklist includes boundary validation
- Code review focuses on composition vs logic separation
- Architecture review for new page/route patterns

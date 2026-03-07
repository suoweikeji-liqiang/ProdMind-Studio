import type { CorrelationContext } from './events.js';

// Phase 5B: Correlation context propagation
// Simple context passing, not AsyncLocalStorage (keep it minimal)

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createCorrelationContext(runId?: string): CorrelationContext {
  return {
    runId: runId || generateId(),
  };
}

export function withPhase(
  context: CorrelationContext,
  phase: string
): CorrelationContext {
  return {
    ...context,
    phaseId: phase,
  };
}

export function withStep(
  context: CorrelationContext,
  stepId: string
): CorrelationContext {
  return {
    ...context,
    stepId,
  };
}

export function withParent(
  context: CorrelationContext,
  parentId: string
): CorrelationContext {
  return {
    ...context,
    parentId,
  };
}

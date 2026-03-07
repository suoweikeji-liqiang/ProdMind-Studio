import { z } from 'zod';

// Phase 5B: Minimal observability contract
// NOT a full distributed tracing platform - just structured diagnostic events

// ============================================================================
// Core Correlation Types
// ============================================================================

export const CorrelationContextSchema = z.object({
  runId: z.string(),
  phaseId: z.string().optional(),
  stepId: z.string().optional(),
  parentId: z.string().optional(),
});

export type CorrelationContext = z.infer<typeof CorrelationContextSchema>;

// ============================================================================
// Event Base
// ============================================================================

export const EventSeveritySchema = z.enum(['debug', 'info', 'warning', 'error']);
export type EventSeverity = z.infer<typeof EventSeveritySchema>;

export const BaseEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  severity: EventSeveritySchema,
  correlation: CorrelationContextSchema,
  source: z.string(), // e.g., 'workflow', 'challenge-engine', 'provider', 'persistence'
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

// ============================================================================
// Workflow Events
// ============================================================================

export const WorkflowEventSchema = BaseEventSchema.extend({
  type: z.literal('workflow'),
  operation: z.enum(['start', 'end', 'phase_start', 'phase_end']),
  phase: z.enum(['challenge', 'decision', 'asset']).optional(),
  status: z.enum(['running', 'completed', 'failed']).optional(),
  durationMs: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

// ============================================================================
// Provider Events
// ============================================================================

export const ProviderEventSchema = BaseEventSchema.extend({
  type: z.literal('provider'),
  operation: z.enum(['request_start', 'request_end', 'request_error']),
  provider: z.string(),
  model: z.string().optional(),
  method: z.enum(['streamText', 'generateStructured']).optional(),
  durationMs: z.number().optional(),
  tokenCount: z.number().optional(),
  errorType: z.string().optional(),
  retryable: z.boolean().optional(),
});

export type ProviderEvent = z.infer<typeof ProviderEventSchema>;

// ============================================================================
// Persistence Events
// ============================================================================

export const PersistenceEventSchema = BaseEventSchema.extend({
  type: z.literal('persistence'),
  operation: z.enum(['read', 'write', 'update', 'list']),
  backend: z.string(),
  entity: z.string(), // e.g., 'run', 'result', 'artifact'
  entityId: z.string().optional(),
  durationMs: z.number().optional(),
  success: z.boolean(),
});

export type PersistenceEvent = z.infer<typeof PersistenceEventSchema>;

// ============================================================================
// Recovery Events
// ============================================================================

export const RecoveryEventSchema = BaseEventSchema.extend({
  type: z.literal('recovery'),
  operation: z.enum(['attempt', 'skip', 'success', 'failure']),
  reason: z.string(),
  attemptNumber: z.number().optional(),
  maxAttempts: z.number().optional(),
});

export type RecoveryEvent = z.infer<typeof RecoveryEventSchema>;

// ============================================================================
// Union Type
// ============================================================================

export const ObservabilityEventSchema = z.discriminatedUnion('type', [
  WorkflowEventSchema,
  ProviderEventSchema,
  PersistenceEventSchema,
  RecoveryEventSchema,
]);

export type ObservabilityEvent = z.infer<typeof ObservabilityEventSchema>;

// ============================================================================
// Event Emitter Interface
// ============================================================================

export interface ObservabilityEmitter {
  emit(event: ObservabilityEvent): void;
  subscribe(handler: (event: ObservabilityEvent) => void): () => void;
}

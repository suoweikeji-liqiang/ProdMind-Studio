import { z } from 'zod';

// Phase 5B: Failure diagnosis contract
// Enables answering: "which step, why, what context"

export const FailureContextSchema = z.object({
  runId: z.string(),
  phaseId: z.string().optional(),
  stepId: z.string().optional(),
  source: z.string(), // 'workflow', 'challenge-engine', 'provider', 'persistence'
  operation: z.string(), // specific operation that failed
  timestamp: z.string(),
});

export type FailureContext = z.infer<typeof FailureContextSchema>;

export const NormalizedErrorSchema = z.object({
  code: z.string(), // e.g., 'PROVIDER_RATE_LIMIT', 'PERSISTENCE_WRITE_FAILED'
  message: z.string(), // user-friendly message
  retryable: z.boolean(),
  context: FailureContextSchema,
  originalError: z.string().optional(), // raw error for debugging
  metadata: z.record(z.unknown()).optional(),
});

export type NormalizedError = z.infer<typeof NormalizedErrorSchema>;

export const FailureDiagnosisSchema = z.object({
  runId: z.string(),
  failedAt: z.string(),
  phase: z.enum(['challenge', 'decision', 'asset', 'workflow']),
  errors: z.array(NormalizedErrorSchema),
  recoveryAttempted: z.boolean(),
  recoverySucceeded: z.boolean().optional(),
});

export type FailureDiagnosis = z.infer<typeof FailureDiagnosisSchema>;

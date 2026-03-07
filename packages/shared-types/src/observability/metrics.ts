import { z } from 'zod';

// Phase 5B: Minimal metrics surface
// NOT a full monitoring platform - just basic counters and durations

export const WorkflowMetricsSchema = z.object({
  totalRuns: z.number(),
  successfulRuns: z.number(),
  failedRuns: z.number(),
  averageDurationMs: z.number().optional(),
});

export type WorkflowMetrics = z.infer<typeof WorkflowMetricsSchema>;

export const PhaseMetricsSchema = z.object({
  phase: z.enum(['challenge', 'decision', 'asset']),
  executionCount: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  averageDurationMs: z.number().optional(),
  minDurationMs: z.number().optional(),
  maxDurationMs: z.number().optional(),
});

export type PhaseMetrics = z.infer<typeof PhaseMetricsSchema>;

export const ProviderMetricsSchema = z.object({
  provider: z.string(),
  requestCount: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
  totalTokens: z.number().optional(),
  averageDurationMs: z.number().optional(),
});

export type ProviderMetrics = z.infer<typeof ProviderMetricsSchema>;

export const PersistenceMetricsSchema = z.object({
  backend: z.string(),
  readCount: z.number(),
  writeCount: z.number(),
  updateCount: z.number(),
  errorCount: z.number(),
});

export type PersistenceMetrics = z.infer<typeof PersistenceMetricsSchema>;

export const SystemMetricsSchema = z.object({
  workflow: WorkflowMetricsSchema,
  phases: z.array(PhaseMetricsSchema),
  providers: z.array(ProviderMetricsSchema),
  persistence: z.array(PersistenceMetricsSchema),
  collectedAt: z.string(),
});

export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;

export interface MetricsCollector {
  getMetrics(): SystemMetrics;
  reset(): void;
}

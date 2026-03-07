import { z } from 'zod';

// Minimal workflow metadata for Phase 4A
// NOT a full planning system - just execution tracking

export const WorkflowStepSchema = z.object({
  stepId: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowExecutionSchema = z.object({
  executionId: z.string(),
  idea: z.string(),
  steps: z.array(WorkflowStepSchema),
  status: z.enum(['running', 'completed', 'failed']),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

export const ExecutionSummarySchema = z.object({
  executionId: z.string(),
  totalSteps: z.number(),
  completedSteps: z.number(),
  failedSteps: z.number(),
  duration: z.string().optional(),
  artifacts: z.array(z.string()),
});

export type ExecutionSummary = z.infer<typeof ExecutionSummarySchema>;

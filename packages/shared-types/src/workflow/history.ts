import { z } from 'zod';
import { ProviderExecutionSummarySchema } from '../provider/contracts.js';

export const PhaseExecutionSchema = z.object({
  phase: z.enum(['challenge', 'decision', 'asset']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  error: z.string().optional(),
  retryCount: z.number().optional(),
});

export type PhaseExecution = z.infer<typeof PhaseExecutionSchema>;

export const WorkflowRunSchema = z.object({
  runId: z.string(),
  idea: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  phases: z.array(PhaseExecutionSchema),
  error: z.string().optional(),
  providerExecutions: z.array(ProviderExecutionSummarySchema).optional(),
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export const LegacyWorkflowRunSchema = WorkflowRunSchema;
export type LegacyWorkflowRun = WorkflowRun;

export const WorkflowResultSchema = z.object({
  runId: z.string(),
  challenge: z.object({
    artifactPath: z.string(),
    hypothesesCount: z.number(),
    summary: z.any().optional(),
  }).optional(),
  decision: z.object({
    artifactPath: z.string(),
    recommendation: z.string(),
    summary: z.any().optional(),
  }).optional(),
  assets: z.object({
    projectPath: z.string(),
    files: z.array(z.string()),
  }).optional(),
  providerExecutions: z.array(ProviderExecutionSummarySchema).optional(),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
export const LegacyWorkflowResultSchema = WorkflowResultSchema;
export type LegacyWorkflowResult = WorkflowResult;

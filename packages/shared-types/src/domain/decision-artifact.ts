import { z } from 'zod';
import { DecisionSummarySchema } from './decision.js';

export const DecisionArtifactSchema = z.object({
  sessionId: z.string(),
  problem: z.string(),
  summary: DecisionSummarySchema,
  stepCount: z.number(),
  createdAt: z.string(),
});

export type DecisionArtifact = z.infer<typeof DecisionArtifactSchema>;

export const DecisionToAssetHandoffSchema = z.object({
  artifact: DecisionArtifactSchema,
  projectId: z.string().optional(),
  metadata: z.object({
    completed: z.boolean(),
    totalSteps: z.number(),
  }),
});

export type DecisionToAssetHandoff = z.infer<typeof DecisionToAssetHandoffSchema>;

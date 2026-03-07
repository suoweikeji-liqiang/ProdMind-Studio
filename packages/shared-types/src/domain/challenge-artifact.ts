import { z } from 'zod';

// Hypothesis from challenge output
export const HypothesisSchema = z.object({
  statement: z.string(),
  priority: z.enum(['primary', 'secondary', 'alternative']),
  source: z.string().optional(),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

// Falsification check from challenge
export const FalsificationCheckSchema = z.object({
  hypothesis: z.string(),
  wrongBecause: z.string(),
  minimalAction: z.string(),
});

export type FalsificationCheck = z.infer<typeof FalsificationCheckSchema>;

// Next action from challenge
export const NextActionSchema = z.object({
  action: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  timeframe: z.string().optional(),
});

export type NextAction = z.infer<typeof NextActionSchema>;

// Challenge artifact - structured output from challenge session
export const ChallengeArtifactSchema = z.object({
  sessionId: z.string(),
  idea: z.string(),
  hypotheses: z.array(HypothesisSchema),
  mvpBoundary: z.string(),
  conflicts: z.array(z.string()),
  falsificationChecks: z.array(FalsificationCheckSchema),
  nextActions: z.array(NextActionSchema),
  roundCount: z.number(),
  createdAt: z.string(),
});

export type ChallengeArtifact = z.infer<typeof ChallengeArtifactSchema>;

// Handoff contract from challenge to asset
export const ChallengeToAssetHandoffSchema = z.object({
  artifact: ChallengeArtifactSchema,
  projectId: z.string().optional(),
  metadata: z.object({
    converged: z.boolean(),
    totalRounds: z.number(),
    unresolvedConflicts: z.number(),
  }),
});

export type ChallengeToAssetHandoff = z.infer<typeof ChallengeToAssetHandoffSchema>;

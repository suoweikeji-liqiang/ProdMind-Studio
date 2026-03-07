import { z } from 'zod';

export type ChallengeRole = 'architect' | 'assassin' | 'userGhost' | 'grounder';

export const RoleTurnSchema = z.object({
  role: z.enum(['architect', 'assassin', 'userGhost', 'grounder']),
  output: z.string(),
  timestamp: z.string(),
});

export type RoleTurn = z.infer<typeof RoleTurnSchema>;

export const AlternativeHypothesisSchema = z.object({
  source: z.string(),
  content: z.string(),
});

export type AlternativeHypothesis = z.infer<typeof AlternativeHypothesisSchema>;

export const ChallengeConflictSchema = z.object({
  type: z.enum(['alternative_hypothesis', 'consensus_alert', 'tech_escape', 'falsification_missing']),
  detected: z.boolean(),
  details: z.string().optional(),
});

export type ChallengeConflict = z.infer<typeof ChallengeConflictSchema>;

export const ChallengeRoundSchema = z.object({
  round: z.number(),
  architect: z.string(),
  userConfirm: z.string(),
  assassin: z.string(),
  userGhost: z.string(),
  userResponse: z.string(),
  grounder: z.string(),
  conflicts: z.array(ChallengeConflictSchema).optional(),
});

export type ChallengeRound = z.infer<typeof ChallengeRoundSchema>;

export const ChallengeSessionSchema = z.object({
  id: z.string(),
  idea: z.string(),
  rounds: z.array(ChallengeRoundSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChallengeSession = z.infer<typeof ChallengeSessionSchema>;

export const ChallengeSummarySchema = z.object({
  hypotheses: z.array(z.string()),
  mvpBoundary: z.string(),
  conflicts: z.array(ChallengeConflictSchema),
  nextActions: z.array(z.string()),
});

export type ChallengeSummary = z.infer<typeof ChallengeSummarySchema>;

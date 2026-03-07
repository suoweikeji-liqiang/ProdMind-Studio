import { z } from 'zod';
import type { ChallengeRound } from './challenge.js';

export const ChallengeProgressStatusSchema = z.enum([
  'active',
  'converged',
  'max_rounds_reached',
  'stopped',
]);

export type ChallengeProgressStatus = z.infer<typeof ChallengeProgressStatusSchema>;

export const UserResponseSlotSchema = z.object({
  userConfirm: z.string(),
  userResponse: z.string(),
});

export type UserResponseSlot = z.infer<typeof UserResponseSlotSchema>;

export const ChallengeSessionStateSchema = z.object({
  sessionId: z.string(),
  idea: z.string(),
  rounds: z.array(z.any()),
  status: ChallengeProgressStatusSchema,
  currentRound: z.number(),
  maxRounds: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChallengeSessionState = z.infer<typeof ChallengeSessionStateSchema>;

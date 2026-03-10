import { z } from 'zod';
import { ConversationModeSchema } from './conversation.js';

export const ArtifactVersionSchema = z.object({
  artifactId: z.string(),
  sourceMode: ConversationModeSchema,
  artifactType: z.string(),
  version: z.number().int().positive(),
  content: z.record(z.unknown()),
  finalizedAt: z.string(),
  note: z.string().optional(),
});
export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>;

import { z } from 'zod';

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ProjectionSchema = z.object({
  context: z.string(),
  actors: z.string(),
  intent: z.string(),
  mechanism: z.string(),
  boundary: z.string(),
});

export type Projection = z.infer<typeof ProjectionSchema>;

export const CompressionSchema = z.object({
  oneLiner: z.string(),
  threeLiner: z.string(),
  structured: z.string(),
});

export type Compression = z.infer<typeof CompressionSchema>;

export const ProjectStateSchema = z.object({
  id: z.string(),
  idea: z.string(),
  clarityStage: z.enum(['concept', 'direction', 'structure', 'executable']),
  messages: z.array(MessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  projection: ProjectionSchema.optional(),
  lastCompression: CompressionSchema.optional(),
  lastGuardWarnings: z.array(z.string()).optional(),
  lastBusinessAssumptions: z.array(z.string()).optional(),
});

export type ProjectState = z.infer<typeof ProjectStateSchema>;

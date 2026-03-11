import { z } from 'zod';

export const ConversationModeSchema = z.enum(['challenge', 'decision', 'requirement-build']);
export type ConversationMode = z.infer<typeof ConversationModeSchema>;

export const ConversationSessionStatusSchema = z.enum(['active', 'archived', 'failed']);
export type ConversationSessionStatus = z.infer<typeof ConversationSessionStatusSchema>;

export const SharedContextSchema = z.object({
  hardConstraints: z.array(z.string()).default([]),
  confirmedFacts: z.array(z.string()).default([]),
  sourceReferences: z.array(z.string()).default([]),
});
export type SharedContext = z.infer<typeof SharedContextSchema>;

export const RoleIdentitySchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
});
export type RoleIdentity = z.infer<typeof RoleIdentitySchema>;

export const ModeMessageSchema = z.object({
  speaker: z.enum(['user', 'role', 'system']),
  content: z.string(),
  timestamp: z.string(),
  roleId: z.string().optional(),
  roleName: z.string().optional(),
});
export type ModeMessage = z.infer<typeof ModeMessageSchema>;

export const DraftSummarySchema = z.object({
  summary: z.string(),
  updatedAt: z.string(),
});
export type DraftSummary = z.infer<typeof DraftSummarySchema>;

export const ModeStateSchema = z.object({
  mode: ConversationModeSchema,
  roleSet: z.array(RoleIdentitySchema),
  messages: z.array(ModeMessageSchema),
  draftSummary: DraftSummarySchema.optional(),
  draftArtifacts: z.array(z.string()).default([]),
  finalArtifacts: z.array(z.string()).default([]),
});
export type ModeState = z.infer<typeof ModeStateSchema>;

export const ConversationSessionSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  status: ConversationSessionStatusSchema,
  currentMode: ConversationModeSchema,
  sharedContext: SharedContextSchema.default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastActiveAt: z.string(),
});
export type ConversationSession = z.infer<typeof ConversationSessionSchema>;

const BaseConversationEventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  mode: ConversationModeSchema,
  timestamp: z.string(),
});

export const ConversationEventSchema = z.discriminatedUnion('type', [
  BaseConversationEventSchema.extend({
    type: z.literal('user_message'),
    content: z.string(),
  }),
  BaseConversationEventSchema.extend({
    type: z.literal('mode_switched'),
    fromMode: ConversationModeSchema,
    toMode: ConversationModeSchema,
  }),
  BaseConversationEventSchema.extend({
    type: z.literal('role_message'),
    roleId: z.string(),
    roleName: z.string(),
    content: z.string(),
  }),
  BaseConversationEventSchema.extend({
    type: z.literal('draft_updated'),
    summary: z.string(),
  }),
  BaseConversationEventSchema.extend({
    type: z.literal('shared_context_updated'),
    confirmedFacts: z.array(z.string()).default([]),
    hardConstraints: z.array(z.string()).default([]),
    sourceReferences: z.array(z.string()).default([]),
  }),
  BaseConversationEventSchema.extend({
    type: z.literal('artifact_finalized'),
    artifactId: z.string(),
    artifactType: z.string(),
    version: z.number().int().positive(),
  }),
]);
export type ConversationEvent = z.infer<typeof ConversationEventSchema>;

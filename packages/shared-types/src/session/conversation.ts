import { z } from 'zod';

export const ConversationModeSchema = z.enum(['challenge', 'decision', 'requirement-build']);
export type ConversationMode = z.infer<typeof ConversationModeSchema>;

export const ConversationSessionStatusSchema = z.enum(['active', 'archived', 'failed']);
export type ConversationSessionStatus = z.infer<typeof ConversationSessionStatusSchema>;

export const SessionInteractionStateSchema = z.enum([
  'idle',
  'running_ai_step',
  'waiting_user_input',
  'ready_to_finalize',
  'completed',
  'blocked',
]);
export type SessionInteractionState = z.infer<typeof SessionInteractionStateSchema>;

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

// ── Phase enums ────────────────────────────────────────────────────────────────

export const ChallengePhaseSchema = z.enum([
  'topic_submitted',
  'architect_framing',
  'waiting_user_problem_correction',
  'objection_generation',
  'waiting_user_objection_response',
  'grounding',
  'waiting_round_decision',
  'waiting_alternative_hypothesis_resolution',
  'waiting_false_consensus_break',
  'waiting_tech_escape_response',
]);
export type ChallengePhase = z.infer<typeof ChallengePhaseSchema>;

export const DecisionPhaseSchema = z.enum([
  'decision_prompt_submitted',
  'decision_frame_generation',
  'waiting_user_frame_confirmation',
  'tradeoff_analysis',
  'waiting_user_priority_adjustment',
  'recommendation_synthesis',
  'waiting_decision_resolution',
]);
export type DecisionPhase = z.infer<typeof DecisionPhaseSchema>;

export const RequirementBuildPhaseSchema = z.enum([
  'artifact_goal_submitted',
  'artifact_scope_detection',
  'waiting_user_artifact_selection',
  'draft_generation',
  'waiting_user_draft_revision',
  'ready_for_downstream_or_finalize',
  'artifact_finalized',
]);
export type RequirementBuildPhase = z.infer<typeof RequirementBuildPhaseSchema>;

export const SessionPhaseSchema = z.union([
  ChallengePhaseSchema,
  DecisionPhaseSchema,
  RequirementBuildPhaseSchema,
]);
export type SessionPhase = z.infer<typeof SessionPhaseSchema>;

// ── User action types ──────────────────────────────────────────────────────────

export const ChallengeUserActionSchema = z.enum([
  'raw_topic',
  'problem_correction',
  'objection_response',
  'round_resolution',
]);
export type ChallengeUserAction = z.infer<typeof ChallengeUserActionSchema>;

export const DecisionUserActionSchema = z.enum([
  'decision_problem',
  'frame_correction',
  'priority_adjustment',
  'decision_resolution',
]);
export type DecisionUserAction = z.infer<typeof DecisionUserActionSchema>;

export const RequirementUserActionSchema = z.enum([
  'artifact_goal',
  'artifact_selection',
  'draft_revision',
  'finalization_note',
]);
export type RequirementUserAction = z.infer<typeof RequirementUserActionSchema>;

export const UserActionSchema = z.union([
  ChallengeUserActionSchema,
  DecisionUserActionSchema,
  RequirementUserActionSchema,
]);
export type UserAction = z.infer<typeof UserActionSchema>;

// ── Session ────────────────────────────────────────────────────────────────────

export const ConversationSessionSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  status: ConversationSessionStatusSchema,
  currentMode: ConversationModeSchema,
  currentPhase: SessionPhaseSchema.default('topic_submitted'),
  interactionState: SessionInteractionStateSchema.default('waiting_user_input'),
  requiredUserAction: z.string().default('请输入你的议题或想法'),
  lastCompletedStep: z.string().optional(),
  nextRecommendedMode: ConversationModeSchema.optional(),
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
  BaseConversationEventSchema.extend({
    type: z.literal('phase_transition'),
    fromPhase: SessionPhaseSchema,
    toPhase: SessionPhaseSchema,
    requiredUserAction: z.string(),
  }),
]);
export type ConversationEvent = z.infer<typeof ConversationEventSchema>;

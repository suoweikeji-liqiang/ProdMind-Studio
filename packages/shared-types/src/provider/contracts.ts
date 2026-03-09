import { z } from 'zod';

export const ProviderCapabilityFlagsSchema = z.object({
  structuredOutput: z.boolean(),
  streaming: z.boolean(),
});

export type ProviderCapabilityFlags = z.infer<typeof ProviderCapabilityFlagsSchema>;

export const ProviderFallbackModeSchema = z.enum(['disabled', 'explicit']);

export type ProviderFallbackMode = z.infer<typeof ProviderFallbackModeSchema>;

export const ProviderReliabilityPolicySchema = z.object({
  timeoutMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).optional(),
  defaultTimeoutMs: z.number().int().positive().optional(),
  maxTimeoutMs: z.number().int().positive().optional(),
  defaultMaxRetries: z.number().int().min(0).optional(),
  maxRetriesLimit: z.number().int().min(0).optional(),
  fallbackEligible: z.boolean(),
  fallbackMode: ProviderFallbackModeSchema.optional(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional(),
}).superRefine((policy, ctx) => {
  const defaultTimeoutMs = policy.defaultTimeoutMs ?? policy.timeoutMs;
  const maxTimeoutMs = policy.maxTimeoutMs ?? defaultTimeoutMs;
  const defaultMaxRetries = policy.defaultMaxRetries ?? policy.maxRetries;
  const maxRetriesLimit = policy.maxRetriesLimit ?? defaultMaxRetries;

  if (typeof defaultTimeoutMs !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defaultTimeoutMs'],
      message: 'defaultTimeoutMs or timeoutMs is required',
    });
  }

  if (typeof defaultMaxRetries !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defaultMaxRetries'],
      message: 'defaultMaxRetries or maxRetries is required',
    });
  }

  if (typeof maxTimeoutMs === 'number' && typeof defaultTimeoutMs === 'number' && maxTimeoutMs < defaultTimeoutMs) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxTimeoutMs'],
      message: 'maxTimeoutMs must be greater than or equal to defaultTimeoutMs',
    });
  }

  if (typeof maxRetriesLimit === 'number' && typeof defaultMaxRetries === 'number' && maxRetriesLimit < defaultMaxRetries) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxRetriesLimit'],
      message: 'maxRetriesLimit must be greater than or equal to defaultMaxRetries',
    });
  }
});

export type ProviderReliabilityPolicy = z.infer<typeof ProviderReliabilityPolicySchema>;

export const ProviderUsageContractSchema = z.object({
  tokenAccounting: z.enum(['provider', 'estimated', 'unavailable']),
  costAccounting: z.enum(['provider', 'estimated', 'unavailable']),
  pricePerMillionInputTokensUsd: z.number().nonnegative().optional(),
  pricePerMillionOutputTokensUsd: z.number().nonnegative().optional(),
});

export type ProviderUsageContract = z.infer<typeof ProviderUsageContractSchema>;

export const ProviderCapabilityProfileSchema = z.object({
  providerName: z.string(),
  modelName: z.string(),
  enabled: z.boolean(),
  capabilities: ProviderCapabilityFlagsSchema,
  reliability: ProviderReliabilityPolicySchema,
  usage: ProviderUsageContractSchema,
  runtime: z.object({
    derivedAt: z.string().optional(),
    lastValidatedAt: z.string().optional(),
  }).optional(),
});

export type ProviderCapabilityProfile = z.infer<typeof ProviderCapabilityProfileSchema>;

export const ProviderSelectionRequirementSchema = z.object({
  structuredOutput: z.boolean().optional(),
  streaming: z.boolean().optional(),
});

export type ProviderSelectionRequirement = z.infer<typeof ProviderSelectionRequirementSchema>;

export const ProviderRouteCandidateSchema = z.object({
  providerName: z.string(),
  modelName: z.string(),
  routeRole: z.enum(['primary', 'fallback']),
  enabled: z.boolean(),
  fallbackEligible: z.boolean(),
});

export type ProviderRouteCandidate = z.infer<typeof ProviderRouteCandidateSchema>;

export const ProviderRouteRejectionSchema = z.object({
  stage: z.enum(['selection', 'primary', 'fallback']),
  reason: z.string(),
  failureType: z.string().optional(),
});

export type ProviderRouteRejection = z.infer<typeof ProviderRouteRejectionSchema>;

export const ProviderRouteResolutionSchema = z.object({
  strategy: z.enum(['single', 'explicit-fallback']),
  requestedCapabilities: ProviderSelectionRequirementSchema.optional(),
  initialCandidate: ProviderRouteCandidateSchema,
  resolvedCandidate: ProviderRouteCandidateSchema.optional(),
  fallbackCandidate: ProviderRouteCandidateSchema.optional(),
  rejection: ProviderRouteRejectionSchema.optional(),
});

export type ProviderRouteResolution = z.infer<typeof ProviderRouteResolutionSchema>;

export const ProviderSelectionResultSchema = z.object({
  providerName: z.string(),
  modelName: z.string(),
  fallbackConfigured: z.boolean(),
  matchedCapabilities: ProviderSelectionRequirementSchema.optional(),
  rejectionReason: z.string().optional(),
  routeResolution: ProviderRouteResolutionSchema.optional(),
});

export type ProviderSelectionResult = z.infer<typeof ProviderSelectionResultSchema>;

export const ProviderUsageSummarySchema = z.object({
  requestCount: z.number().int().min(0),
  tokenAvailability: z.enum(['available', 'estimated', 'unavailable']),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  costAvailability: z.enum(['available', 'estimated', 'unavailable']),
  estimatedCostUsd: z.number().nonnegative().optional(),
  actualCostUsd: z.number().nonnegative().optional(),
});

export type ProviderUsageSummary = z.infer<typeof ProviderUsageSummarySchema>;

export const ProviderPolicySnapshotSchema = z.object({
  timeoutMs: z.number().int().positive(),
  maxRetries: z.number().int().min(0),
  fallbackMode: ProviderFallbackModeSchema,
});

export type ProviderPolicySnapshot = z.infer<typeof ProviderPolicySnapshotSchema>;

export const ProviderExecutionSummarySchema = z.object({
  operation: z.enum(['streamText', 'generateStructured']).optional(),
  initialProvider: z.string().optional(),
  initialModel: z.string().optional(),
  selectedProvider: z.string(),
  selectedModel: z.string(),
  attempts: z.number().int().min(1),
  retriesPerformed: z.number().int().min(0),
  timeoutCount: z.number().int().min(0),
  fallbackUsed: z.boolean(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional(),
  failureType: z.string().optional(),
  failureMessage: z.string().optional(),
  failureStage: z.enum(['selection', 'primary', 'fallback']).optional(),
  requiredCapabilities: ProviderSelectionRequirementSchema.optional(),
  routeResolution: ProviderRouteResolutionSchema.optional(),
  policySnapshot: ProviderPolicySnapshotSchema.optional(),
  usage: ProviderUsageSummarySchema,
});

export type ProviderExecutionSummary = z.infer<typeof ProviderExecutionSummarySchema>;

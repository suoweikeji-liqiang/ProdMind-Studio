import { z } from 'zod';

export const ProviderCapabilityFlagsSchema = z.object({
  structuredOutput: z.boolean(),
  streaming: z.boolean(),
});

export type ProviderCapabilityFlags = z.infer<typeof ProviderCapabilityFlagsSchema>;

export const ProviderReliabilityPolicySchema = z.object({
  timeoutMs: z.number().int().positive(),
  maxRetries: z.number().int().min(0),
  fallbackEligible: z.boolean(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional(),
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

export const ProviderSelectionResultSchema = z.object({
  providerName: z.string(),
  modelName: z.string(),
  fallbackConfigured: z.boolean(),
  matchedCapabilities: ProviderSelectionRequirementSchema.optional(),
  rejectionReason: z.string().optional(),
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
  requiredCapabilities: ProviderSelectionRequirementSchema.optional(),
  usage: ProviderUsageSummarySchema,
});

export type ProviderExecutionSummary = z.infer<typeof ProviderExecutionSummarySchema>;

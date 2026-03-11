import { z } from 'zod';

export const DecisionOptionSchema = z.object({
  id: z.string(),
  description: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const DecisionRiskSchema = z.object({
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  mitigation: z.string().optional(),
});

export type DecisionRisk = z.infer<typeof DecisionRiskSchema>;

export const DecisionHypothesisSchema = z.object({
  statement: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()),
});

export type DecisionHypothesis = z.infer<typeof DecisionHypothesisSchema>;

export const DecisionStepSchema = z.object({
  stepId: z.string(),
  type: z.enum(['hypothesis_eval', 'risk_eval', 'option_compare', 'summary']),
  input: z.string(),
  output: z.string(),
  timestamp: z.string(),
});

export type DecisionStep = z.infer<typeof DecisionStepSchema>;

export const DecisionProgressStatusSchema = z.enum([
  'active',
  'completed',
  'stopped',
]);

export type DecisionProgressStatus = z.infer<typeof DecisionProgressStatusSchema>;

export const DecisionSessionStateSchema = z.object({
  sessionId: z.string(),
  problem: z.string(),
  steps: z.array(DecisionStepSchema),
  status: DecisionProgressStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DecisionSessionState = z.infer<typeof DecisionSessionStateSchema>;

export const DecisionSummarySchema = z.object({
  hypotheses: z.array(DecisionHypothesisSchema),
  risks: z.array(DecisionRiskSchema),
  options: z.array(DecisionOptionSchema),
  recommendation: z.string(),
});

export type DecisionSummary = z.infer<typeof DecisionSummarySchema>;

export const DecisionFrameSchema = z.object({
  options: z.array(z.string()),
  criteria: z.array(z.string()),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
});
export type DecisionFrame = z.infer<typeof DecisionFrameSchema>;

export const TradeoffResultSchema = z.object({
  analysis: z.record(z.string(), z.string()),
  winners: z.array(z.string()),
  losers: z.array(z.string()),
});
export type TradeoffResult = z.infer<typeof TradeoffResultSchema>;

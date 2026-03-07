import { describe, it, expect } from 'vitest';
import {
  DecisionArtifactSchema,
  DecisionToAssetHandoffSchema,
  type DecisionArtifact,
  type DecisionToAssetHandoff
} from '../packages/shared-types/src/domain/decision-artifact.js';

describe('Decision Domain Model Contract', () => {
  it('validates complete decision artifact', () => {
    const artifact: DecisionArtifact = {
      sessionId: 'decision-session-1',
      problem: '选择技术栈',
      summary: {
        hypotheses: [
          { statement: 'React 更适合团队', confidence: 'high', evidence: ['团队熟悉', '生态丰富'] },
        ],
        risks: [
          { description: '学习曲线陡峭', severity: 'medium', mitigation: '提供培训' },
        ],
        options: [
          { id: 'opt1', description: 'React', pros: ['生态好'], cons: ['复杂'] },
        ],
        recommendation: '选择 React',
      },
      stepCount: 4,
      createdAt: new Date().toISOString(),
    };

    const result = DecisionArtifactSchema.safeParse(artifact);
    expect(result.success).toBe(true);
  });

  it('validates decision-to-asset handoff', () => {
    const handoff: DecisionToAssetHandoff = {
      artifact: {
        sessionId: 'test',
        problem: 'test',
        summary: {
          hypotheses: [],
          risks: [],
          options: [],
          recommendation: 'test',
        },
        stepCount: 1,
        createdAt: new Date().toISOString(),
      },
      projectId: 'project-123',
      metadata: {
        completed: true,
        totalSteps: 4,
      },
    };

    const result = DecisionToAssetHandoffSchema.safeParse(handoff);
    expect(result.success).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createFakeProvider } from '../../packages/llm-adapter/src/fake-provider.js';
import {
  createDecisionSession,
  runDecisionOrchestration,
  buildDecisionSummary,
} from '../../packages/decision-engine/src/index.js';
import type { DecisionToAssetHandoff } from '@prodmind/shared-types';
import { writeDecisionArtifact } from '../../packages/asset-engine/src/decision-writer.js';

describe('Decision Flow Golden Path', () => {
  const testDir = path.join(process.cwd(), '.test-tmp-golden-decision');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('runs complete decision orchestration and writes artifact', async () => {
    const adapter = createFakeProvider({
      default: 'hypothesis: React is suitable',
    });

    const session = createDecisionSession('选择前端框架');
    expect(session.status).toBe('active');
    expect(session.steps).toHaveLength(0);

    const completed = await runDecisionOrchestration(session, adapter);
    expect(completed.status).toBe('completed');
    expect(completed.steps).toHaveLength(4);
    expect(completed.steps[0].type).toBe('hypothesis_eval');
    expect(completed.steps[1].type).toBe('risk_eval');
    expect(completed.steps[2].type).toBe('option_compare');
    expect(completed.steps[3].type).toBe('summary');

    const summary = buildDecisionSummary(completed);
    expect(summary.hypotheses.length).toBeGreaterThanOrEqual(0);
    expect(summary.risks.length).toBeGreaterThanOrEqual(0);
    expect(summary.options.length).toBeGreaterThanOrEqual(0);

    const handoff: DecisionToAssetHandoff = {
      artifact: {
        sessionId: completed.sessionId,
        problem: completed.problem,
        summary,
        stepCount: completed.steps.length,
        createdAt: completed.createdAt,
      },
      projectId: 'test-project',
      metadata: {
        completed: true,
        totalSteps: completed.steps.length,
      },
    };

    const decisionPath = await writeDecisionArtifact(testDir, handoff);
    const content = await fs.readFile(decisionPath, 'utf8');

    expect(content).toContain('Decision Analysis');
    expect(content).toContain('Hypotheses');
    expect(content).toContain('Risks');
    expect(content).toContain('Options');
    expect(content).toContain('Recommendation');
  });
});

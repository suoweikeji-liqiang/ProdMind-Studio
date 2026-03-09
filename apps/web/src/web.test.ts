import { describe, it, expect } from 'vitest';

describe('Web Happy Path', () => {
  it('should have workflow router exported', async () => {
    const { workflowRouter } = await import('../src/routes/workflow.js');
    expect(workflowRouter).toBeDefined();
  });

  it('should have view renderers exported', async () => {
    const { renderHome, renderWorkflow, renderResults, renderHistoryListPage, renderHistoryDetailPage } = await import('../src/views/index.js');
    expect(renderHome).toBeDefined();
    expect(renderWorkflow).toBeDefined();
    expect(renderResults).toBeDefined();
    expect(renderHistoryListPage).toBeDefined();
    expect(renderHistoryDetailPage).toBeDefined();
  });

  it('should render home page with V1 framing and history CTA', async () => {
    const { renderHome } = await import('../src/views/index.js');
    const html = renderHome();
    expect(html).toContain('ProdMind Studio');
    expect(html).toContain('Start New Workflow');
    expect(html).toContain('Single-user decision workbench');
    expect(html).toContain('Review History');
    expect(html).toContain('/history');
  });

  it('should render workflow page with status and recovery guidance', async () => {
    const { renderWorkflow } = await import('../src/views/index.js');
    const html = renderWorkflow();
    expect(html).toContain('Execute Workflow');
    expect(html).toContain('Run Workflow');
    expect(html).toContain('What to expect');
    expect(html).toContain('If the workflow fails');
    expect(html).toContain('History is the safest way to revisit previous outputs');
  });

  it('should render results page with persisted-history fallback', async () => {
    const { renderResults } = await import('../src/views/index.js');
    const html = renderResults('test-123');
    expect(html).toContain('Workflow Results');
    expect(html).toContain('test-123');
    expect(html).toContain('Provider Reliability');
    expect(html).toContain('Recommendation');
    expect(html).toContain('/api/workflow/history/test-123');
    expect(html).toContain('persisted workflow history');
  });

  it('should render history list and detail pages', async () => {
    const { renderHistoryListPage, renderHistoryDetailPage } = await import('../src/views/index.js');

    const listHtml = renderHistoryListPage();
    expect(listHtml).toContain('Workflow History');
    expect(listHtml).toContain('Review earlier runs');
    expect(listHtml).toContain('/api/workflow/history');

    const detailHtml = renderHistoryDetailPage('run-42');
    expect(detailHtml).toContain('History Detail');
    expect(detailHtml).toContain('run-42');
    expect(detailHtml).toContain('/api/workflow/history/run-42');
  });

  it('should render provider summary block', async () => {
    const { renderDecisionResult, renderHistoryList, renderHistoryDetail, renderProviderSummary } = await import('../src/views/result-renderer.js');

    const decisionHtml = renderDecisionResult({
      summary: {
        hypotheses: [{ statement: 'Operators need clearer recovery steps', confidence: 'high', evidence: ['pilot usage'] }],
        risks: [{ description: 'Provider timeout', severity: 'high', mitigation: 'Retry once, then inspect history' }],
        options: [{ id: 'opt-1', description: 'Keep the thin-shell flow', pros: ['Low churn'], cons: ['Less operator control'] }],
        recommendation: 'Keep Web as the main path and use history for revisit.',
      },
      problem: 'How should V1 handle revisit?',
    });
    expect(decisionHtml).toContain('Recommendation');
    expect(decisionHtml).toContain('Keep Web as the main path');
    expect(decisionHtml).toContain('Risks');
    expect(decisionHtml).toContain('Options');

    const historyListHtml = renderHistoryList([
      {
        run: {
          runId: 'run-1',
          idea: 'Test the V1 revisit flow',
          status: 'completed',
          startedAt: '2026-03-09T00:00:00.000Z',
          completedAt: '2026-03-09T00:01:00.000Z',
          phases: [],
        },
        result: {
          runId: 'run-1',
          decision: {
            artifactPath: 'assets/decision.json',
            recommendation: 'Use the history detail page for revisit.',
          },
        },
      },
    ]);
    expect(historyListHtml).toContain('run-1');
    expect(historyListHtml).toContain('Use the history detail page for revisit.');

    const historyDetailHtml = renderHistoryDetail(
      {
        runId: 'run-1',
        idea: 'Test the V1 revisit flow',
        status: 'completed',
        startedAt: '2026-03-09T00:00:00.000Z',
        completedAt: '2026-03-09T00:01:00.000Z',
        phases: [{ phase: 'challenge', status: 'completed', durationMs: 1200 }],
      },
      {
        runId: 'run-1',
        challenge: { artifactPath: 'challenge.md', hypothesesCount: 2 },
        decision: {
          artifactPath: 'assets/decision.json',
          recommendation: 'Use the history detail page for revisit.',
        },
        assets: {
          projectPath: './prodmind-project',
          files: ['challenge.md', 'assets/decision.json'],
        },
      }
    );
    expect(historyDetailHtml).toContain('Phase Status');
    expect(historyDetailHtml).toContain('Recommendation');
    expect(historyDetailHtml).toContain('Next Steps');

    const html = renderProviderSummary([{
      initialProvider: 'openai',
      initialModel: 'gpt-4o-mini',
      selectedProvider: 'fake',
      selectedModel: 'fake-default',
      attempts: 2,
      retriesPerformed: 1,
      timeoutCount: 0,
      fallbackUsed: false,
      failureStage: 'primary',
      routeResolution: {
        strategy: 'single',
        initialCandidate: {
          providerName: 'fake',
          modelName: 'fake-default',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
        resolvedCandidate: {
          providerName: 'fake',
          modelName: 'fake-default',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
      },
      policySnapshot: {
        timeoutMs: 5000,
        maxRetries: 1,
        fallbackMode: 'disabled',
      },
      usage: {
        requestCount: 1,
        totalTokens: 42,
        tokenAvailability: 'estimated',
        costAvailability: 'unavailable',
      },
    }]);
    expect(html).toContain('fake/fake-default');
    expect(html).toContain('Retries:</strong> 1');
    expect(html).toContain('Route:</strong>');
    expect(html).toContain('Failure Stage:</strong> primary');
    expect(html).toContain('Policy:</strong> timeout=5000ms');
  });
});

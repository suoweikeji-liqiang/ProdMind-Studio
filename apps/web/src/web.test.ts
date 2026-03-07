import { describe, it, expect } from 'vitest';

describe('Web Happy Path', () => {
  it('should have workflow router exported', async () => {
    const { workflowRouter } = await import('../src/routes/workflow.js');
    expect(workflowRouter).toBeDefined();
  });

  it('should have view renderers exported', async () => {
    const { renderHome, renderWorkflow, renderResults } = await import('../src/views/index.js');
    expect(renderHome).toBeDefined();
    expect(renderWorkflow).toBeDefined();
    expect(renderResults).toBeDefined();
  });

  it('should render home page', async () => {
    const { renderHome } = await import('../src/views/index.js');
    const html = renderHome();
    expect(html).toContain('ProdMind Studio');
    expect(html).toContain('Start New Workflow');
  });

  it('should render workflow page', async () => {
    const { renderWorkflow } = await import('../src/views/index.js');
    const html = renderWorkflow();
    expect(html).toContain('Execute Workflow');
    expect(html).toContain('Run Workflow');
  });

  it('should render results page', async () => {
    const { renderResults } = await import('../src/views/index.js');
    const html = renderResults('test-123');
    expect(html).toContain('Workflow Results');
    expect(html).toContain('test-123');
  });
});

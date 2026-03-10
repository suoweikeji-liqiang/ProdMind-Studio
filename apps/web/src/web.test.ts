import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, it, expect } from 'vitest';

const testSessionsDir = path.join(process.cwd(), '.test-web-sessions');

afterEach(() => {
  if (existsSync(testSessionsDir)) {
    rmSync(testSessionsDir, { recursive: true, force: true });
  }
});

async function withAppServer(run: (baseUrl: string) => Promise<void>) {
  const { createApp } = await import('../src/server.js');
  const app = createApp();
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

describe('Web Happy Path', () => {
  it('should have workflow router exported', async () => {
    const { workflowRouter } = await import('../src/routes/workflow.js');
    expect(workflowRouter).toBeDefined();
  });

  it('should have view renderers exported', async () => {
    const {
      renderHome,
      renderWorkflow,
      renderResults,
      renderHistoryListPage,
      renderHistoryDetailPage,
      renderSessionPage,
      renderSessionHistoryPage,
      renderSessionReplayPage,
    } = await import('../src/views/index.js');
    expect(renderHome).toBeDefined();
    expect(renderWorkflow).toBeDefined();
    expect(renderResults).toBeDefined();
    expect(renderHistoryListPage).toBeDefined();
    expect(renderHistoryDetailPage).toBeDefined();
    expect(renderSessionPage).toBeDefined();
    expect(renderSessionHistoryPage).toBeDefined();
    expect(renderSessionReplayPage).toBeDefined();
  });

  it('should render home page with topic-first session entry', async () => {
    const { renderHome } = await import('../src/views/index.js');
    const html = renderHome();
    expect(html).toContain('ProdMind Studio');
    expect(html).toContain('中文多轮思维工具');
    expect(html).toContain('请输入本次要讨论的议题');
    expect(html).toContain('name="topic"');
    expect(html).toContain('required');
    expect(html).toContain('开启会话');
    expect(html).toContain('/sessions');
    expect(html).not.toContain('Start New Workflow');
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

  it('should render session shell pages', async () => {
    const { renderSessionPage, renderSessionHistoryPage, renderSessionReplayPage } = await import('../src/views/index.js');

    const sessionHtml = renderSessionPage('session-42');
    expect(sessionHtml).toContain('会话');
    expect(sessionHtml).toContain('当前模式');
    expect(sessionHtml).toContain('当前模式草稿');
    expect(sessionHtml).toContain('/api/sessions/session-42');

    const historyHtml = renderSessionHistoryPage();
    expect(historyHtml).toContain('会话历史');
    expect(historyHtml).toContain('按议题回看');

    const replayHtml = renderSessionReplayPage('session-42');
    expect(replayHtml).toContain('会话回放');
    expect(replayHtml).toContain('session-42');
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
      selectedProvider: 'qwen',
      selectedModel: 'qwen-plus',
      attempts: 2,
      retriesPerformed: 1,
      timeoutCount: 0,
      fallbackUsed: false,
      failureStage: 'primary',
      routeResolution: {
        strategy: 'single',
        initialCandidate: {
          providerName: 'qwen',
          modelName: 'qwen-plus',
          routeRole: 'primary',
          enabled: true,
          fallbackEligible: false,
        },
        resolvedCandidate: {
          providerName: 'qwen',
          modelName: 'qwen-plus',
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
    expect(html).toContain('qwen/qwen-plus');
    expect(html).toContain('Retries:</strong> 1');
    expect(html).toContain('Route:</strong>');
    expect(html).toContain('Failure Stage:</strong> primary');
    expect(html).toContain('Policy:</strong> timeout=5000ms');
  });
});

describe('Web Session Shell', () => {
  it('serves session-first pages', async () => {
    await withAppServer(async (baseUrl) => {
      const homeResponse = await fetch(`${baseUrl}/`);
      const homeHtml = await homeResponse.text();
      expect(homeResponse.status).toBe(200);
      expect(homeHtml).toContain('请输入本次要讨论的议题');
      expect(homeHtml).toContain('/sessions');
      expect(homeHtml).not.toContain('Start New Workflow');

      const sessionResponse = await fetch(`${baseUrl}/sessions/session-123`);
      const sessionHtml = await sessionResponse.text();
      expect(sessionResponse.status).toBe(200);
      expect(sessionHtml).toContain('当前模式');
      expect(sessionHtml).toContain('当前模式草稿');
      expect(sessionHtml).toContain('/api/sessions/session-123');

      const historyResponse = await fetch(`${baseUrl}/sessions`);
      const historyHtml = await historyResponse.text();
      expect(historyResponse.status).toBe(200);
      expect(historyHtml).toContain('会话历史');

      const replayResponse = await fetch(`${baseUrl}/sessions/session-123/replay`);
      const replayHtml = await replayResponse.text();
      expect(replayResponse.status).toBe(200);
      expect(replayHtml).toContain('会话回放');
    });
  });
});

describe('Web Session API', () => {
  it('creates and retrieves a topic-first session', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Design a conversation-first product shell', projectPath: testSessionsDir }),
      });

      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();
      expect(created.session.topic).toBe('Design a conversation-first product shell');
      expect(created.session.currentMode).toBe('challenge');

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}`);
      expect(getResponse.status).toBe(200);
      const loaded = await getResponse.json();

      expect(loaded.session.sessionId).toBe(created.session.sessionId);
      expect(loaded.session.currentMode).toBe('challenge');
    });
  });

  it('switches the active mode persistently', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Compare challenge and decision mode', projectPath: testSessionsDir }),
      });
      const created = await createResponse.json();

      const switchResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
      });

      expect(switchResponse.status).toBe(200);
      const updated = await switchResponse.json();
      expect(updated.session.currentMode).toBe('decision');

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}`);
      const loaded = await getResponse.json();
      expect(loaded.session.currentMode).toBe('decision');
    });
  });

  it('appends user messages when the active mode has no live engine yet', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Pressure-test session message persistence', projectPath: testSessionsDir }),
      });
      const created = await createResponse.json();

      await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
      });

      const messageResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Challenge this assumption set.', projectPath: testSessionsDir }),
      });

      expect(messageResponse.status).toBe(202);
      const accepted = await messageResponse.json();
      expect(accepted.event.type).toBe('user_message');
      expect(accepted.event.mode).toBe('requirement-build');

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}`);
      const loaded = await getResponse.json();
      expect(loaded.modeState.messages).toHaveLength(1);
      expect(loaded.modeState.messages[0].content).toBe('Challenge this assumption set.');
    });
  });

  it('runs repeated visible challenge rounds inside one session', async () => {
    const previous = {
      mode: process.env.PROVIDER_MODE,
      type: process.env.PROVIDER_TYPE,
      modelId: process.env.MODEL_ID,
    };

    process.env.PROVIDER_MODE = 'fake';
    process.env.PROVIDER_TYPE = 'openai';
    process.env.MODEL_ID = 'fake-model';

    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '把 CLI V1 迁移为中文 Web 思维工具', projectPath: testSessionsDir }),
        });
        const created = await createResponse.json();
        const sessionId = created.session.sessionId;

        const firstTurnResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '先帮我拆一下这个议题。', projectPath: testSessionsDir }),
        });

        expect(firstTurnResponse.status).toBe(200);
        const firstTurn = await firstTurnResponse.json();
        expect(firstTurn.modeState.roleSet).toEqual([
          { roleId: 'architect', roleName: '架构师' },
          { roleId: 'assassin', roleName: '刺客' },
          { roleId: 'userGhost', roleName: '用户幽灵' },
          { roleId: 'grounder', roleName: '锚点官' },
        ]);
        expect(firstTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'user')).toHaveLength(1);
        expect(firstTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'role')).toHaveLength(4);
        expect(firstTurn.modeState.draftSummary.summary).toContain('第 1 轮');

        const secondTurnResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '用户其实主要是产品经理，不是开发。', projectPath: testSessionsDir }),
        });

        expect(secondTurnResponse.status).toBe(200);
        const secondTurn = await secondTurnResponse.json();
        expect(secondTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'user')).toHaveLength(2);
        expect(secondTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'role')).toHaveLength(8);
        expect(secondTurn.modeState.draftSummary.summary).toContain('第 2 轮');
        expect(secondTurn.modeState.messages.some((message: { roleName?: string; }) => message.roleName === '架构师')).toBe(true);
      });
    } finally {
      process.env.PROVIDER_MODE = previous.mode;
      process.env.PROVIDER_TYPE = previous.type;
      process.env.MODEL_ID = previous.modelId;
    }
  });

  it('switches to decision mode without mixing challenge history', async () => {
    const previous = {
      mode: process.env.PROVIDER_MODE,
      type: process.env.PROVIDER_TYPE,
      modelId: process.env.MODEL_ID,
    };

    process.env.PROVIDER_MODE = 'fake';
    process.env.PROVIDER_TYPE = 'openai';
    process.env.MODEL_ID = 'fake-model';

    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '在一个会话里切换 challenge 和 decision', projectPath: testSessionsDir }),
        });
        const created = await createResponse.json();
        const sessionId = created.session.sessionId;

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '先做一轮 challenge。', projectPath: testSessionsDir }),
        });

        const switchResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
        });
        expect(switchResponse.status).toBe(200);

        const decisionResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '现在请给出决策建议。', projectPath: testSessionsDir }),
        });

        expect(decisionResponse.status).toBe(200);
        const decisionTurn = await decisionResponse.json();
        expect(decisionTurn.modeState.mode).toBe('decision');
        expect(decisionTurn.modeState.roleSet).toEqual([
          { roleId: 'solution', roleName: '方案官' },
          { roleId: 'risk', roleName: '风险官' },
          { roleId: 'tradeoff', roleName: '权衡官' },
          { roleId: 'verdict', roleName: '裁决官' },
        ]);
        expect(decisionTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'user')).toHaveLength(1);
        expect(decisionTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'role')).toHaveLength(4);
        expect(decisionTurn.modeState.draftSummary.summary).toContain('当前建议');

        await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'challenge', projectPath: testSessionsDir }),
        });

        const challengeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}`);
        const challengeState = await challengeResponse.json();
        expect(challengeState.modeState.mode).toBe('challenge');
        expect(challengeState.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'user')).toHaveLength(1);
        expect(challengeState.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'role')).toHaveLength(4);
      });
    } finally {
      process.env.PROVIDER_MODE = previous.mode;
      process.env.PROVIDER_TYPE = previous.type;
      process.env.MODEL_ID = previous.modelId;
    }
  });
});

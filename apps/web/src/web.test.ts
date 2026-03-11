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

async function readJson<T>(response: { json(): Promise<unknown> }): Promise<T> {
  return response.json() as Promise<T>;
}

describe('Web Happy Path', () => {
  it('legacy compatibility: workflow router is still present for pre-migration clients', async () => {
    const { workflowRouter } = await import('../src/routes/workflow.js');
    expect(workflowRouter).toBeDefined();
  });

  it('should have view renderers exported', async () => {
    const {
      renderHome,
      renderSessionPage,
      renderSessionHistoryPage,
      renderSessionReplayPage,
    } = await import('../src/views/index.js');
    expect(renderHome).toBeDefined();
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
    expect(html).not.toContain('compat-note');
  });

  it('should render session shell pages', async () => {
    const { renderSessionPage, renderSessionHistoryPage, renderSessionReplayPage } = await import('../src/views/index.js');

    const sessionHtml = renderSessionPage('session-42');
    expect(sessionHtml).toContain('会话');
    expect(sessionHtml).toContain('当前模式');
    expect(sessionHtml).toContain('当前模式草稿');
    expect(sessionHtml).toContain('草稿产物');
    expect(sessionHtml).toContain('已定稿版本');
    expect(sessionHtml).toContain('/api/sessions/session-42');
    expect(sessionHtml).toContain('id="sessionMessageForm"');
    expect(sessionHtml).toContain('id="sessionMessageInput"');
    expect(sessionHtml).toContain('id="sessionComposerError"');
    expect(sessionHtml).toContain('id="sharedContextPanel"');
    expect(sessionHtml).toContain('id="finalizeArtifactsButton"');
    expect(sessionHtml).toContain('/api/sessions/session-42/messages');
    expect(sessionHtml).toContain('/api/sessions/session-42/mode');
    expect(sessionHtml).toContain('/api/sessions/session-42/artifacts/finalize');
    expect(sessionHtml).toContain("document.getElementById('sessionSendButton').disabled = disabled;");
    expect(sessionHtml).toContain('质疑模式');
    expect(sessionHtml).toContain('裁决模式');
    expect(sessionHtml).toContain('需求共建模式');
    expect(sessionHtml).toContain('只在需求共建模式下启用');

    const historyHtml = renderSessionHistoryPage();
    expect(historyHtml).toContain('会话历史');
    expect(historyHtml).toContain('按议题回看');
    expect(historyHtml).toContain('/api/sessions');

    const replayHtml = renderSessionReplayPage('session-42');
    expect(replayHtml).toContain('会话回放');
    expect(replayHtml).toContain('session-42');
    expect(replayHtml).toContain('/api/sessions/session-42/replay');
    expect(replayHtml).toContain('共享底稿更新');
    expect(replayHtml).toContain('建议');
    expect(replayHtml).not.toContain('Legacy Workflow');
    expect(replayHtml).not.toContain('Recommendation');
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
      expect(sessionHtml).toContain('草稿产物');
      expect(sessionHtml).toContain('已定稿版本');
      expect(sessionHtml).toContain('/api/sessions/session-123');

      const historyResponse = await fetch(`${baseUrl}/sessions`);
      const historyHtml = await historyResponse.text();
      expect(historyResponse.status).toBe(200);
      expect(historyHtml).toContain('会话历史');
      expect(historyHtml).toContain('/api/sessions');

      const replayResponse = await fetch(`${baseUrl}/sessions/session-123/replay`);
      const replayHtml = await replayResponse.text();
      expect(replayResponse.status).toBe(200);
      expect(replayHtml).toContain('会话回放');
      expect(replayHtml).toContain('/api/sessions/session-123/replay');

      const workflowRedirect = await fetch(`${baseUrl}/workflow`, { redirect: 'manual' });
      expect(workflowRedirect.status).toBe(302);
      expect(workflowRedirect.headers.get('location')).toBe('/');

      const historyRedirect = await fetch(`${baseUrl}/history`, { redirect: 'manual' });
      expect(historyRedirect.status).toBe(302);
      expect(historyRedirect.headers.get('location')).toBe('/sessions');

      const historyDetailRedirect = await fetch(`${baseUrl}/history/run-42`, { redirect: 'manual' });
      expect(historyDetailRedirect.status).toBe(302);
      expect(historyDetailRedirect.headers.get('location')).toBe('/sessions/run-42/replay');

      const resultsRedirect = await fetch(`${baseUrl}/results/run-42`, { redirect: 'manual' });
      expect(resultsRedirect.status).toBe(302);
      expect(resultsRedirect.headers.get('location')).toBe('/sessions/run-42/replay');
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
      const created = await readJson<any>(createResponse);
      expect(created.session.topic).toBe('Design a conversation-first product shell');
      expect(created.session.currentMode).toBe('challenge');

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}`);
      expect(getResponse.status).toBe(200);
      const loaded = await readJson<any>(getResponse);

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
      const created = await readJson<any>(createResponse);

      const switchResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
      });

      expect(switchResponse.status).toBe(200);
      const updated = await readJson<any>(switchResponse);
      expect(updated.session.currentMode).toBe('decision');

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}`);
      const loaded = await readJson<any>(getResponse);
      expect(loaded.session.currentMode).toBe('decision');
    });
  });

  it('materializes requirement-build drafts inside the active mode', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Pressure-test session message persistence', projectPath: testSessionsDir }),
      });
      const created = await readJson<any>(createResponse);

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

      expect(messageResponse.status).toBe(200);
      const accepted = await readJson<any>(messageResponse);
      expect(accepted.event.type).toBe('user_message');
      expect(accepted.event.mode).toBe('requirement-build');
      expect(accepted.modeState.draftArtifacts).toEqual(['idea', 'spec', 'acceptance', 'tasks']);
      expect(accepted.artifacts.drafts.idea.content).toContain('# Idea');

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}`);
      const loaded = await readJson<any>(getResponse);
      expect(loaded.modeState.messages).toHaveLength(5);
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
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        const firstTurnResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '先帮我拆一下这个议题。', projectPath: testSessionsDir }),
        });

        expect(firstTurnResponse.status).toBe(200);
        const firstTurn = await readJson<any>(firstTurnResponse);
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
        const secondTurn = await readJson<any>(secondTurnResponse);
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
        const created = await readJson<any>(createResponse);
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
        const decisionTurn = await readJson<any>(decisionResponse);
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
        const challengeState = await readJson<any>(challengeResponse);
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

  it('captures shared context and carries it across later modes', async () => {
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
          body: JSON.stringify({ topic: 'build a serious internal thinking tool', projectPath: testSessionsDir }),
        });
        expect(createResponse.status).toBe(201);
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        const challengeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: [
              'fact: Web is the main delivery surface',
              'constraint: No collaboration in V1',
              'source: docs/v1-boundary.md',
              'challenge this direction',
            ].join('\n'),
            projectPath: testSessionsDir,
          }),
        });

        expect(challengeResponse.status).toBe(200);
        const challengeTurn = await readJson<any>(challengeResponse);
        expect(challengeTurn.session.sharedContext.confirmedFacts).toContain('Web is the main delivery surface');
        expect(challengeTurn.session.sharedContext.hardConstraints).toContain('No collaboration in V1');
        expect(challengeTurn.session.sharedContext.sourceReferences).toContain('docs/v1-boundary.md');

        const replayAfterChallengeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/replay?projectPath=${encodeURIComponent(testSessionsDir)}`);
        expect(replayAfterChallengeResponse.status).toBe(200);
        const replayAfterChallenge = await readJson<any>(replayAfterChallengeResponse);
        const sharedContextEvent = replayAfterChallenge.events.find((event: { type: string; }) => event.type === 'shared_context_updated');
        expect(sharedContextEvent).toBeTruthy();
        expect(sharedContextEvent.confirmedFacts).toEqual(['Web is the main delivery surface']);
        expect(sharedContextEvent.hardConstraints).toEqual(['No collaboration in V1']);
        expect(sharedContextEvent.sourceReferences).toEqual(['docs/v1-boundary.md']);

        const decisionModeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
        });
        expect(decisionModeResponse.status).toBe(200);

        const decisionResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'compare the options', projectPath: testSessionsDir }),
        });

        expect(decisionResponse.status).toBe(200);
        const decisionTurn = await readJson<any>(decisionResponse);
        expect(decisionTurn.session.sharedContext.hardConstraints).toContain('No collaboration in V1');
        expect(decisionTurn.modeState.draftSummary.summary).toContain('No collaboration in V1');

        const requirementModeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
        });
        expect(requirementModeResponse.status).toBe(200);

        const requirementResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'turn this into drafts', projectPath: testSessionsDir }),
        });

        expect(requirementResponse.status).toBe(200);
        const requirementTurn = await readJson<any>(requirementResponse);
        expect(requirementTurn.session.sharedContext.confirmedFacts).toContain('Web is the main delivery surface');
        expect(requirementTurn.artifacts.drafts.idea.content).toContain('Web is the main delivery surface');
        expect(requirementTurn.artifacts.drafts.spec.content).toContain('No collaboration in V1');
      });
    } finally {
      process.env.PROVIDER_MODE = previous.mode;
      process.env.PROVIDER_TYPE = previous.type;
      process.env.MODEL_ID = previous.modelId;
    }
  });

  it('builds requirement drafts and finalizes versioned artifacts', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: '把当前讨论沉淀成需求资产', projectPath: testSessionsDir }),
      });
      const created = await readJson<any>(createResponse);
      const sessionId = created.session.sessionId;

      await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
      });

      const draftResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '请整理成 idea/spec/acceptance/tasks 四份草稿。', projectPath: testSessionsDir }),
      });

      expect(draftResponse.status).toBe(200);
      const draftResult = await readJson<any>(draftResponse);
      expect(draftResult.modeState.mode).toBe('requirement-build');
      expect(draftResult.modeState.draftArtifacts).toEqual(['idea', 'spec', 'acceptance', 'tasks']);
      expect(draftResult.artifacts.drafts.spec.content).toContain('# Spec');
      expect(draftResult.artifacts.finalized.spec).toEqual([]);

      const finalizeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/artifacts/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: testSessionsDir, note: 'baseline' }),
      });

      expect(finalizeResponse.status).toBe(200);
      const finalized = await readJson<any>(finalizeResponse);
      expect(finalized.modeState.finalArtifacts).toContain('spec:v1');
      expect(finalized.artifacts.finalized.spec[0].version).toBe(1);

      await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '补充更细的验收标准和任务拆分。', projectPath: testSessionsDir }),
      });

      const finalizeAgainResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/artifacts/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: testSessionsDir, note: 'expanded' }),
      });

      expect(finalizeAgainResponse.status).toBe(200);
      const finalizedAgain = await readJson<any>(finalizeAgainResponse);
      expect(finalizedAgain.artifacts.finalized.spec.map((item: { version: number; }) => item.version)).toEqual([1, 2]);
      expect(finalizedAgain.artifacts.finalized.spec[0].note).toBe('baseline');
      expect(finalizedAgain.artifacts.finalized.spec[1].note).toBe('expanded');
      expect(finalizedAgain.artifacts.drafts.tasks.content).toContain('# Tasks');
    });
  });



  it('falls back to legacy workflow history when replaying pre-migration records', async () => {
    const { createHistoryStore } = await import('@prodmind/asset-engine');
    const historyStore = createHistoryStore();
    await historyStore.saveRun(testSessionsDir, {
      runId: 'legacy-run-42',
      idea: 'Legacy workflow record',
      status: 'completed',
      startedAt: '2026-03-10T00:00:00.000Z',
      completedAt: '2026-03-10T00:01:00.000Z',
      phases: [
        { phase: 'challenge', status: 'completed', durationMs: 1000 },
        { phase: 'decision', status: 'completed', durationMs: 1000 },
        { phase: 'asset', status: 'completed', durationMs: 1000 },
      ],
    });
    await historyStore.saveResult(testSessionsDir, {
      runId: 'legacy-run-42',
      challenge: { artifactPath: 'challenge.md', hypothesesCount: 2 },
      decision: { artifactPath: 'assets/decision.json', recommendation: 'Keep the old record readable.' },
      assets: { projectPath: testSessionsDir, files: ['challenge.md', 'assets/decision.json'] },
    });

    await withAppServer(async (baseUrl) => {
      const replayResponse = await fetch(`${baseUrl}/api/sessions/legacy-run-42/replay?projectPath=${encodeURIComponent(testSessionsDir)}`);

      expect(replayResponse.status).toBe(200);
      const replay = await readJson<any>(replayResponse);
      expect(replay.source).toBe('legacy-workflow');
      expect(replay.legacy.run.runId).toBe('legacy-run-42');
      expect(replay.legacy.result.decision.recommendation).toBe('Keep the old record readable.');
    });
  });

  it('lists sessions by topic and last active time with fake challenge provider', async () => {
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
          body: JSON.stringify({ topic: 'one topic per session', projectPath: testSessionsDir }),
        });
        expect(createResponse.status).toBe(201);
        const created = await readJson<any>(createResponse);

        const challengeResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'challenge the framing', projectPath: testSessionsDir }),
        });
        expect(challengeResponse.status).toBe(200);

        const listResponse = await fetch(`${baseUrl}/api/sessions?projectPath=${encodeURIComponent(testSessionsDir)}`);
        expect(listResponse.status).toBe(200);

        const listed = await readJson<any>(listResponse);
        expect(Array.isArray(listed.sessions)).toBe(true);
        expect(listed.sessions[0].topic).toBe('one topic per session');
        expect(listed.sessions[0].lastActiveAt).toBeTruthy();
      });
    } finally {
      process.env.PROVIDER_MODE = previous.mode;
      process.env.PROVIDER_TYPE = previous.type;
      process.env.MODEL_ID = previous.modelId;
    }
  });

  it('reopens a session replay with full timeline and finalized outputs using fake provider', async () => {
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
          body: JSON.stringify({ topic: 'replay the full session', projectPath: testSessionsDir }),
        });
        expect(createResponse.status).toBe(201);
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        const challengeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'pressure test the idea', projectPath: testSessionsDir }),
        });
        expect(challengeResponse.status).toBe(200);

        const modeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
        });
        expect(modeResponse.status).toBe(200);

        const draftResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'turn this into requirement drafts', projectPath: testSessionsDir }),
        });
        expect(draftResponse.status).toBe(200);

        const finalizeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/artifacts/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: testSessionsDir, note: 'baseline' }),
        });
        expect(finalizeResponse.status).toBe(200);

        const replayResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/replay?projectPath=${encodeURIComponent(testSessionsDir)}`);
        expect(replayResponse.status).toBe(200);

        const replay = await readJson<any>(replayResponse);
        expect(replay.source).toBe('session');
        expect(replay.session.sessionId).toBe(sessionId);
        expect(replay.events.some((event: { type: string; }) => event.type === 'mode_switched')).toBe(true);
        expect(replay.events.some((event: { type: string; }) => event.type === 'artifact_finalized')).toBe(true);
        expect(replay.modeStates['requirement-build'].finalArtifacts).toContain('spec:v1');
      });
    } finally {
      process.env.PROVIDER_MODE = previous.mode;
      process.env.PROVIDER_TYPE = previous.type;
      process.env.MODEL_ID = previous.modelId;
    }
  });
});

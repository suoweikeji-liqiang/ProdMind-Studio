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
    expect(sessionHtml).toContain('href="#mainContent"');
    expect(sessionHtml).toContain('id="mainContent"');
    expect(sessionHtml).toContain('当前模式');
    expect(sessionHtml).toContain('当前模式草稿');
    expect(sessionHtml).toContain('草稿产物');
    expect(sessionHtml).toContain('已定稿版本');
    expect(sessionHtml).toContain('/api/sessions/session-42');
    expect(sessionHtml).toContain('id="sessionMessageForm"');
    expect(sessionHtml).toContain('id="sessionMessageInput"');
    expect(sessionHtml).toContain('id="sessionComposerError"');
    expect(sessionHtml).toContain('id="debugLogPanel"');
    expect(sessionHtml).toContain('id="debugLogList"');
    expect(sessionHtml).toContain('id="sharedContextPanel"');
    expect(sessionHtml).toContain('id="finalizeArtifactsButton"');
    expect(sessionHtml).toContain('/api/sessions/session-42/messages');
    expect(sessionHtml).toContain('/api/sessions/session-42/mode');
    expect(sessionHtml).toContain('/api/sessions/session-42/artifacts/finalize');
    expect(sessionHtml).toContain("document.getElementById('sessionSendButton').disabled = disabled;");
    expect(sessionHtml).toContain("window.addEventListener('error'");
    expect(sessionHtml).toContain("window.addEventListener('unhandledrejection'");
    expect(sessionHtml).toContain("appendDebugLog('click', 'sessionSendButton clicked')");
    expect(sessionHtml).toContain("appendDebugLog('request'");
    expect(sessionHtml).toContain("appendDebugLog('response'");
    expect(sessionHtml).toContain("appendDebugLog('catch'");
    expect(sessionHtml).toContain('质疑模式通常需要 20-60 秒');
    expect(sessionHtml).toContain('正在生成本轮输出…');
    expect(sessionHtml).toContain('通常需要 20-60 秒');
    expect(sessionHtml).toContain('质疑模式');
    expect(sessionHtml).toContain('裁决模式');
    expect(sessionHtml).toContain('需求共建模式');
    expect(sessionHtml).toContain('只在需求共建模式下启用');
    expect(sessionHtml).toContain('aria-live="polite"');

    const historyHtml = renderSessionHistoryPage();
    expect(historyHtml).toContain('会话历史');
    expect(historyHtml).toContain('按议题回看');
    expect(historyHtml).toContain('id="sessionHistoryGuide"');
    expect(historyHtml).toContain('/api/sessions');

    const replayHtml = renderSessionReplayPage('session-42');
    expect(replayHtml).toContain('会话回放');
    expect(replayHtml).toContain('session-42');
    expect(replayHtml).toContain('/api/sessions/session-42/replay');
    expect(replayHtml).toContain('id="replayResumePanel"');
    expect(replayHtml).toContain('/sessions/session-42');
    expect(replayHtml).toContain('共享底座更新');
    expect(replayHtml).toContain("event.type === 'phase_transition'");
    expect(replayHtml).toContain('阶段推进');
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

  it('advances requirement-build at artifact level inside the active mode', async () => {
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

      const goalResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Generate requirement assets for this direction.',
          action: 'artifact_goal',
          projectPath: testSessionsDir,
        }),
      });

      expect(goalResponse.status).toBe(200);
      const goalAccepted = await readJson<any>(goalResponse);
      expect(goalAccepted.event.type).toBe('user_message');
      expect(goalAccepted.event.mode).toBe('requirement-build');
      expect(goalAccepted.session.currentPhase).toBe('waiting_user_artifact_selection');
      expect(goalAccepted.session.requiredUserAction).toBe('请选择要推进的产物层级：想法、规格、验收或任务。');
      expect(goalAccepted.modeState.draftArtifacts).toEqual([]);
      expect(Object.keys(goalAccepted.artifacts.drafts)).toEqual([]);
      expect(goalAccepted.modeState.messages.at(-1)?.content).not.toContain('requirement 目标');
      expect(goalAccepted.modeState.messages.at(-1)?.content).not.toContain('action=artifact_selection');

      const selectionResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'spec',
          action: 'artifact_selection',
          projectPath: testSessionsDir,
        }),
      });

      expect(selectionResponse.status).toBe(200);
      const selected = await readJson<any>(selectionResponse);
      expect(selected.session.currentPhase).toBe('waiting_user_draft_revision');
      expect(selected.session.lastCompletedStep).toBe('已生成规格草稿');
      expect(selected.modeState.draftArtifacts).toEqual(['spec']);
      expect(Object.keys(selected.artifacts.drafts)).toEqual(['spec']);
      expect(selected.artifacts.drafts.spec.content).toContain('# 规格草稿');
      expect(selected.artifacts.drafts.spec.content).not.toContain('## Project');
      expect(selected.artifacts.drafts.spec.content).not.toContain('## Projection');
      expect(selected.artifacts.drafts.spec.content).not.toContain('## Compression');
      expect(selected.artifacts.drafts.spec.content).not.toContain('"hardConstraints"');
      expect(selected.artifacts.drafts.spec.content).not.toContain('"confirmedFacts"');
      expect(selected.artifacts.drafts.spec.content).not.toContain('"sourceReferences"');
      expect(selected.modeState.draftSummary.summary).not.toContain('requirement-build');
    });
  });

  it('lists resumability metadata in session history api responses', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Resume this requirement flow', projectPath: testSessionsDir }),
      });
      const created = await readJson<any>(createResponse);

      await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
      });

      await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Generate requirement assets for this direction.',
          action: 'artifact_goal',
          projectPath: testSessionsDir,
        }),
      });

      await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'spec',
          action: 'artifact_selection',
          projectPath: testSessionsDir,
        }),
      });

      const historyResponse = await fetch(`${baseUrl}/api/sessions?projectPath=${encodeURIComponent(testSessionsDir)}`);
      expect(historyResponse.status).toBe(200);
      const historyPayload = await readJson<any>(historyResponse);
      const first = historyPayload.sessions[0];

      expect(first.currentPhase).toBeTruthy();
      expect(first.requiredUserAction).toBeTruthy();
      expect(first.interactionState).toBeTruthy();
      expect(first.hasDraftArtifacts).toBe(true);
      expect(first.hasFinalizedArtifacts).toBe(false);
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
          body: JSON.stringify({ topic: '鎶?CLI V1 杩佺Щ涓轰腑鏂?Web 鎬濈淮宸ュ叿', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        // Round 1: Step 1 - raw_topic triggers architect framing
        const step1 = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鍏堝府鎴戞媶涓€涓嬭繖涓棰樸€?', action: 'raw_topic', projectPath: testSessionsDir }),
        });
        expect(step1.status).toBe(200);
        const r1s1 = await readJson<any>(step1);
        expect(r1s1.session.currentPhase).toBe('waiting_user_problem_correction');
        expect(r1s1.modeState.messages.filter((m: any) => m.speaker === 'role')).toHaveLength(1);

        // Round 1: Step 2 - problem_correction triggers objections
        const step2 = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '闂瀹氫箟鐪嬭捣鏉ュ悎鐞嗐€?', action: 'problem_correction', projectPath: testSessionsDir }),
        });
        const r1s2 = await readJson<any>(step2);
        expect(r1s2.session.currentPhase).toBe('waiting_user_objection_response');
        expect(r1s2.modeState.messages.filter((m: any) => m.speaker === 'role')).toHaveLength(3);

        // Round 1: Step 3 - objection_response triggers grounding
        const step3 = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '这些质疑里有一部分成立，但我认为真正的问题仍然是资料分散和消息脱节，因为这会让跨角色判断持续丢失，而且现有做法无法稳定追踪。',
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });
        const r1s3 = await readJson<any>(step3);
        expect(r1s3.session.currentPhase).toBe('waiting_round_decision');
        expect(r1s3.modeState.messages.filter((m: any) => m.speaker === 'role')).toHaveLength(4);
        expect(r1s3.modeState.draftSummary.summary).toContain('第 1 轮');
        expect(r1s3.modeState.draftSummary.summary).toContain('4 个角色发言');

        // Round 2: Start new round
        const r2step1 = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鐢ㄦ埛鍏跺疄涓昏鏄骇鍝佺粡鐞嗭紝涓嶆槸寮€鍙戙€?', action: 'raw_topic', projectPath: testSessionsDir }),
        });
        const r2s1 = await readJson<any>(r2step1);
        expect(r2s1.session.currentPhase).toBe('waiting_user_problem_correction');
        expect(r2s1.modeState.messages.filter((m: any) => m.speaker === 'role')).toHaveLength(5);
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
          body: JSON.stringify({ topic: '鍦ㄤ竴涓細璇濋噷鍒囨崲 challenge 鍜?decision', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        // Complete one challenge round using new multi-step API
        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鍏堝仛涓€杞?challenge銆?', action: 'raw_topic', projectPath: testSessionsDir }),
        });
        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '纭闂瀹氫箟銆?', action: 'problem_correction', projectPath: testSessionsDir }),
        });
        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '我会直接回应这些质疑：团队真正缺的不是一个漂亮界面，而是围绕议题沉淀判断、记录分歧并持续推进的共同工作面，这一点现在仍然缺失。',
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });

        const switchResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
        });
        expect(switchResponse.status).toBe(200);

        // Decision mode still uses old single-pass API (Task 3 not yet implemented)
        const decisionResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鐜板湪璇风粰鍑哄喅绛栧缓璁€?', projectPath: testSessionsDir }),
        });

        expect(decisionResponse.status).toBe(200);
        const decisionTurn = await readJson<any>(decisionResponse);
        expect(decisionTurn.modeState.mode).toBe('decision');
        expect(decisionTurn.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'user')).toHaveLength(1);

        await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'challenge', projectPath: testSessionsDir }),
        });

        const challengeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}`);
        const challengeState = await readJson<any>(challengeResponse);
        expect(challengeState.modeState.mode).toBe('challenge');
        expect(challengeState.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'user')).toHaveLength(3);
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

        const requirementGoalResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'turn this into drafts',
            action: 'artifact_goal',
            projectPath: testSessionsDir,
          }),
        });
        expect(requirementGoalResponse.status).toBe(200);

        const requirementSelectionResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'idea',
            action: 'artifact_selection',
            projectPath: testSessionsDir,
          }),
        });

        expect(requirementSelectionResponse.status).toBe(200);
        const requirementTurn = await readJson<any>(requirementSelectionResponse);
        expect(requirementTurn.session.sharedContext.confirmedFacts).toContain('Web is the main delivery surface');
        expect(requirementTurn.artifacts.drafts.idea.content).toContain('Web is the main delivery surface');
        expect(requirementTurn.artifacts.drafts.idea.content).toContain('No collaboration in V1');
        expect(requirementTurn.artifacts.drafts.spec).toBeUndefined();
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
        body: JSON.stringify({ topic: 'Build requirement artifacts incrementally', projectPath: testSessionsDir }),
      });
      const created = await readJson<any>(createResponse);
      const sessionId = created.session.sessionId;

      await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
      });

      const goalResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Prepare requirement artifacts for implementation.',
          action: 'artifact_goal',
          projectPath: testSessionsDir,
        }),
      });
      expect(goalResponse.status).toBe(200);

      const draftResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'spec',
          action: 'artifact_selection',
          projectPath: testSessionsDir,
        }),
      });

      expect(draftResponse.status).toBe(200);
      const draftResult = await readJson<any>(draftResponse);
      expect(draftResult.modeState.mode).toBe('requirement-build');
      expect(draftResult.modeState.draftArtifacts).toEqual(['spec']);
      expect(draftResult.artifacts.drafts.spec.content).toContain('# 规格草稿');
      expect(draftResult.artifacts.drafts.idea).toBeUndefined();
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
        body: JSON.stringify({
          content: 'Please add more acceptance-oriented details to the current spec draft.',
          action: 'draft_revision',
          projectPath: testSessionsDir,
        }),
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
      expect(finalizedAgain.artifacts.drafts.spec.content).toContain('# 规格草稿');
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

        const goalResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'turn this into requirement drafts',
            action: 'artifact_goal',
            projectPath: testSessionsDir,
          }),
        });
        expect(goalResponse.status).toBe(200);

        const draftResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'spec',
            action: 'artifact_selection',
            projectPath: testSessionsDir,
          }),
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

describe('Web Session Phase Metadata (Task 1)', () => {
  it('formats phase/status/action/step labels for Chinese session UI instead of leaking raw English metadata', async () => {
    const {
      formatSessionPhaseLabel,
      formatSessionStatusLabel,
      formatSessionActionLabel,
      formatSessionLastStepLabel,
      formatTimelineSpeakerLabel,
    } = await import('../src/views/index.js');

    expect(formatSessionPhaseLabel('waiting_user_problem_correction')).toBe('等待你修正问题定义');
    expect(formatSessionStatusLabel('active')).toBe('进行中');
    expect(formatSessionActionLabel('Confirm or correct the problem framing.')).toBe('请确认或修正问题定义。');
    expect(formatSessionLastStepLabel('architect framing completed')).toBe('架构师已完成问题定义');
    expect(formatSessionLastStepLabel('mode switched to challenge')).toBe('已切换到质疑模式');
    expect(formatTimelineSpeakerLabel({ speaker: 'role', roleId: 'assassin', roleName: 'assassin' })).toBe('刺客');
  });

  it('exposes currentPhase and requiredUserAction in session creation response', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test phase metadata', projectPath: testSessionsDir }),
      });

      expect(createResponse.status).toBe(201);
      const created = await readJson<any>(createResponse);
      expect(created.session.currentPhase).toBe('topic_submitted');
      expect(created.session.requiredUserAction).toBeTruthy();
      expect(created.session.interactionState).toBe('waiting_user_input');
    });
  });

  it('exposes currentPhase and requiredUserAction when getting a session', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test phase metadata get', projectPath: testSessionsDir }),
      });
      const created = await readJson<any>(createResponse);

      const getResponse = await fetch(`${baseUrl}/api/sessions/${created.session.sessionId}?projectPath=${encodeURIComponent(testSessionsDir)}`);
      expect(getResponse.status).toBe(200);
      const loaded = await readJson<any>(getResponse);
      expect(loaded.session.currentPhase).toBe('topic_submitted');
      expect(loaded.session.requiredUserAction).toBeTruthy();
      expect(loaded.session.interactionState).toBe('waiting_user_input');
    });
  });

  it('renders phase banner and composer label in session page', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('session-phase-test');
    expect(html).toContain('id="sessionPhaseBanner"');
    expect(html).toContain('id="sessionComposerLabel"');
    expect(html).toContain('currentPhase');
    expect(html).toContain('requiredUserAction');
    expect(html).toContain('interactionState');
    expect(html).toContain('formatSessionPhaseLabel');
    expect(html).toContain('formatSessionStatusLabel');
    expect(html).toContain('formatSessionActionLabel');
    expect(html).toContain('formatSessionLastStepLabel');
    expect(html).toContain('function artifactLabel(');
    expect(html).toContain('要求整理成想法、规格、验收或任务草稿');
    expect(html).toContain('content: artifactLabel(actionValue)');
  });

  it('renders a three-column challenge workbench with rails, focus card and anchored composer', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('session-ui-overhaul');

    expect(html).toContain('class="section-header session-toolbar"');
    expect(html).toContain('id="challengeHistoryRail"');
    expect(html).toContain('id="challengeCenterWorkbench"');
    expect(html).toContain('id="challengeTopicBriefRail"');
    expect(html).toContain('id="challengeFocusCard"');
    expect(html).toContain('id="challengeRoundSummaryToggle"');
    expect(html).toContain('id="challengeHistoryPreview"');
    expect(html).toContain('id="challengeTopicAnchorPanel"');
    expect(html).toContain('id="challengeConflictPanel"');
    expect(html).toContain('id="challengeWorkbenchComposer"');
    expect(html).toContain('id="challengeComposerFooter"');
    expect(html).not.toContain('<h1>会话</h1>');
    expect(html).not.toContain('<h2>工作流摘要</h2>');
    expect(html).not.toContain('<h2>前端调试日志</h2>');
  });

  it('wires focus action templates and context toggles into the challenge workbench script', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-interrupt-test');

    expect(html).toContain('function renderChallengeFocusActions(');
    expect(html).toContain('data-focus-action-template="');
    expect(html).toContain('data-focus-input-label="');
    expect(html).toContain('data-focus-placeholder="');
    expect(html).toContain("document.getElementById('challengeFocusActions').addEventListener('click'");
    expect(html).toContain("document.getElementById('challengeRoundSummaryToggle').addEventListener('click'");
    expect(html).toContain("document.getElementById('challengeHistoryNav').addEventListener('click'");
  });

  it('keeps challenge inline script escapes intact for browser execution', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-script-escape-test');

    expect(html).toContain(".replaceAll(/\\r/g, '')");
    expect(html).toContain(".split('\\n')");
    expect(html).toContain(".replaceAll(/^#+\\s*/g, '')");
    expect(html).toContain(".replaceAll(/^-\\s*/g, '')");
    expect(html).toContain(".replaceAll('\\n', '<br>')");
  });

  it('pins challenge rails to the first grid row so side context does not fall below the center workbench', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-grid-placement-test');

    expect(html).toContain('body.challenge-mode #challengeWorkbenchShell {');
    expect(html).toContain('grid-row: 1 / span 3;');
    expect(html).toContain('body.challenge-mode #challengeWorkbenchComposer {');
    expect(html).toContain('grid-row: 1;');
    expect(html).toContain('body.challenge-mode #challengeTopicBriefRail {');
    expect(html).toContain('grid-column: 3;');
  });

  it('uses a compact challenge header and keeps the center input footer in normal page flow', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-scroll-behavior-test');

    expect(html).toContain('.session-toolbar {');
    expect(html).toContain('body.challenge-mode .session-toolbar {');
    expect(html).toContain('body.challenge-mode #challengeInlineTopic {');
    expect(html).toContain('background: transparent;');
    expect(html).toContain('body.challenge-mode #challengeComposerFooter {');
    expect(html).toContain('position: static;');
    expect(html).toContain('body.challenge-mode #sessionMessageInput {');
    expect(html).toContain('min-height: 112px;');
    expect(html).toContain('.challenge-composer-footer {');
    expect(html).toContain('body.challenge-mode #challengeWorkbenchComposer {');
    expect(html).toContain('align-self: start;');
    expect(html).toContain('body.challenge-mode #challengeTopicBriefRail {');
    expect(html).toContain('max-height: calc(100vh - 40px);');
    expect(html).toContain('overflow-y: auto;');
  });

  it('uses a topic intake compact layout that hides empty scaffolding on the first challenge screen', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-topic-intake-compact-test');

    expect(html).toContain("document.body.classList.toggle('challenge-topic-intake', isTopicIntake);");
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeCurrentRound {');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeHistoryInspector {');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeHistoryNav {');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeFramingCard {');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeConflictCard {');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #sessionTimelinePanel,');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeWorkbenchShell {');
    expect(html).toContain('position: static;');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #challengeTopicBriefRail {');
    expect(html).toContain('max-height: none;');
    expect(html).toContain('body.challenge-mode.challenge-topic-intake #sessionMessageInput {');
    expect(html).toContain('min-height: 96px;');
  });

  it('uses location-independent challenge guidance copy in the session shell', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-copy-test');

    expect(html).not.toContain('请回应上面的质疑。');
    expect(html).not.toContain('必须先处理上面的分歧');
  });

  it('auto-starts the first challenge round from the homepage topic instead of asking for duplicate input', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-auto-kickoff-test');

    expect(html).toContain('function shouldAutoStartChallengeTopic(');
    expect(html).toContain("data.session.currentPhase === 'topic_submitted'");
    expect(html).toContain("content: data.session.topic");
    expect(html).toContain("action: 'raw_topic'");
    expect(html).toContain('正在根据首页议题启动第一轮');
    expect(html).toContain("composerInput.value = data.session.topic");
  });

  it('hides collapsed challenge context correctly and renders current/history context with markdown instead of raw symbols', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-context-render-test');

    expect(html).toContain('.challenge-context-list[hidden] {');
    expect(html).toContain('display: none;');
    expect(html).toContain("typeof renderMarkdown === 'function' ? renderMarkdown(item.content || '')");
    expect(html).not.toContain("escapeHtml(item.content || '').replaceAll('\\\\n', '<br>')");
  });

  it('keeps next-round challenge copy explicit that this continues the current session rather than opening a new one', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-next-round-copy-test');

    expect(html).toContain('进入下一轮追问');
    expect(html).toContain('仍在当前会话里');
    expect(html).toContain('下一轮要继续验证的追问');
  });

  it('renders strict challenge guard rails for focus-action selection, minimum response length and round caps', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('challenge-strict-guard-test');

    expect(html).toContain('id="sessionMessageFocusAction"');
    expect(html).toContain('focusActionInput.value = target.dataset.focusAction ||');
    expect(html).toContain('至少 50 字');
    expect(html).toContain('已达到质疑模式最大 5 轮');
  });
});

describe('Web Challenge Mode Checkpoints (Task 2)', () => {
  const previous: Record<string, string | undefined> = {};
  const longChallengeResponse = '这个回应会逐条说明为什么当前质疑只部分成立，并补充真实案例、限制条件和仍需验证的证据，以便继续判断是否真的值得推进。';

  function useFakeProvider() {
    previous.mode = process.env.PROVIDER_MODE;
    previous.type = process.env.PROVIDER_TYPE;
    previous.modelId = process.env.MODEL_ID;
    process.env.PROVIDER_MODE = 'fake';
    process.env.PROVIDER_TYPE = 'openai';
    process.env.MODEL_ID = 'fake-model';
  }

  function restoreProvider() {
    process.env.PROVIDER_MODE = previous.mode;
    process.env.PROVIDER_TYPE = previous.type;
    process.env.MODEL_ID = previous.modelId;
  }

  it('step 1: raw_topic submission only runs architect framing and sets phase to waiting_user_problem_correction', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '濡備綍鏀瑰杽鍐呴儴鍥㈤槦鐨勫喅绛栬川閲?', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        const step1Response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '杩欐槸鎴戠殑鍒濆璁銆?', action: 'raw_topic', projectPath: testSessionsDir }),
        });

        expect(step1Response.status).toBe(200);
        const step1 = await readJson<any>(step1Response);
        // Phase must advance to waiting_user_problem_correction
        expect(step1.session.currentPhase).toBe('waiting_user_problem_correction');
        // Only architect message should be present (not assassin/userGhost/grounder yet)
        const roleMessages = step1.modeState.messages.filter((m: { speaker: string }) => m.speaker === 'role');
        expect(roleMessages).toHaveLength(1);
        expect(roleMessages[0].roleId).toBe('architect');
        // requiredUserAction should indicate user should correct/confirm the problem framing
        expect(step1.session.requiredUserAction).toBeTruthy();
      });
    } finally {
      restoreProvider();
    }
  });

  it('step 2: problem_correction triggers objection generation and sets phase to waiting_user_objection_response', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '澶氳疆瀵硅瘽涓庡喅绛栬川閲?', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        // Step 1: submit raw topic
        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鎴戞兂鏀瑰杽鍥㈤槦鍐崇瓥銆?', action: 'raw_topic', projectPath: testSessionsDir }),
        });

        // Step 2: user corrects problem definition
        const step2Response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '闂瀹氫箟鏄細鍥㈤槦缂哄皯鍏卞悓鐨勫彇鑸嶅垽鏂鏋讹紝瀵艰嚧鍐崇瓥婕傜Щ銆?',
            action: 'problem_correction',
            projectPath: testSessionsDir,
          }),
        });

        expect(step2Response.status).toBe(200);
        const step2 = await readJson<any>(step2Response);
        expect(step2.session.currentPhase).toBe('waiting_user_objection_response');
        expect(step2.session.requiredUserAction).toBe('请直接回应当前轮中的关键质疑。');
        // assassin and userGhost should now be present
        const roleMessages = step2.modeState.messages.filter((m: { speaker: string }) => m.speaker === 'role');
        const roleIds = roleMessages.map((m: { roleId: string }) => m.roleId);
        expect(roleIds).toContain('assassin');
        expect(roleIds).toContain('userGhost');
      });
    } finally {
      restoreProvider();
    }
  });

  it('step 3: objection_response triggers grounding and sets phase to waiting_round_decision', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '涓夋 challenge 娴佺▼楠岃瘉', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鎴戠殑璁銆?', action: 'raw_topic', projectPath: testSessionsDir }),
        });

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '鏍告鍚庣殑闂瀹氫箟銆?', action: 'problem_correction', projectPath: testSessionsDir }),
        });

        const step3Response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '我认为刺客的反驳并不完全成立，因为团队现在的问题不是多一个管理界面，而是资料和判断依据持续散落；用户幽灵的担忧我接受一部分，但这恰好说明需要把推进过程显式化。',
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });

        if (step3Response.status !== 200) {
          console.error("STEP 3 FAILED:", await step3Response.text());
        }
        expect(step3Response.status).toBe(200);
        const step3 = await readJson<any>(step3Response);
        expect(step3.session.currentPhase).toBe('waiting_round_decision');
        const roleIds = step3.modeState.messages
          .filter((m: { speaker: string }) => m.speaker === 'role')
          .map((m: { roleId: string }) => m.roleId);
        expect(roleIds).toContain('grounder');
      });
    } finally {
      restoreProvider();
    }
  });
  it('routes tech-escape responses into an interrupt phase instead of normal round resolution', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '验证 tech escape 中断态', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '先抛一个问题', action: 'raw_topic', projectPath: testSessionsDir }),
        });

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '确认问题定义', action: 'problem_correction', projectPath: testSessionsDir }),
        });

        const interruptResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'AI 可以缩短周期并降低成本，技术已经成熟，所以这不是问题；只要把模型接进流程里，资料分散、消息脱节和跨角色协作这些阻塞自然都会被解决掉。',
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });

        expect(interruptResponse.status).toBe(200);
        const interrupted = await readJson<any>(interruptResponse);
        expect(interrupted.session.currentPhase).toBe('waiting_tech_escape_response');
        expect(interrupted.session.interactionState).toBe('blocked');
        expect(interrupted.session.nextRecommendedMode).toBeUndefined();
        expect(interrupted.conflicts.some((conflict: { type: string; }) => conflict.type === 'tech_escape')).toBe(true);
      });
    } finally {
      restoreProvider();
    }
  });

  it('rejects short objection responses so challenge mode keeps the CLI minimum-length discipline', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '验证 challenge 最短回应长度', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '先抛一个问题', action: 'raw_topic', projectPath: testSessionsDir }),
        });

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '确认问题定义', action: 'problem_correction', projectPath: testSessionsDir }),
        });

        const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '太短了',
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });

        expect(response.status).toBe(400);
        const payload = await readJson<any>(response);
        expect(payload.error).toContain('至少 50 字');
      });
    } finally {
      restoreProvider();
    }
  });

  it('requires an explicit interrupt handling path before submitting a tech-escape response', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '验证 challenge 中断态处理路径', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '先抛一个问题', action: 'raw_topic', projectPath: testSessionsDir }),
        });

        await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: '确认问题定义', action: 'problem_correction', projectPath: testSessionsDir }),
        });

        const interruptResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'AI 可以缩短周期并降低成本，技术已经成熟，所以这不是问题；只要把模型接进流程里，资料分散、消息脱节和跨角色协作这些阻塞自然都会被解决掉。',
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });
        expect(interruptResponse.status).toBe(200);

        const missingPathResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: longChallengeResponse,
            action: 'objection_response',
            projectPath: testSessionsDir,
          }),
        });

        expect(missingPathResponse.status).toBe(400);
        const missingPathPayload = await readJson<any>(missingPathResponse);
        expect(missingPathPayload.error).toContain('先选择一种处理路径');

        const resolvedResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: longChallengeResponse,
            action: 'objection_response',
            focusAction: 'business_goal',
            projectPath: testSessionsDir,
          }),
        });

        expect(resolvedResponse.status).toBe(200);
      });
    } finally {
      restoreProvider();
    }
  });

  it('stops challenge after five completed rounds and refuses to open a sixth round', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '验证 challenge 五轮封顶', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        for (let round = 0; round < 5; round += 1) {
          const topicContent = round === 0 ? '第 1 轮原始议题' : `第 ${round + 1} 轮继续追问`;
          const rawResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: topicContent, action: 'raw_topic', projectPath: testSessionsDir }),
          });
          expect(rawResponse.status).toBe(200);

          const correctionResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `第 ${round + 1} 轮修正问题定义`, action: 'problem_correction', projectPath: testSessionsDir }),
          });
          expect(correctionResponse.status).toBe(200);

          const groundingResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: longChallengeResponse,
              action: 'objection_response',
              projectPath: testSessionsDir,
            }),
          });
          expect(groundingResponse.status).toBe(200);
          const grounded = await readJson<any>(groundingResponse);

          expect(grounded.session.currentPhase).toBe('waiting_round_decision');
          if (round < 4) {
            const nextRoundResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: '进入下一轮追问',
                action: 'round_resolution',
                projectPath: testSessionsDir,
              }),
            });
            expect(nextRoundResponse.status).toBe(200);
          } else {
            expect(grounded.session.requiredUserAction).toContain('最大 5 轮');
          }
        }

        const blockedResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '进入下一轮追问',
            action: 'round_resolution',
            projectPath: testSessionsDir,
          }),
        });

        expect(blockedResponse.status).toBe(409);
        const blockedPayload = await readJson<any>(blockedResponse);
        expect(blockedPayload.error).toContain('最大 5 轮');
      });
    } finally {
      restoreProvider();
    }
  });
});

describe('Web Decision Mode Checkpoints (Task 3)', () => {
  const previous: Record<string, string | undefined> = {};

  function useFakeProvider() {
    previous.mode = process.env.PROVIDER_MODE;
    previous.type = process.env.PROVIDER_TYPE;
    previous.modelId = process.env.MODEL_ID;
    process.env.PROVIDER_MODE = 'fake';
    process.env.PROVIDER_TYPE = 'openai';
    process.env.MODEL_ID = 'fake-model';
  }

  function restoreProvider() {
    process.env.PROVIDER_MODE = previous.mode;
    process.env.PROVIDER_TYPE = previous.type;
    process.env.MODEL_ID = previous.modelId;
  }

  it('switching into decision resets the session shell to decision phase metadata', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '从 challenge 切到 decision', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        const switchResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
        });

        expect(switchResponse.status).toBe(200);
        const switched = await readJson<any>(switchResponse);
        expect(switched.session.currentMode).toBe('decision');
        expect(switched.session.currentPhase).toBe('decision_prompt_submitted');
        expect(switched.session.requiredUserAction).toBeTruthy();
        expect(switched.session.nextRecommendedMode).toBeUndefined();
        expect(switched.session.modeTransitionWarning).toContain('质疑模式');
        expect(switched.session.recommendedRollbackMode).toBe('challenge');
      });
    } finally {
      restoreProvider();
    }
  });

  it('decision messages advance frame -> tradeoff -> recommendation instead of running a full legacy pass', async () => {
    useFakeProvider();
    try {
      await withAppServer(async (baseUrl) => {
        const createResponse = await fetch(`${baseUrl}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '是否要自建公司管理系统', projectPath: testSessionsDir }),
        });
        const created = await readJson<any>(createResponse);
        const sessionId = created.session.sessionId;

        await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'decision', projectPath: testSessionsDir }),
        });

        const step1Response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '我们要不要做自己的内部管理系统',
            action: 'decision_problem',
            projectPath: testSessionsDir,
          }),
        });
        expect(step1Response.status).toBe(200);
        const step1 = await readJson<any>(step1Response);
        expect(step1.session.currentPhase).toBe('waiting_user_frame_confirmation');
        expect(step1.modeState.messages.filter((message: { speaker: string; }) => message.speaker === 'role')).toHaveLength(1);
        expect(step1.modeState.messages.at(-1)?.roleId).toBe('solution');
        expect(step1.modeState.messages.some((message: { roleId?: string; }) => message.roleId === 'verdict')).toBe(false);

        const step2Response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '候选项里补上买现成系统，约束要加预算和实施周期',
            action: 'frame_correction',
            projectPath: testSessionsDir,
          }),
        });
        expect(step2Response.status).toBe(200);
        const step2 = await readJson<any>(step2Response);
        expect(step2.session.currentPhase).toBe('waiting_user_priority_adjustment');
        expect(step2.modeState.messages.at(-1)?.roleId).toBe('tradeoff');

        const step3Response = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '优先级是实施速度、后续可扩展性、总成本',
            action: 'priority_adjustment',
            projectPath: testSessionsDir,
          }),
        });
        expect(step3Response.status).toBe(200);
        const step3 = await readJson<any>(step3Response);
        expect(step3.session.currentPhase).toBe('waiting_decision_resolution');
        expect(step3.session.interactionState).toBe('ready_to_finalize');
        expect(step3.modeState.messages.at(-1)?.roleId).toBe('verdict');
        expect(step3.session.nextRecommendedMode).toBe('requirement-build');
      });
    } finally {
      restoreProvider();
    }
  });
});

describe('Web Requirement Build Finalization (Task 4)', () => {
  it('finalization_note creates a real artifact version and updates finalArtifacts', async () => {
    await withAppServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: '把想法沉淀成 spec', projectPath: testSessionsDir }),
      });
      const created = await readJson<any>(createResponse);
      const sessionId = created.session.sessionId;

      await fetch(`${baseUrl}/api/sessions/${sessionId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'requirement-build', projectPath: testSessionsDir }),
      });

      await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '请先从 spec 开始',
          action: 'artifact_goal',
          projectPath: testSessionsDir,
        }),
      });

      await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'spec',
          action: 'artifact_selection',
          projectPath: testSessionsDir,
        }),
      });

      const finalizeResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'baseline',
          action: 'finalization_note',
          projectPath: testSessionsDir,
        }),
      });

      expect(finalizeResponse.status).toBe(200);
      const finalized = await readJson<any>(finalizeResponse);
      expect(finalized.session.currentPhase).toBe('artifact_finalized');
      expect(finalized.session.interactionState).toBe('ready_to_finalize');
      expect(finalized.modeState.finalArtifacts).toContain('spec:v1');
      expect(finalized.artifacts.finalized.spec).toHaveLength(1);
      expect(finalized.artifacts.finalized.spec[0].note).toBe('baseline');
    });
  });
});

describe('Web Cross-Mode Guidance (Task 5)', () => {
  it('renders explicit warning and rollback guidance placeholders in the session page shell', async () => {
    const { renderSessionPage } = await import('../src/views/index.js');
    const html = renderSessionPage('session-guidance-test');
    expect(html).toContain('id="sessionModeWarning"');
    expect(html).toContain('id="sessionRollbackHint"');
  });
});



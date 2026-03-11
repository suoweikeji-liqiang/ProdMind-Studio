function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const layout = (title: string, content: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - ProdMind Studio</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --surface: #fffdf8;
      --surface-strong: #f7efe0;
      --ink: #1f2933;
      --muted: #5b6671;
      --line: #d7c7aa;
      --accent: #0f766e;
      --accent-soft: #d6f3ef;
      --danger: #991b1b;
      --danger-soft: #fee2e2;
      --success: #166534;
      --success-soft: #dcfce7;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: linear-gradient(180deg, #fbf8f2 0%, #f4f1ea 55%, #ece6d8 100%);
      color: var(--ink);
    }
    a { color: inherit; }
    nav {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 253, 248, 0.9);
      backdrop-filter: blur(8px);
    }
    nav .brand { font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 12px; }
    nav .links { display: flex; gap: 14px; flex-wrap: wrap; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.05; }
    h2 { margin: 0 0 12px; font-size: 1.35rem; }
    h3 { margin: 0 0 10px; font-size: 1rem; color: #423b2e; }
    p { line-height: 1.6; color: var(--muted); }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--surface-strong);
      color: #6b4f1d;
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
      gap: 20px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    .card {
      background: rgba(255, 253, 248, 0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 20px;
      box-shadow: 0 18px 45px rgba(56, 47, 33, 0.08);
    }
    .hero .card:first-child {
      padding: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .stack { display: grid; gap: 16px; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      text-transform: capitalize;
    }
    .status.queued,
    .status.running_challenge,
    .status.running_decision,
    .status.running_assets {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .status.completed {
      background: var(--success-soft);
      color: var(--success);
    }
    .status.failed {
      background: var(--danger-soft);
      color: var(--danger);
    }
    .status.active {
      background: var(--accent-soft);
      color: var(--accent);
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 18px;
    }
    .button,
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 16px;
      border-radius: 999px;
      border: none;
      background: #1d4d4f;
      color: white;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .button.secondary {
      background: transparent;
      color: #423b2e;
      border: 1px solid var(--line);
    }
    .section { margin: 24px 0; }
    .section-header { margin-bottom: 12px; }
    label { display: block; font-weight: 600; margin-bottom: 8px; }
    input,
    textarea {
      width: 100%;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      font: inherit;
      background: var(--surface);
      color: var(--ink);
    }
    textarea {
      min-height: 160px;
      resize: vertical;
    }
    .stage-list { display: grid; gap: 10px; }
    .stage {
      border: 1px solid rgba(87, 73, 43, 0.12);
      border-radius: 14px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.55);
    }
    .stage.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
    .stage.completed { border-color: var(--success); background: var(--success-soft); color: var(--success); }
    .stage.failed { border-color: var(--danger); background: var(--danger-soft); color: var(--danger); }
    .callout {
      border-radius: 16px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.66);
    }
    .callout.danger { background: var(--danger-soft); border-color: #fca5a5; color: var(--danger); }
    .callout.success { background: var(--success-soft); border-color: #86efac; color: var(--success); }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .result-section {
      margin: 14px 0;
      padding-top: 14px;
      border-top: 1px solid rgba(87, 73, 43, 0.12);
    }
    .result-section:first-child { border-top: none; padding-top: 0; }
    .conflict-type {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 999px;
      background: #efe1b7;
      color: #7c5c13;
      font-size: 12px;
      margin-right: 8px;
    }
    code {
      background: rgba(15, 23, 42, 0.07);
      padding: 2px 6px;
      border-radius: 6px;
      font-family: Consolas, monospace;
    }
    ul { margin: 8px 0 0; padding-left: 22px; }
    li { margin: 6px 0; color: var(--muted); }
    .small { font-size: 0.92rem; }
    .empty {
      padding: 18px;
      border-radius: 16px;
      border: 1px dashed var(--line);
      background: rgba(255, 253, 248, 0.66);
    }
    .session-shell {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
      gap: 18px;
      align-items: start;
    }
    .mode-switcher {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 16px 0;
    }
    .mode-pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--surface-strong);
      border: 1px solid var(--line);
      color: #423b2e;
      font-weight: 600;
    }
    .mode-pill.active {
      background: var(--accent-soft);
      border-color: rgba(15, 118, 110, 0.4);
      color: var(--accent);
    }
    .timeline {
      display: grid;
      gap: 12px;
    }
    .timeline-item {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(87, 73, 43, 0.12);
      background: rgba(255, 255, 255, 0.58);
    }
    .timeline-item strong {
      display: block;
      margin-bottom: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .microcopy {
      color: #6b4f1d;
      font-size: 0.92rem;
    }
    @media (max-width: 720px) {
      nav { flex-direction: column; align-items: flex-start; }
      .hero { grid-template-columns: 1fr; }
      .session-shell { grid-template-columns: 1fr; }
      main { padding: 24px 16px 40px; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="brand">ProdMind Studio</div>
    <div class="links">
      <a href="/">首页</a>
      <a href="/sessions">会话历史</a>
    </div>
  </nav>
  <main>${content}</main>
</body>
</html>`;

export const renderHome = () => layout('Home', `
  <section class="hero">
    <div class="card">
      <div class="eyebrow">中文多轮思维工具</div>
      <h1>先明确议题，再进入多角色、多轮的严肃思考。</h1>
      <p>
        ProdMind Studio 现在以会话为中心，而不是一次性 workflow。你先输入议题，
        再在同一个会话里手动切换 <code>challenge</code>、<code>decision</code>、
        <code>requirement-build</code> 三种思考模式。
      </p>
      <form id="topicForm" class="stack">
        <div>
          <label for="topic">请输入本次要讨论的议题</label>
          <textarea
            id="topic"
            name="topic"
            required
            placeholder="例如：我们是否应该把现有 CLI 产品迁移成一个可部署给公司内部使用的中文 Web 思维工具？"
          ></textarea>
        </div>
        <p class="small">这是严肃的思维工具。一个会话只服务一个主议题，后续通过模式切换推进思考。</p>
        <div class="actions">
          <button type="submit">开启会话</button>
          <a class="button secondary" href="/sessions">查看会话历史</a>
        </div>
        <div id="homeError" class="small" style="color: var(--danger);"></div>
      </form>
    </div>
    <div class="stack">
      <div class="card">
        <h2>你会得到什么</h2>
        <ul>
          <li>围绕同一个议题保留完整时间线和模式切换痕迹</li>
          <li>多角色可见发言，帮助团队从不同角度思考问题</li>
          <li>右侧草稿与定稿区域，方便逐步沉淀结构化产物</li>
        </ul>
      </div>
      <div class="card">
        <h2>这一版不做什么</h2>
        <ul>
          <li>不做协同编辑，也不做复杂权限系统</li>
          <li>不把三种模式串成固定流水线</li>
          <li>不把完整思考过程压缩成一次性结果页</li>
        </ul>
      </div>
    </div>
  </section>
  <script>
    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    document.getElementById('topicForm').onsubmit = async (event) => {
      event.preventDefault();
      const topic = event.target.topic.value;
      document.getElementById('homeError').textContent = '';

      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic })
        });
        const data = await response.json();
        if (!response.ok) {
          document.getElementById('homeError').innerHTML = escapeHtml(data.error || '无法创建会话。');
          return;
        }
        window.location.href = '/sessions/' + encodeURIComponent(data.session.sessionId);
      } catch (error) {
        document.getElementById('homeError').innerHTML = escapeHtml(error.message);
      }
    };
  </script>
`);

export const renderSessionPage = (sessionId: string) => layout('Session', `
  <section class="section-header">
    <div class="eyebrow">会话主场</div>
    <h1>会话</h1>
    <p>Session ID: <code>${escapeHtml(sessionId)}</code></p>
  </section>
  <section class="session-shell">
    <div class="stack">
      <div class="card">
        <h2>当前模式</h2>
        <div id="sessionMeta" class="empty">正在加载会话状态...</div>
        <div class="mode-switcher">
          <button class="mode-pill" type="button" data-mode="challenge">challenge 质疑</button>
          <button class="mode-pill" type="button" data-mode="decision">decision 裁决</button>
          <button class="mode-pill" type="button" data-mode="requirement-build">requirement-build 需求共建</button>
        </div>
        <p class="small">模式切换后会持续生效，直到你再次切换。</p>
        <div id="sessionStatusBanner" class="empty">切换模式、发送消息和定稿后，结果会立即刷新到时间线和右栏。</div>
      </div>
      <div class="card">
        <h2>共享底稿</h2>
        <div id="sharedContextPanel" class="empty">这里会持续显示本会话已确认事实、硬约束和参考资料。</div>
      </div>
      <div class="card">
        <h2>完整时间线</h2>
        <div id="timeline" class="timeline">
          <div class="timeline-item">
            <strong>等待消息</strong>
            <span class="microcopy">后续这里会显示用户消息、多角色发言和模式切换事件。</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h2>继续推进</h2>
        <form id="sessionMessageForm" class="stack">
          <div>
            <label for="sessionMessageInput">当前模式输入</label>
            <textarea
              id="sessionMessageInput"
              name="content"
              required
              placeholder="继续在当前模式下推进这一议题。例如：补充一个事实、提出一个反例、要求做出取舍，或者要求整理成结构化草稿。"
            ></textarea>
          </div>
          <div class="actions">
            <button id="sessionSendButton" type="submit">发送本轮输入</button>
          </div>
          <div id="sessionComposerError" class="small" style="color: var(--danger);"></div>
        </form>
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <h2>当前模式草稿</h2>
        <div id="draftPanel" class="empty">当前模式的草稿摘要、定稿版本和结构化产物会显示在这里。</div>
      </div>
      <div class="card">
        <h2>草稿产物</h2>
        <div id="draftArtifactsPanel" class="empty">当前模式还没有结构化草稿产物。</div>
      </div>
      <div class="card">
        <h2>已定稿版本</h2>
        <div id="finalizedArtifactsPanel" class="empty">当前模式还没有定稿版本。</div>
      </div>
      <div class="card">
        <h2>定稿操作</h2>
        <form id="finalizeArtifactsForm" class="stack">
          <div>
            <label for="finalizeNote">本次定稿备注</label>
            <input
              id="finalizeNote"
              name="note"
              type="text"
              placeholder="例如：baseline / expanded acceptance"
            />
          </div>
          <div class="actions">
            <button id="finalizeArtifactsButton" type="submit">生成新版本</button>
          </div>
          <div id="finalizeArtifactsError" class="small" style="color: var(--danger);"></div>
        </form>
        <p class="small">只在 <code>requirement-build</code> 模式下启用，且会保留所有历史版本。</p>
      </div>
    </div>
  </section>
  <script>
    const sessionPath = '/api/sessions/${escapeHtml(sessionId)}';
    const sessionModePath = '/api/sessions/${escapeHtml(sessionId)}/mode';
    const sessionMessagePath = '/api/sessions/${escapeHtml(sessionId)}/messages';
    const sessionFinalizePath = '/api/sessions/${escapeHtml(sessionId)}/artifacts/finalize';

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function modeLabel(mode) {
      if (mode === 'challenge') return 'challenge 质疑';
      if (mode === 'decision') return 'decision 裁决';
      if (mode === 'requirement-build') return 'requirement-build 需求共建';
      return String(mode || 'unknown');
    }

    function setInlineMessage(elementId, message) {
      document.getElementById(elementId).textContent = message || '';
    }

    function setStatusBanner(kind, title, message) {
      const banner = document.getElementById('sessionStatusBanner');
      if (!title && !message) {
        banner.className = 'empty';
        banner.innerHTML = '切换模式、发送消息和定稿后，结果会立即刷新到时间线和右栏。';
        return;
      }

      const danger = kind === 'danger' ? ' danger' : '';
      const success = kind === 'success' ? ' success' : '';
      banner.className = 'callout' + danger + success;
      banner.innerHTML =
        '<strong>' + escapeHtml(title) + '</strong>' +
        (message ? '<p class="small">' + escapeHtml(message) + '</p>' : '');
    }

    function renderModePills(currentMode, disabled) {
      for (const button of document.querySelectorAll('[data-mode]')) {
        button.classList.toggle('active', button.dataset.mode === currentMode);
        button.disabled = disabled;
      }
    }

    function renderTimeline(messages) {
      if (!Array.isArray(messages) || messages.length === 0) {
        return '<div class="timeline-item"><strong>等待消息</strong><span class="microcopy">后续这里会显示用户消息、多角色发言和模式切换事件。</span></div>';
      }

      return messages.map((message) => (
        '<div class="timeline-item">' +
          '<strong>' + escapeHtml(message.roleName || (message.speaker === 'user' ? '用户' : '系统')) + '</strong>' +
          '<div>' + escapeHtml(message.content).replaceAll('\\n', '<br>') + '</div>' +
          (message.timestamp ? '<div class="microcopy" style="margin-top: 8px;">' + escapeHtml(message.timestamp) + '</div>' : '') +
        '</div>'
      )).join('');
    }

    function renderDraftArtifacts(drafts) {
      const entries = Object.entries(drafts || {});
      if (entries.length === 0) {
        return '<div class="empty">当前模式还没有结构化草稿产物。</div>';
      }

      return entries.map(([artifactType, artifact]) => {
        const content = artifact && typeof artifact === 'object' && 'content' in artifact
          ? String(artifact.content)
          : JSON.stringify(artifact, null, 2);
        return '' +
          '<div class="timeline-item">' +
            '<strong>' + escapeHtml(artifactType) + '</strong>' +
            '<div>' + escapeHtml(content).replaceAll('\\n', '<br>') + '</div>' +
          '</div>';
      }).join('');
    }

    function renderFinalizedArtifacts(finalized) {
      const entries = Object.entries(finalized || {}).filter(([, versions]) => Array.isArray(versions) && versions.length > 0);
      if (entries.length === 0) {
        return '<div class="empty">当前模式还没有定稿版本。</div>';
      }

      return entries.map(([artifactType, versions]) => (
        '<div class="timeline-item">' +
          '<strong>' + escapeHtml(artifactType) + '</strong>' +
          '<div>' + versions.map((version) => {
            const note = version.note ? ' · ' + escapeHtml(version.note) : '';
            return '<div>v' + escapeHtml(version.version) + note + '</div>';
          }).join('') + '</div>' +
        '</div>'
      )).join('');
    }

    function renderSharedContext(sharedContext) {
      const facts = sharedContext && Array.isArray(sharedContext.confirmedFacts) ? sharedContext.confirmedFacts : [];
      const constraints = sharedContext && Array.isArray(sharedContext.hardConstraints) ? sharedContext.hardConstraints : [];
      const sources = sharedContext && Array.isArray(sharedContext.sourceReferences) ? sharedContext.sourceReferences : [];

      if (facts.length === 0 && constraints.length === 0 && sources.length === 0) {
        return '<div class="empty">当前还没有沉淀共享底稿。你可以在消息里用 fact:/constraint:/source: 或 事实：/约束：/参考： 来显式记录。</div>';
      }

      const sections = [];
      if (facts.length > 0) {
        sections.push('<div class="timeline-item"><strong>已确认事实</strong><div>' + facts.map((item) => escapeHtml(item)).join('<br>') + '</div></div>');
      }
      if (constraints.length > 0) {
        sections.push('<div class="timeline-item"><strong>硬约束</strong><div>' + constraints.map((item) => escapeHtml(item)).join('<br>') + '</div></div>');
      }
      if (sources.length > 0) {
        sections.push('<div class="timeline-item"><strong>参考资料</strong><div>' + sources.map((item) => escapeHtml(item)).join('<br>') + '</div></div>');
      }

      return sections.join('');
    }

    function updateComposerHint(currentMode) {
      const input = document.getElementById('sessionMessageInput');
      if (currentMode === 'challenge') {
        input.placeholder = '继续追问、补充事实、提出反例，或者要求某个角色从另一个角度继续挑战。';
        return;
      }
      if (currentMode === 'decision') {
        input.placeholder = '要求比较方案、说明取舍、给出建议，或者逼它明确风险和前提条件。';
        return;
      }
      input.placeholder = '要求整理成 idea/spec/acceptance/tasks 草稿，或者补充结构和验收标准。';
    }

    function syncFinalizeControls(data, disabled) {
      const button = document.getElementById('finalizeArtifactsButton');
      const noteInput = document.getElementById('finalizeNote');
      const currentMode = data && data.session ? data.session.currentMode : '';
      const drafts = data && data.artifacts && data.artifacts.drafts ? Object.keys(data.artifacts.drafts) : [];
      const versions = data && data.artifacts && data.artifacts.finalized && Array.isArray(data.artifacts.finalized.spec)
        ? data.artifacts.finalized.spec.length
        : 0;

      const canFinalize = currentMode === 'requirement-build' && drafts.length > 0 && !disabled;
      button.disabled = !canFinalize;
      noteInput.disabled = currentMode !== 'requirement-build' || disabled;
      button.textContent = versions > 0 ? '生成下一版' : '生成首版';
    }

    function applySessionData(data, options) {
      const disabled = Boolean(options && options.disabled);
      renderModePills(data.session.currentMode, disabled);
      updateComposerHint(data.session.currentMode);
      document.getElementById('sessionSendButton').disabled = disabled;
      document.getElementById('sessionMeta').innerHTML =
        '<div class="meta-grid">' +
          '<div class="timeline-item"><strong>议题</strong>' + escapeHtml(data.session.topic) + '</div>' +
          '<div class="timeline-item"><strong>当前模式</strong>' + escapeHtml(modeLabel(data.session.currentMode)) + '</div>' +
          '<div class="timeline-item"><strong>状态</strong>' + escapeHtml(data.session.status) + '</div>' +
          '<div class="timeline-item"><strong>最近活跃</strong>' + escapeHtml(data.session.lastActiveAt || data.session.updatedAt || '') + '</div>' +
        '</div>';
      document.getElementById('timeline').innerHTML = renderTimeline(data.modeState && data.modeState.messages);
      document.getElementById('sharedContextPanel').innerHTML = renderSharedContext(data.session && data.session.sharedContext);
      document.getElementById('draftPanel').innerHTML = data.modeState && data.modeState.draftSummary
        ? '<div class="timeline-item"><strong>当前模式草稿</strong><div>' + escapeHtml(data.modeState.draftSummary.summary).replaceAll('\\n', '<br>') + '</div></div>'
        : '<div class="empty">当前模式还没有草稿摘要。</div>';
      document.getElementById('draftArtifactsPanel').innerHTML = renderDraftArtifacts(data.artifacts && data.artifacts.drafts);
      document.getElementById('finalizedArtifactsPanel').innerHTML = renderFinalizedArtifacts(data.artifacts && data.artifacts.finalized);
      syncFinalizeControls(data, disabled);
    }

    async function readJson(response) {
      const data = await response.json().catch(() => ({}));
      return data && typeof data === 'object' ? data : {};
    }

    async function loadSession(statusMessage) {
      try {
        const response = await fetch(sessionPath);
        const data = await readJson(response);
        if (!response.ok) {
          document.getElementById('sessionMeta').innerHTML =
            '<div class="callout danger"><strong>无法加载会话。</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          document.getElementById('draftPanel').innerHTML =
            '<div class="callout danger"><strong>无法加载草稿。</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          return;
        }

        applySessionData(data, { disabled: false });
        if (statusMessage) {
          setStatusBanner('success', statusMessage.title, statusMessage.message);
        } else {
          setStatusBanner('', '', '');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        document.getElementById('sessionMeta').innerHTML =
          '<div class="callout danger"><strong>无法加载会话。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        document.getElementById('draftPanel').innerHTML =
          '<div class="callout danger"><strong>无法加载草稿。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        document.getElementById('draftArtifactsPanel').innerHTML =
          '<div class="callout danger"><strong>无法加载草稿产物。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        document.getElementById('finalizedArtifactsPanel').innerHTML =
          '<div class="callout danger"><strong>无法加载定稿版本。</strong><p class="small">' + escapeHtml(message) + '</p></div>';
        setStatusBanner('danger', '会话刷新失败', message);
      }
    }

    async function switchMode(mode) {
      setInlineMessage('sessionComposerError', '');
      setInlineMessage('finalizeArtifactsError', '');
      setStatusBanner('', '正在切换模式…', '请稍候，当前会话会刷新到新的思考模式。');
      renderModePills(mode, true);
      document.getElementById('sessionSendButton').disabled = true;

      try {
        const response = await fetch(sessionModePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
        const data = await readJson(response);
        if (!response.ok) {
          throw new Error(data.error || '无法切换模式');
        }

        applySessionData(data, { disabled: false });
        setStatusBanner('success', '模式已切换', '当前会话已进入 ' + modeLabel(data.session.currentMode) + '。');
      } catch (error) {
        const message = error instanceof Error ? error.message : '无法切换模式';
        document.getElementById('sessionSendButton').disabled = false;
        setStatusBanner('danger', '模式切换失败', message);
      }
    }

    async function submitMessage(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const input = document.getElementById('sessionMessageInput');
      const content = input.value.trim();
      if (!content) {
        setInlineMessage('sessionComposerError', '请输入本轮要推进的内容。');
        return;
      }

      setInlineMessage('sessionComposerError', '');
      setStatusBanner('', '正在生成本轮输出…', '系统会把这条输入送到当前模式，并刷新时间线与右栏。');
      document.getElementById('sessionSendButton').disabled = true;

      try {
        const response = await fetch(sessionMessagePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        const data = await readJson(response);
        if (!response.ok) {
          throw new Error(data.error || '无法发送消息');
        }

        applySessionData(data, { disabled: false });
        form.reset();
        updateComposerHint(data.session.currentMode);
        input.focus();
        setStatusBanner('success', '本轮已完成', '新的角色发言和草稿摘要已经刷新。');
      } catch (error) {
        const message = error instanceof Error ? error.message : '无法发送消息';
        document.getElementById('sessionSendButton').disabled = false;
        setInlineMessage('sessionComposerError', message);
        setStatusBanner('danger', '消息发送失败', message);
      }
    }

    async function finalizeArtifacts(event) {
      event.preventDefault();
      const note = document.getElementById('finalizeNote').value.trim();
      setInlineMessage('finalizeArtifactsError', '');
      setStatusBanner('', '正在生成新版本…', '定稿不会覆盖旧版本，完成后右栏会刷新。');
      document.getElementById('finalizeArtifactsButton').disabled = true;

      try {
        const response = await fetch(sessionFinalizePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note })
        });
        const data = await readJson(response);
        if (!response.ok) {
          throw new Error(data.error || '无法定稿');
        }

        applySessionData(data, { disabled: false });
        document.getElementById('finalizeNote').value = '';
        setStatusBanner('success', '新版本已生成', '右栏中的已定稿版本已经更新。');
      } catch (error) {
        const message = error instanceof Error ? error.message : '无法定稿';
        syncFinalizeControls({ session: { currentMode: 'requirement-build' }, artifacts: { drafts: { placeholder: true }, finalized: {} } }, false);
        setInlineMessage('finalizeArtifactsError', message);
        setStatusBanner('danger', '定稿失败', message);
      }
    }

    for (const button of document.querySelectorAll('[data-mode]')) {
      button.addEventListener('click', () => switchMode(button.dataset.mode));
    }

    document.getElementById('sessionMessageForm').addEventListener('submit', submitMessage);
    document.getElementById('finalizeArtifactsForm').addEventListener('submit', finalizeArtifacts);
    loadSession();
  </script>
`);

export const renderSessionHistoryPage = () => layout('Sessions', `
  <section class="section-header">
    <div class="eyebrow">按议题回看</div>
    <h1>会话历史</h1>
    <p>按议题、最近活跃时间和当前模式查看会话，而不是按 workflow run 组织。</p>
  </section>
  <section class="card">
    <div id="sessionHistoryList" class="empty">正在加载会话历史...</div>
  </section>
  <script>
    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function renderSessionItems(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return '<div class="empty"><strong>还没有会话历史。</strong><p class="small">先从首页输入一个严肃议题，再进入会话。</p></div>';
      }

      return items.map((item) => (
        '<article class="result-section">' +
          '<h3><a href="/sessions/' + encodeURIComponent(item.sessionId) + '">' + escapeHtml(item.topic) + '</a></h3>' +
          '<p><strong>最近活跃：</strong>' + escapeHtml(item.lastActiveAt) + '</p>' +
          '<p><strong>当前模式：</strong>' + escapeHtml(item.currentMode) + '</p>' +
          '<p><a href="/sessions/' + encodeURIComponent(item.sessionId) + '/replay">打开回放</a></p>' +
        '</article>'
      )).join('');
    }

    async function loadSessionHistory() {
      try {
        const response = await fetch('/api/sessions');
        const data = await response.json();
        document.getElementById('sessionHistoryList').innerHTML = renderSessionItems(data.sessions);
      } catch (error) {
        document.getElementById('sessionHistoryList').innerHTML =
          '<div class="callout danger"><strong>无法加载会话历史。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    }

    loadSessionHistory();
  </script>
`);

export const renderSessionReplayPage = (sessionId: string) => layout('Replay', `
  <section class="section-header">
    <div class="eyebrow">过程回放</div>
    <h1>会话回放</h1>
    <p>Session ID: <code>${escapeHtml(sessionId)}</code></p>
  </section>
  <section class="grid">
    <div class="card">
      <h2>回放概览</h2>
      <div id="replayMeta" class="empty">正在加载回放...</div>
    </div>
    <div class="card">
      <h2>定稿产物</h2>
      <div id="replayArtifacts" class="empty">正在加载定稿产物...</div>
    </div>
  </section>
  <section class="card section">
    <h2>事件时间线</h2>
    <div id="replayTimeline" class="timeline">
      <div class="timeline-item">
        <strong>正在加载</strong>
        <span class="microcopy">这里会显示模式切换、角色发言、草稿更新和定稿节点。</span>
      </div>
    </div>
  </section>
  <script>
    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function renderReplayEvents(events) {
      if (!Array.isArray(events) || events.length === 0) {
        return '<div class="empty">当前会话还没有可回放的事件。</div>';
      }

      return events.map((event) => {
        if (event.type === 'mode_switched') {
          return '<div class="timeline-item"><strong>模式切换</strong><div>' + escapeHtml(event.fromMode + ' -> ' + event.toMode) + '</div></div>';
        }
        if (event.type === 'artifact_finalized') {
          return '<div class="timeline-item"><strong>产物定稿</strong><div>' + escapeHtml(event.artifactType) + ' v' + escapeHtml(event.version) + '</div></div>';
        }
        if (event.type === 'role_message') {
          return '<div class="timeline-item"><strong>' + escapeHtml(event.roleName) + '</strong><div>' + escapeHtml(event.content) + '</div></div>';
        }
        if (event.type === 'draft_updated') {
          return '<div class="timeline-item"><strong>草稿更新</strong><div>' + escapeHtml(event.summary) + '</div></div>';
        }
        if (event.type === 'shared_context_updated') {
          const sections = [];
          if (Array.isArray(event.confirmedFacts) && event.confirmedFacts.length > 0) {
            sections.push('已确认事实：' + event.confirmedFacts.map((item) => escapeHtml(item)).join('；'));
          }
          if (Array.isArray(event.hardConstraints) && event.hardConstraints.length > 0) {
            sections.push('硬约束：' + event.hardConstraints.map((item) => escapeHtml(item)).join('；'));
          }
          if (Array.isArray(event.sourceReferences) && event.sourceReferences.length > 0) {
            sections.push('参考资料：' + event.sourceReferences.map((item) => escapeHtml(item)).join('；'));
          }
          return '<div class="timeline-item"><strong>共享底稿更新</strong><div>' + sections.join('<br>') + '</div></div>';
        }
        return '<div class="timeline-item"><strong>用户消息</strong><div>' + escapeHtml(event.content || '') + '</div></div>';
      }).join('');
    }

    function renderReplayArtifacts(artifacts) {
      const requirementArtifacts = artifacts && artifacts['requirement-build'];
      const finalized = requirementArtifacts && requirementArtifacts.finalized;
      const entries = Object.entries(finalized || {}).filter(([, versions]) => Array.isArray(versions) && versions.length > 0);
      if (entries.length === 0) {
        return '<div class="empty">当前回放还没有定稿产物。</div>';
      }

      return entries.map(([artifactType, versions]) => (
        '<div class="timeline-item">' +
          '<strong>' + escapeHtml(artifactType) + '</strong>' +
          '<div>' + versions.map((version) => '<div>v' + escapeHtml(version.version) + (version.note ? ' · ' + escapeHtml(version.note) : '') + '</div>').join('') + '</div>' +
        '</div>'
      )).join('');
    }

    function renderLegacyReplay(legacy) {
      document.getElementById('replayMeta').innerHTML =
        '<div class="timeline-item"><strong>兼容旧版 workflow 记录</strong><div>' + escapeHtml(legacy.run.idea) + '</div></div>';
      document.getElementById('replayTimeline').innerHTML =
        '<div class="timeline-item"><strong>Legacy Workflow</strong><div>' + escapeHtml(legacy.run.status) + '</div></div>';
      document.getElementById('replayArtifacts').innerHTML =
        legacy.result && legacy.result.decision
          ? '<div class="timeline-item"><strong>Recommendation</strong><div>' + escapeHtml(legacy.result.decision.recommendation) + '</div></div>'
          : '<div class="empty">旧记录里没有额外结果。</div>';
    }

    async function loadReplay() {
      try {
        const response = await fetch('/api/sessions/${escapeHtml(sessionId)}/replay');
        const data = await response.json();
        if (!response.ok) {
          document.getElementById('replayMeta').innerHTML =
            '<div class="callout danger"><strong>无法加载回放。</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          return;
        }

        if (data.source === 'legacy-workflow') {
          renderLegacyReplay(data.legacy);
          return;
        }

        document.getElementById('replayMeta').innerHTML =
          '<div class="timeline-item"><strong>议题</strong><div>' + escapeHtml(data.session.topic) + '</div></div>' +
          '<div class="timeline-item"><strong>最近活跃</strong><div>' + escapeHtml(data.session.lastActiveAt) + '</div></div>';
        document.getElementById('replayTimeline').innerHTML = renderReplayEvents(data.events);
        document.getElementById('replayArtifacts').innerHTML = renderReplayArtifacts(data.artifacts);
      } catch (error) {
        document.getElementById('replayMeta').innerHTML =
          '<div class="callout danger"><strong>无法加载回放。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
        document.getElementById('replayTimeline').innerHTML =
          '<div class="callout danger"><strong>无法加载时间线。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
        document.getElementById('replayArtifacts').innerHTML =
          '<div class="callout danger"><strong>无法加载定稿产物。</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    }

    loadReplay();
  </script>
`);

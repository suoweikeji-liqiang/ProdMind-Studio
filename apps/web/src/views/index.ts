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
    textarea {
      width: 100%;
      min-height: 160px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      resize: vertical;
      font: inherit;
      background: var(--surface);
      color: var(--ink);
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

    @media (max-width: 720px) {
      nav { flex-direction: column; align-items: flex-start; }
      .hero { grid-template-columns: 1fr; }
      main { padding: 24px 16px 40px; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="brand">ProdMind Studio</div>
    <div class="links">
      <a href="/">Home</a>
      <a href="/workflow">New Workflow</a>
      <a href="/history">History</a>
    </div>
  </nav>
  <main>${content}</main>
</body>
</html>`;

export const renderHome = () => layout('Home', `
  <section class="hero">
    <div class="card">
      <div class="eyebrow">Single-user decision workbench</div>
      <h1>Turn one idea into a challenged decision, a recommendation, and reusable output.</h1>
      <p>
        ProdMind Studio keeps the V1 path narrow on purpose: idea input, challenge, decision,
        asset output, history revisit, and basic recovery for one main operator.
      </p>
      <div class="actions">
        <a class="button" href="/workflow">Start New Workflow</a>
        <a class="button secondary" href="/history">Review History</a>
      </div>
    </div>
    <div class="stack">
      <div class="card">
        <h2>What V1 covers</h2>
        <ul>
          <li>Web-led workflow for idea -> challenge -> decision -> assets</li>
          <li>History revisit when you need to reopen a prior run</li>
          <li>Provider reliability summary as operator context</li>
        </ul>
      </div>
      <div class="card">
        <h2>What V1 does not cover</h2>
        <ul>
          <li>No auth, RBAC, or multi-user collaboration</li>
          <li>No dashboard platform or provider marketplace</li>
          <li>No billing system or heavy database productization</li>
        </ul>
      </div>
    </div>
  </section>
`);

export const renderWorkflow = () => layout('Workflow', `
  <section class="section-header">
    <div class="eyebrow">Web main path</div>
    <h1>Execute Workflow</h1>
    <p>Describe the idea, target user, or constraint set you want to pressure-test. Results redirect automatically when the run completes.</p>
  </section>
  <section class="grid">
    <form id="workflowForm" class="card">
      <label for="idea">Idea brief</label>
      <textarea id="idea" name="idea" required placeholder="Example: Build a single-user decision workbench for internal pilot operators who need clearer provider reliability context."></textarea>
      <p class="small">Keep it concrete. Mention the problem, target operator, and any non-negotiable constraints.</p>
      <button type="submit">Run Workflow</button>
    </form>
    <div class="stack">
      <div class="card">
        <h2>What to expect</h2>
        <ul>
          <li>Challenge pressure-tests the idea and surfaces conflicts.</li>
          <li>Decision produces a recommendation, risks, and options.</li>
          <li>Asset output is stored so history can reopen it later.</li>
        </ul>
      </div>
      <div class="card">
        <h2>If the workflow fails</h2>
        <p>History is the safest way to revisit previous outputs. Use it to inspect the last known state before deciding whether a rerun is necessary.</p>
        <ul>
          <li>Check which stage stopped.</li>
          <li>Review any provider summary that was already recorded.</li>
          <li>Rerun only after you know what needs to change.</li>
        </ul>
      </div>
    </div>
  </section>
  <section id="progress" class="card section" style="display:none;">
    <h2>Workflow status</h2>
    <div id="status"></div>
    <div id="stages" class="stage-list" style="margin-top: 16px;"></div>
    <div id="details" class="stack" style="margin-top: 16px;"></div>
  </section>
  <script>
    const stages = ['queued', 'running_challenge', 'running_decision', 'running_assets', 'completed'];
    const stageLabels = {
      queued: 'Queued',
      running_challenge: 'Challenge round',
      running_decision: 'Decision analysis',
      running_assets: 'Asset output',
      completed: 'Completed',
      failed: 'Failed'
    };

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function defaultNextSteps(status) {
      if (status === 'failed') {
        return [
          'Inspect the failure summary and note which stage stopped.',
          'Open the history detail page if this run was already persisted.',
          'Fix the input or provider configuration before rerunning.'
        ];
      }

      if (status === 'completed') {
        return [
          'Review the recommendation and generated assets.',
          'Use history if you need to revisit this run later.'
        ];
      }

      return [
        'Keep this tab open while the workflow advances.',
        'Results will open automatically after completion.'
      ];
    }

    function renderStages(data) {
      const phaseData = Array.isArray(data.phases) && data.phases.length
        ? data.phases.map((phase) => ({
            label: phase.label || phase.phase,
            status: phase.status,
            detail: phase.note || ''
          }))
        : stages.map((stageKey) => ({
            label: stageLabels[stageKey],
            status: stageKey === data.status ? 'active' : (stageKey === 'completed' && data.status === 'completed' ? 'completed' : 'pending'),
            detail: ''
          }));

      return phaseData.map((phase) => {
        const className = phase.status === 'completed' || phase.status === 'failed' || phase.status === 'active'
          ? 'stage ' + phase.status
          : 'stage';
        return '<div class="' + className + '">' +
          '<strong>' + escapeHtml(phase.label) + '</strong>' +
          (phase.detail ? '<div class="small">' + escapeHtml(phase.detail) + '</div>' : '') +
        '</div>';
      }).join('');
    }

    function renderDetails(data, workflowId) {
      const nextSteps = Array.isArray(data.nextSteps) && data.nextSteps.length ? data.nextSteps : defaultNextSteps(data.status);
      const historyPath = data.historyPath || ('/history/' + workflowId);
      const fragments = [];

      if (data.currentStage) {
        fragments.push('<div class="callout"><strong>Current note:</strong> ' + escapeHtml(data.currentStage) + '</div>');
      }

      if (data.error) {
        fragments.push('<div class="callout danger"><strong>Error:</strong> ' + escapeHtml(data.error) + '</div>');
      }

      fragments.push(
        '<div class="callout">' +
          '<strong>Next steps</strong>' +
          '<ul>' + nextSteps.map((step) => '<li>' + escapeHtml(step) + '</li>').join('') + '</ul>' +
          '<p class="small"><a href="' + historyPath + '">Open history detail</a></p>' +
        '</div>'
      );

      return fragments.join('');
    }

    async function updateProgress(workflowId) {
      const response = await fetch('/api/workflow/status/' + workflowId);
      const data = await response.json();

      if (!response.ok) {
        document.getElementById('details').innerHTML =
          '<div class="callout danger"><strong>Unable to load workflow status.</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
        return;
      }

      document.getElementById('status').innerHTML =
        '<span class="status ' + data.status + '">' + escapeHtml(stageLabels[data.status] || data.status) + '</span>';
      document.getElementById('stages').innerHTML = renderStages(data);
      document.getElementById('details').innerHTML = renderDetails(data, workflowId);

      if (data.status === 'completed') {
        document.getElementById('details').innerHTML += '<div class="callout success"><strong>Completed.</strong> Redirecting to results...</div>';
        window.setTimeout(() => { window.location.href = '/results/' + workflowId; }, 450);
        return;
      }

      if (data.status === 'failed') {
        return;
      }

      window.setTimeout(() => updateProgress(workflowId), 1000);
    }

    document.getElementById('workflowForm').onsubmit = async (event) => {
      event.preventDefault();
      const idea = event.target.idea.value;
      document.getElementById('progress').style.display = 'block';
      document.getElementById('status').innerHTML = '<span class="status queued">Queued</span>';
      document.getElementById('details').innerHTML = '<div class="callout">Submitting workflow...</div>';

      try {
        const response = await fetch('/api/workflow/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea })
        });
        const data = await response.json();
        if (response.ok) {
          updateProgress(data.workflowId);
        } else {
          document.getElementById('details').innerHTML =
            '<div class="callout danger"><strong>Unable to start workflow.</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
        }
      } catch (error) {
        document.getElementById('details').innerHTML =
          '<div class="callout danger"><strong>Unable to start workflow.</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    };
  </script>
`);

export const renderResults = (id: string) => layout('Results', `
  <section class="section-header">
    <div class="eyebrow">Workflow output</div>
    <h1>Workflow Results</h1>
    <p>Run ID: <code>${escapeHtml(id)}</code></p>
    <p>If live run data is no longer available, this page falls back to persisted workflow history.</p>
  </section>
  <section class="summary-grid">
    <div class="card">
      <h2>Challenge Snapshot</h2>
      <div id="challenge">Loading...</div>
    </div>
    <div class="card">
      <h2>Recommendation</h2>
      <div id="decision">Loading...</div>
    </div>
  </section>
  <section class="summary-grid section">
    <div class="card">
      <h2>Asset Output</h2>
      <div id="assets">Loading...</div>
    </div>
    <div class="card">
      <h2>Provider Reliability</h2>
      <p class="small">Secondary operator context. Useful for retry, timeout, fallback, and usage visibility.</p>
      <div id="provider">Loading...</div>
    </div>
  </section>
  <section class="card">
    <h2>Source status</h2>
    <div id="resultMeta" class="empty">Loading result source...</div>
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

    function renderStringList(items, emptyLabel) {
      if (!Array.isArray(items) || items.length === 0) {
        return '<p>' + escapeHtml(emptyLabel) + '</p>';
      }
      return '<ul>' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';
    }

    function buildDecisionSummary(decision) {
      if (!decision) {
        return { hypotheses: [], risks: [], options: [], recommendation: '' };
      }
      if (decision.summary) {
        return decision.summary;
      }
      if (!Array.isArray(decision.steps)) {
        return {
          hypotheses: decision.hypotheses || [],
          risks: decision.risks || [],
          options: decision.options || [],
          recommendation: decision.recommendation || ''
        };
      }

      const summary = { hypotheses: [], risks: [], options: [], recommendation: '' };
      for (const step of decision.steps) {
        const output = String(step.output || '');
        if (step.type === 'hypothesis_eval') {
          const match = output.match(/hypothesis:\\s*(.+)/i);
          if (match && match[1]) summary.hypotheses.push({ statement: match[1], confidence: 'medium' });
        } else if (step.type === 'risk_eval') {
          const match = output.match(/risk:\\s*(.+)/i);
          if (match && match[1]) summary.risks.push({ description: match[1], severity: 'medium' });
        } else if (step.type === 'option_compare') {
          const match = output.match(/option:\\s*(.+)/i);
          if (match && match[1]) summary.options.push({ description: match[1], pros: [], cons: [] });
        } else if (step.type === 'summary' && !summary.recommendation) {
          summary.recommendation = output;
        }
      }
      return summary;
    }

    function renderChallenge(challenge) {
      if (!challenge) return '<p>No challenge data available.</p>';
      const summary = challenge.summary || challenge;
      return '' +
        '<div class="result-section"><h3>Hypotheses</h3>' + renderStringList(summary.hypotheses, 'No hypotheses generated') + '</div>' +
        '<div class="result-section"><h3>MVP Boundary</h3><p>' + escapeHtml(summary.mvpBoundary || 'Not defined') + '</p></div>' +
        '<div class="result-section"><h3>Conflicts</h3>' + (
          Array.isArray(summary.conflicts) && summary.conflicts.length
            ? '<ul>' + summary.conflicts.map((conflict) => '<li><span class="conflict-type">' + escapeHtml(conflict.type || 'conflict') + '</span>' + (conflict.details ? ': ' + escapeHtml(conflict.details) : '') + '</li>').join('') + '</ul>'
            : '<p>No conflicts detected</p>'
        ) + '</div>' +
        '<div class="result-section"><h3>Next Actions</h3>' + renderStringList(summary.nextActions, 'No next actions recorded') + '</div>';
    }

    function renderDecision(decision) {
      if (!decision) return '<p>No decision data available.</p>';
      const summary = buildDecisionSummary(decision);
      return '' +
        '<div class="result-section"><h3>Recommendation</h3><p>' + escapeHtml(summary.recommendation || 'No recommendation generated yet') + '</p></div>' +
        '<div class="result-section"><h3>Hypotheses</h3>' + (
          summary.hypotheses.length
            ? '<ul>' + summary.hypotheses.map((hypothesis) => '<li>' + escapeHtml(hypothesis.statement) + '</li>').join('') + '</ul>'
            : '<p>No hypotheses recorded</p>'
        ) + '</div>' +
        '<div class="result-section"><h3>Risks</h3>' + (
          summary.risks.length
            ? '<ul>' + summary.risks.map((risk) => '<li><span class="conflict-type">' + escapeHtml(risk.severity || 'unknown') + '</span>' + escapeHtml(risk.description) + '</li>').join('') + '</ul>'
            : '<p>No risks recorded</p>'
        ) + '</div>' +
        '<div class="result-section"><h3>Options</h3>' + (
          summary.options.length
            ? '<ul>' + summary.options.map((option) => '<li>' + escapeHtml(option.description) + '</li>').join('') + '</ul>'
            : '<p>No options recorded</p>'
        ) + '</div>';
    }

    function renderAssets(assets) {
      if (!assets) return '<p>No asset data available.</p>';
      const files = Array.isArray(assets.files) ? assets.files : [];
      return '' +
        '<div class="result-section"><h3>Project Path</h3><p><code>' + escapeHtml(assets.projectPath || 'Not specified') + '</code></p></div>' +
        '<div class="result-section"><h3>Generated Files</h3>' + (
          files.length
            ? '<ul>' + files.map((file) => '<li><code>' + escapeHtml(file) + '</code></li>').join('') + '</ul>'
            : '<p>Review history detail if you need the persisted file list.</p>'
        ) + '</div>';
    }

    function renderProviderSummary(executions) {
      if (!Array.isArray(executions) || executions.length === 0) return '<p>No provider summary available.</p>';
      return executions.map((execution) => {
        const initialRole = execution.routeResolution && execution.routeResolution.initialCandidate ? execution.routeResolution.initialCandidate.routeRole : null;
        const resolvedRole = execution.routeResolution && execution.routeResolution.resolvedCandidate ? execution.routeResolution.resolvedCandidate.routeRole : null;
        const route = initialRole && resolvedRole
          ? (initialRole === resolvedRole ? resolvedRole : initialRole + ' -> ' + resolvedRole)
          : (execution.fallbackUsed ? 'primary -> fallback' : 'primary');

        return '' +
          '<div class="result-section">' +
            '<h3>' + escapeHtml(execution.operation || 'provider_call') + '</h3>' +
            '<p><strong>Provider:</strong> ' + escapeHtml(execution.selectedProvider) + '/' + escapeHtml(execution.selectedModel) + '</p>' +
            '<p><strong>Route:</strong> ' + escapeHtml(route) + '</p>' +
            '<p><strong>Retries:</strong> ' + execution.retriesPerformed + ' | <strong>Timeouts:</strong> ' + execution.timeoutCount + '</p>' +
            '<p><strong>Fallback:</strong> ' + (execution.fallbackUsed ? 'Yes' : 'No') + '</p>' +
            '<p><strong>Failure Stage:</strong> ' + escapeHtml(execution.failureStage || 'none') + '</p>' +
            '<p><strong>Usage:</strong> ' + (execution.usage && execution.usage.totalTokens != null ? execution.usage.totalTokens : 'unavailable') + ' tokens (' + escapeHtml(execution.usage && execution.usage.tokenAvailability || 'unavailable') + ')</p>' +
          '</div>';
      }).join('');
    }

    function renderPersistedHistory(run, result) {
      document.getElementById('challenge').innerHTML = result && result.challenge
        ? '<div class="result-section"><h3>Challenge Summary</h3><p>' + escapeHtml(String(result.challenge.hypothesesCount)) + ' hypotheses stored at <code>' + escapeHtml(result.challenge.artifactPath) + '</code>.</p></div>'
        : '<p>No persisted challenge summary available.</p>';
      document.getElementById('decision').innerHTML = result && result.decision
        ? '<div class="result-section"><h3>Recommendation</h3><p>' + escapeHtml(result.decision.recommendation || 'No recommendation recorded') + '</p><p class="small">Stored at <code>' + escapeHtml(result.decision.artifactPath) + '</code>.</p></div>'
        : '<p>No persisted decision summary available.</p>';
      document.getElementById('assets').innerHTML = result && result.assets
        ? renderAssets(result.assets)
        : '<p>No persisted asset summary available.</p>';
      document.getElementById('provider').innerHTML = renderProviderSummary((result && result.providerExecutions) || (run && run.providerExecutions));
      document.getElementById('resultMeta').innerHTML =
        '<strong>Showing persisted workflow history.</strong><p class="small">Live in-memory result data was unavailable, so this page is using persisted workflow history instead.</p>' +
        (run ? '<p class="small"><a href="/history/${escapeHtml(id)}">Open full history detail</a></p>' : '');
    }

    function renderUnavailable() {
      document.getElementById('challenge').innerHTML = '<p>No results available.</p>';
      document.getElementById('decision').innerHTML = '<p>No results available.</p>';
      document.getElementById('assets').innerHTML = '<p>No results available.</p>';
      document.getElementById('provider').innerHTML = '<p>No provider summary available.</p>';
      document.getElementById('resultMeta').innerHTML = '<strong>Result not found.</strong><p class="small">The run is not available in live state or persisted workflow history.</p>';
    }

    async function loadResults() {
      try {
        const liveResponse = await fetch('/api/workflow/status/${escapeHtml(id)}');
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          if (liveData.result) {
            document.getElementById('challenge').innerHTML = renderChallenge(liveData.result.challenge);
            document.getElementById('decision').innerHTML = renderDecision(liveData.result.decision);
            document.getElementById('assets').innerHTML = renderAssets(liveData.result.assets);
            document.getElementById('provider').innerHTML = renderProviderSummary(liveData.result.providerExecutions);
            document.getElementById('resultMeta').innerHTML =
              '<strong>Showing live workflow state.</strong><p class="small">This run is still available in process memory. Persisted history will be used after restart or later revisit.</p>';
            return;
          }

          if (liveData.status === 'failed') {
            document.getElementById('resultMeta').innerHTML =
              '<strong>Run failed before a full live result was available.</strong><p class="small">' + escapeHtml(liveData.error || 'Unknown error') + '</p>';
          }
        }

        const historyResponse = await fetch('/api/workflow/history/${escapeHtml(id)}');
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          renderPersistedHistory(historyData.run, historyData.result);
          return;
        }

        renderUnavailable();
      } catch (error) {
        document.getElementById('resultMeta').innerHTML =
          '<strong>Unable to load workflow result.</strong><p class="small">' + escapeHtml(error.message) + '</p>';
      }
    }

    loadResults();
  </script>
`);

export const renderHistoryListPage = () => layout('History', `
  <section class="section-header">
    <div class="eyebrow">History revisit</div>
    <h1>Workflow History</h1>
    <p>Review earlier runs, reopen artifacts, and decide whether another workflow run is necessary.</p>
  </section>
  <section class="card">
    <div id="historyList" class="empty">Loading history...</div>
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

    function renderHistoryItems(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return '<div class="empty"><strong>No workflow history yet.</strong><p class="small">Start a new workflow from the home page.</p></div>';
      }

      return items.map((item) => {
        const run = item.run || item;
        const result = item.result || null;
        const provider = Array.isArray(run.providerExecutions) && run.providerExecutions.length ? run.providerExecutions[0] : null;
        const recommendation = result && result.decision ? result.decision.recommendation : 'No persisted recommendation yet';
        return '' +
          '<article class="result-section">' +
            '<h3><a href="/history/' + encodeURIComponent(run.runId) + '">' + escapeHtml(run.runId) + '</a></h3>' +
            '<p><strong>Status:</strong> ' + escapeHtml(String(run.status).replaceAll('_', ' ')) + '</p>' +
            '<p><strong>Idea:</strong> ' + escapeHtml(run.idea) + '</p>' +
            '<p><strong>Recommendation:</strong> ' + escapeHtml(recommendation) + '</p>' +
            '<p><strong>Provider:</strong> ' + (provider ? escapeHtml(provider.selectedProvider + '/' + provider.selectedModel) : 'n/a') + '</p>' +
          '</article>';
      }).join('');
    }

    async function loadHistory() {
      try {
        const response = await fetch('/api/workflow/history');
        const data = await response.json();
        document.getElementById('historyList').innerHTML = renderHistoryItems(data.items || data.runs || []);
      } catch (error) {
        document.getElementById('historyList').innerHTML =
          '<div class="callout danger"><strong>Unable to load history.</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    }

    loadHistory();
  </script>
`);

export const renderHistoryDetailPage = (runId: string) => layout('History Detail', `
  <section class="section-header">
    <div class="eyebrow">Run detail</div>
    <h1>History Detail</h1>
    <p>Run ID: <code>${escapeHtml(runId)}</code></p>
  </section>
  <section class="card">
    <div id="historyDetail" class="empty">Loading run detail...</div>
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

    function renderProviderSummary(executions) {
      if (!Array.isArray(executions) || executions.length === 0) {
        return '<p>No provider summary available.</p>';
      }
      return executions.map((execution) => (
        '<div class="result-section">' +
          '<h3>' + escapeHtml(execution.operation || 'provider_call') + '</h3>' +
          '<p><strong>Provider:</strong> ' + escapeHtml(execution.selectedProvider) + '/' + escapeHtml(execution.selectedModel) + '</p>' +
          '<p><strong>Retries:</strong> ' + execution.retriesPerformed + ' | <strong>Timeouts:</strong> ' + execution.timeoutCount + '</p>' +
          '<p><strong>Fallback:</strong> ' + (execution.fallbackUsed ? 'Yes' : 'No') + '</p>' +
        '</div>'
      )).join('');
    }

    function renderHistoryDetail(run, result) {
      if (!run) {
        return '<div class="callout danger"><strong>Run not found.</strong></div>';
      }

      const phases = Array.isArray(run.phases) ? run.phases : [];
      const files = result && result.assets && Array.isArray(result.assets.files) ? result.assets.files : [];
      const providerExecutions = (result && result.providerExecutions) || run.providerExecutions;
      const nextSteps = run.status === 'failed'
        ? [
            'Inspect the failed phase and provider summary.',
            'Fix the issue before rerunning.',
            'Use history instead of guessing what already completed.'
          ]
        : [
            'Review the recommendation below.',
            'Open generated files from the stored project path.',
            'Start a new workflow only if you need a fresh pass.'
          ];

      return '' +
        '<div class="result-section"><h3>Run Overview</h3>' +
          '<p><strong>Status:</strong> ' + escapeHtml(String(run.status).replaceAll('_', ' ')) + '</p>' +
          '<p><strong>Idea:</strong> ' + escapeHtml(run.idea) + '</p>' +
          '<p><strong>Started:</strong> ' + escapeHtml(run.startedAt) + '</p>' +
          (run.completedAt ? '<p><strong>Completed:</strong> ' + escapeHtml(run.completedAt) + '</p>' : '') +
          (run.error ? '<p><strong>Error:</strong> ' + escapeHtml(run.error) + '</p>' : '') +
        '</div>' +
        '<div class="result-section"><h3>Phase Status</h3>' +
          (phases.length ? '<ul>' + phases.map((phase) => '<li><strong>' + escapeHtml(phase.phase) + '</strong>: ' + escapeHtml(String(phase.status).replaceAll('_', ' ')) + '</li>').join('') + '</ul>' : '<p>No phase data available.</p>') +
        '</div>' +
        '<div class="result-section"><h3>Recommendation</h3><p>' + escapeHtml(result && result.decision ? result.decision.recommendation : 'No persisted recommendation yet') + '</p></div>' +
        '<div class="result-section"><h3>Artifacts</h3>' +
          (files.length ? '<ul>' + files.map((file) => '<li><code>' + escapeHtml(file) + '</code></li>').join('') + '</ul>' : '<p>No persisted files recorded.</p>') +
        '</div>' +
        '<div class="result-section"><h3>Next Steps</h3><ul>' + nextSteps.map((step) => '<li>' + escapeHtml(step) + '</li>').join('') + '</ul></div>' +
        '<div class="result-section"><h3>Provider Reliability</h3>' + renderProviderSummary(providerExecutions) + '</div>';
    }

    async function loadHistoryDetail() {
      try {
        const response = await fetch('/api/workflow/history/${escapeHtml(runId)}');
        const data = await response.json();
        if (!response.ok) {
          document.getElementById('historyDetail').innerHTML =
            '<div class="callout danger"><strong>Unable to load history detail.</strong><p class="small">' + escapeHtml(data.error || 'Unknown error') + '</p></div>';
          return;
        }
        document.getElementById('historyDetail').innerHTML = renderHistoryDetail(data.run, data.result);
      } catch (error) {
        document.getElementById('historyDetail').innerHTML =
          '<div class="callout danger"><strong>Unable to load history detail.</strong><p class="small">' + escapeHtml(error.message) + '</p></div>';
      }
    }

    loadHistoryDetail();
  </script>
`);

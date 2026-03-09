const layout = (title: string, content: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ProdMind Studio</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
    .status.queued { background: #e0e7ff; color: #3730a3; }
    .status.running_challenge { background: #fef3c7; color: #92400e; }
    .status.running_decision { background: #fef3c7; color: #92400e; }
    .status.running_assets { background: #fef3c7; color: #92400e; }
    .status.completed { background: #d1fae5; color: #065f46; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .status.active { background: #dbeafe; color: #1e40af; }
    button { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; }
    button:hover { background: #1d4ed8; }
    input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    h1 { color: #111; }
    h2 { color: #374151; margin-top: 24px; }
    h3 { color: #4b5563; margin-top: 16px; font-size: 16px; }
    .section { margin: 24px 0; }
    .stage { padding: 8px 0; color: #6b7280; }
    .stage.active { color: #2563eb; font-weight: 500; }
    .result-section { margin: 16px 0; }
    .conflict-type { background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    ul { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <nav><a href="/">Home</a> | <a href="/workflow">New Workflow</a></nav>
  <main>${content}</main>
</body>
</html>`;

export const renderHome = () => layout('Home', `
  <h1>ProdMind Studio</h1>
  <div class="card">
    <h2>Workflow Pipeline</h2>
    <p>Transform ideas through challenge → decision → assets</p>
    <a href="/workflow"><button>Start New Workflow</button></a>
  </div>
`);

export const renderWorkflow = () => layout('Workflow', `
  <h1>Execute Workflow</h1>
  <form id="workflowForm" class="card">
    <label>Idea:</label>
    <textarea name="idea" rows="4" required placeholder="Enter your product idea..."></textarea>
    <br><br>
    <button type="submit">Run Workflow</button>
  </form>
  <div id="progress" style="display:none;" class="card">
    <h2>Progress</h2>
    <div id="status"></div>
    <div id="stages" style="margin-top: 16px;"></div>
  </div>
  <script>
    const stages = ['queued', 'running_challenge', 'running_decision', 'running_assets', 'completed'];
    const stageLabels = {
      queued: 'Queued',
      running_challenge: 'Challenge Round',
      running_decision: 'Decision Analysis',
      running_assets: 'Asset Generation',
      completed: 'Completed',
      failed: 'Failed'
    };

    function updateProgress(workflowId) {
      fetch('/api/workflow/status/' + workflowId)
        .then(r => r.json())
        .then(data => {
          document.getElementById('status').innerHTML =
            '<span class="status ' + data.status + '">' + stageLabels[data.status] + '</span>' +
            (data.currentStage ? '<p>' + data.currentStage + '</p>' : '');

          let stagesHtml = stages.map(s =>
            '<div class="stage ' + (s === data.status ? 'active' : '') + '">' + stageLabels[s] + '</div>'
          ).join('');
          document.getElementById('stages').innerHTML = stagesHtml;

          if (data.status === 'completed') {
            window.location.href = '/results/' + workflowId;
          } else if (data.status === 'failed') {
            document.getElementById('status').innerHTML += '<p style="color:#991b1b;">Error: ' + data.error + '</p>';
          } else {
            setTimeout(() => updateProgress(workflowId), 1000);
          }
        });
    }

    document.getElementById('workflowForm').onsubmit = async (e) => {
      e.preventDefault();
      const idea = e.target.idea.value;
      document.getElementById('progress').style.display = 'block';

      try {
        const res = await fetch('/api/workflow/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea })
        });
        const data = await res.json();
        if (res.ok) {
          updateProgress(data.workflowId);
        } else {
          document.getElementById('status').innerHTML = '<span class="status failed">Error: ' + data.error + '</span>';
        }
      } catch (err) {
        document.getElementById('status').innerHTML = '<span class="status failed">Error: ' + err.message + '</span>';
      }
    };
  </script>
`);

export const renderResults = (id: string) => layout('Results', `
  <h1>Workflow Results</h1>
  <div class="card">
    <span class="status completed">Completed</span>
    <p>Workflow ID: ${id}</p>
  </div>
  <div class="section">
    <h2>Challenge Summary</h2>
    <div class="card" id="challenge">Loading...</div>
  </div>
  <div class="section">
    <h2>Decision Summary</h2>
    <div class="card" id="decision">Loading...</div>
  </div>
  <div class="section">
    <h2>Assets</h2>
    <div class="card" id="assets">Loading...</div>
  </div>
  <div class="section">
    <h2>Provider Reliability</h2>
    <div class="card" id="provider">Loading...</div>
  </div>
  <script>
    function renderChallenge(c) {
      if (!c) return '<p>No challenge data</p>';
      const s = c.summary || {};
      let html = '<div class="result-section"><h3>Hypotheses</h3>';
      if (s.hypotheses?.length) {
        html += '<ul>' + s.hypotheses.map(h => '<li>' + h + '</li>').join('') + '</ul>';
      } else {
        html += '<p>No hypotheses</p>';
      }
      html += '</div><div class="result-section"><h3>MVP Boundary</h3><p>' + (s.mvpBoundary || 'Not defined') + '</p></div>';
      html += '<div class="result-section"><h3>Conflicts</h3>';
      if (s.conflicts?.length) {
        html += '<ul>' + s.conflicts.map(c => '<li><span class="conflict-type">' + c.type + '</span></li>').join('') + '</ul>';
      } else {
        html += '<p>No conflicts</p>';
      }
      html += '</div>';
      return html;
    }

    function renderDecision(d) {
      if (!d) return '<p>No decision data</p>';
      return '<div class="result-section"><h3>Status</h3><span class="status ' + d.status + '">' + d.status + '</span></div>' +
        '<div class="result-section"><h3>Problem</h3><p>' + (d.problem || 'Not defined') + '</p></div>' +
        '<div class="result-section"><h3>Steps</h3><p>' + (d.steps?.length || 0) + ' steps</p></div>';
    }

    function renderAssets(a) {
      if (!a) return '<p>No asset data</p>';
      return '<div class="result-section"><h3>Project Path</h3><p><code>' + (a.projectPath || 'Not specified') + '</code></p></div>' +
        '<div class="result-section"><h3>Generated Assets</h3><p>Assets written to project directory</p></div>';
    }

    function renderProviderSummary(executions) {
      if (!executions?.length) return '<p>No provider summary available</p>';
      return executions.map(e =>
        '<div class="result-section">' +
          '<h3>' + (e.operation || 'provider_call') + '</h3>' +
          '<p><strong>Provider:</strong> ' + e.selectedProvider + '/' + e.selectedModel + '</p>' +
          '<p><strong>Route:</strong> ' + (
            e.routeResolution?.resolvedCandidate?.routeRole
              ? (e.routeResolution.initialCandidate.routeRole === e.routeResolution.resolvedCandidate.routeRole
                  ? e.routeResolution.resolvedCandidate.routeRole
                  : e.routeResolution.initialCandidate.routeRole + ' -> ' + e.routeResolution.resolvedCandidate.routeRole)
              : (e.fallbackUsed ? 'primary -> fallback' : 'primary')
          ) + '</p>' +
          '<p><strong>Policy:</strong> ' + (
            e.policySnapshot
              ? 'timeout=' + e.policySnapshot.timeoutMs + 'ms | maxRetries=' + e.policySnapshot.maxRetries + ' | fallbackMode=' + e.policySnapshot.fallbackMode
              : 'unavailable'
          ) + '</p>' +
          '<p><strong>Retries:</strong> ' + e.retriesPerformed + ' | <strong>Timeouts:</strong> ' + e.timeoutCount + '</p>' +
          '<p><strong>Fallback:</strong> ' + (e.fallbackUsed ? 'Yes' : 'No') + '</p>' +
          '<p><strong>Failure Stage:</strong> ' + (e.failureStage || 'none') + '</p>' +
          '<p><strong>Usage:</strong> ' + (e.usage?.totalTokens ?? 'unavailable') + ' tokens (' + (e.usage?.tokenAvailability ?? 'unavailable') + ')</p>' +
          '<p><strong>Cost:</strong> ' + (e.usage?.actualCostUsd ?? e.usage?.estimatedCostUsd ?? 'unavailable') + ' (' + (e.usage?.costAvailability ?? 'unavailable') + ')</p>' +
        '</div>'
      ).join('');
    }

    fetch('/api/workflow/status/${id}')
      .then(r => r.json())
      .then(data => {
        if (data.result) {
          document.getElementById('challenge').innerHTML = renderChallenge(data.result.challenge);
          document.getElementById('decision').innerHTML = renderDecision(data.result.decision);
          document.getElementById('assets').innerHTML = renderAssets(data.result.assets);
          document.getElementById('provider').innerHTML = renderProviderSummary(data.result.providerExecutions);
        } else {
          document.getElementById('challenge').textContent = 'No results available';
          document.getElementById('decision').textContent = 'No results available';
          document.getElementById('assets').textContent = 'No results available';
          document.getElementById('provider').textContent = 'No results available';
        }
      });
  </script>
`);

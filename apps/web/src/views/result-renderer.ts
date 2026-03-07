// Structured result rendering helpers
export function renderChallengeResult(challenge: any): string {
  if (!challenge) return '<p>No challenge data</p>';

  const summary = challenge.summary || {};
  return `
    <div class="result-section">
      <h3>Hypotheses</h3>
      ${summary.hypotheses?.length ? `
        <ul>
          ${summary.hypotheses.map((h: string) => `<li>${h}</li>`).join('')}
        </ul>
      ` : '<p>No hypotheses generated</p>'}
    </div>
    <div class="result-section">
      <h3>MVP Boundary</h3>
      <p>${summary.mvpBoundary || 'Not defined'}</p>
    </div>
    <div class="result-section">
      <h3>Conflicts Detected</h3>
      ${summary.conflicts?.length ? `
        <ul>
          ${summary.conflicts.map((c: any) => `
            <li>
              <span class="conflict-type">${c.type}</span>
              ${c.details ? `: ${c.details}` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '<p>No conflicts detected</p>'}
    </div>
    <div class="result-section">
      <h3>Next Actions</h3>
      ${summary.nextActions?.length ? `
        <ul>
          ${summary.nextActions.map((a: string) => `<li>${a}</li>`).join('')}
        </ul>
      ` : '<p>No actions defined</p>'}
    </div>
  `;
}

export function renderDecisionResult(decision: any): string {
  if (!decision) return '<p>No decision data</p>';

  return `
    <div class="result-section">
      <h3>Decision Status</h3>
      <span class="status ${decision.status}">${decision.status}</span>
    </div>
    <div class="result-section">
      <h3>Problem Statement</h3>
      <p>${decision.problem || 'Not defined'}</p>
    </div>
    <div class="result-section">
      <h3>Steps Completed</h3>
      <p>${decision.steps?.length || 0} steps</p>
    </div>
  `;
}

export function renderAssetResult(assets: any): string {
  if (!assets) return '<p>No asset data</p>';

  return `
    <div class="result-section">
      <h3>Project Path</h3>
      <p><code>${assets.projectPath || 'Not specified'}</code></p>
    </div>
    <div class="result-section">
      <h3>Generated Assets</h3>
      <p>Assets have been written to the project directory</p>
    </div>
  `;
}

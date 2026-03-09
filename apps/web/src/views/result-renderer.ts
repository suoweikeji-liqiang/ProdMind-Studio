import type { ProviderExecutionSummary, WorkflowResult, WorkflowRun } from '@prodmind/shared-types';

interface HistoryListItem {
  run: WorkflowRun;
  result?: WorkflowResult | null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatStatusLabel(status: string | undefined): string {
  if (!status) {
    return 'unknown';
  }

  return status.replaceAll('_', ' ');
}

function formatDurationMs(durationMs: number | undefined): string {
  if (typeof durationMs !== 'number' || durationMs <= 0) {
    return 'n/a';
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${Math.round(durationMs / 100) / 10}s`;
}

function truncate(value: string | undefined, maxLength = 120): string {
  if (!value) {
    return 'n/a';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function resolveDecisionSummary(decision: any): {
  hypotheses: Array<{ statement: string; confidence?: string; evidence?: string[] }>;
  risks: Array<{ description: string; severity?: string; mitigation?: string }>;
  options: Array<{ id?: string; description: string; pros?: string[]; cons?: string[] }>;
  recommendation: string;
} {
  if (!decision) {
    return {
      hypotheses: [],
      risks: [],
      options: [],
      recommendation: '',
    };
  }

  if (decision.summary) {
    return decision.summary;
  }

  if (Array.isArray(decision.steps)) {
    const summary = {
      hypotheses: [] as Array<{ statement: string; confidence?: string; evidence?: string[] }>,
      risks: [] as Array<{ description: string; severity?: string; mitigation?: string }>,
      options: [] as Array<{ id?: string; description: string; pros?: string[]; cons?: string[] }>,
      recommendation: '',
    };

    for (const step of decision.steps) {
      const output = String(step.output ?? '');
      if (step.type === 'hypothesis_eval') {
        const hypothesisMatch = output.match(/hypothesis:\s*(.+)/i);
        if (hypothesisMatch?.[1]) {
          summary.hypotheses.push({
            statement: hypothesisMatch[1],
            confidence: 'medium',
            evidence: [],
          });
        }
      } else if (step.type === 'risk_eval') {
        const riskMatch = output.match(/risk:\s*(.+)/i);
        if (riskMatch?.[1]) {
          summary.risks.push({
            description: riskMatch[1],
            severity: 'medium',
          });
        }
      } else if (step.type === 'option_compare') {
        const optionMatch = output.match(/option:\s*(.+)/i);
        if (optionMatch?.[1]) {
          summary.options.push({
            id: `opt-${summary.options.length + 1}`,
            description: optionMatch[1],
            pros: [],
            cons: [],
          });
        }
      } else if (step.type === 'summary' && !summary.recommendation) {
        summary.recommendation = output;
      }
    }

    return summary;
  }

  return {
    hypotheses: decision.hypotheses ?? [],
    risks: decision.risks ?? [],
    options: decision.options ?? [],
    recommendation: decision.recommendation ?? '',
  };
}

function renderStringList(items: string[] | undefined, emptyLabel: string): string {
  if (!items?.length) {
    return `<p>${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

export function renderChallengeResult(challenge: any): string {
  if (!challenge) return '<p>No challenge data</p>';

  const summary = challenge.summary ?? challenge;
  const conflicts = Array.isArray(summary.conflicts) ? summary.conflicts : [];
  const nextActions = Array.isArray(summary.nextActions)
    ? summary.nextActions
        .map((action: any) => typeof action === 'string' ? action : action?.action)
        .filter(Boolean)
    : [];

  return `
    <div class="result-section">
      <h3>Hypotheses</h3>
      ${renderStringList(summary.hypotheses, 'No hypotheses generated')}
    </div>
    <div class="result-section">
      <h3>MVP Boundary</h3>
      <p>${escapeHtml(summary.mvpBoundary || 'Not defined')}</p>
    </div>
    <div class="result-section">
      <h3>Conflicts Detected</h3>
      ${conflicts.length ? `
        <ul>
          ${conflicts.map((conflict: any) => `
            <li>
              <span class="conflict-type">${escapeHtml(conflict.type || 'conflict')}</span>
              ${conflict.details ? `: ${escapeHtml(conflict.details)}` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '<p>No conflicts detected</p>'}
    </div>
    <div class="result-section">
      <h3>Next Actions</h3>
      ${renderStringList(nextActions, 'No actions defined')}
    </div>
  `;
}

export function renderDecisionResult(decision: any): string {
  if (!decision) return '<p>No decision data</p>';

  const summary = resolveDecisionSummary(decision);

  return `
    <div class="result-section">
      <h3>Recommendation</h3>
      <p>${escapeHtml(summary.recommendation || 'No recommendation generated yet')}</p>
    </div>
    <div class="result-section">
      <h3>Hypotheses</h3>
      ${summary.hypotheses.length ? `
        <ul>
          ${summary.hypotheses.map((hypothesis) => `
            <li>
              ${escapeHtml(hypothesis.statement)}
              ${hypothesis.confidence ? ` <span class="conflict-type">${escapeHtml(hypothesis.confidence)}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '<p>No hypotheses generated</p>'}
    </div>
    <div class="result-section">
      <h3>Risks</h3>
      ${summary.risks.length ? `
        <ul>
          ${summary.risks.map((risk) => `
            <li>
              <span class="conflict-type">${escapeHtml(risk.severity || 'unknown')}</span>
              ${escapeHtml(risk.description)}
              ${risk.mitigation ? ` - Mitigation: ${escapeHtml(risk.mitigation)}` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '<p>No risks recorded</p>'}
    </div>
    <div class="result-section">
      <h3>Options</h3>
      ${summary.options.length ? `
        <ul>
          ${summary.options.map((option) => `
            <li>
              <strong>${escapeHtml(option.description)}</strong>
              ${option.pros?.length ? `<div>Pros: ${escapeHtml(option.pros.join(', '))}</div>` : ''}
              ${option.cons?.length ? `<div>Cons: ${escapeHtml(option.cons.join(', '))}</div>` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '<p>No options compared</p>'}
    </div>
    <div class="result-section">
      <h3>Problem Statement</h3>
      <p>${escapeHtml(decision.problem || 'Not defined')}</p>
    </div>
  `;
}

export function renderAssetResult(assets: any): string {
  if (!assets) return '<p>No asset data</p>';

  const files = Array.isArray(assets.files) ? assets.files : [];

  return `
    <div class="result-section">
      <h3>Project Path</h3>
      <p><code>${escapeHtml(assets.projectPath || 'Not specified')}</code></p>
    </div>
    <div class="result-section">
      <h3>Generated Files</h3>
      ${files.length ? `
        <ul>
          ${files.map((file: string) => `<li><code>${escapeHtml(file)}</code></li>`).join('')}
        </ul>
      ` : '<p>Assets are available from the project directory</p>'}
    </div>
    <div class="result-section">
      <h3>Next Step</h3>
      <p>Use the history detail page to reopen artifacts without rerunning the workflow.</p>
    </div>
  `;
}

function formatRoute(execution: ProviderExecutionSummary): string {
  const initialRole = execution.routeResolution?.initialCandidate.routeRole;
  const resolvedRole = execution.routeResolution?.resolvedCandidate?.routeRole;

  if (initialRole && resolvedRole) {
    return initialRole === resolvedRole ? initialRole : `${initialRole} -> ${resolvedRole}`;
  }

  return execution.fallbackUsed ? 'primary -> fallback' : 'primary';
}

export function renderProviderSummary(executions: ProviderExecutionSummary[] | undefined): string {
  if (!executions?.length) {
    return '<p>No provider summary available</p>';
  }

  return executions.map((execution) => `
    <div class="result-section">
      <h3>${escapeHtml(execution.operation || 'provider_call')}</h3>
      <p><strong>Provider:</strong> ${escapeHtml(execution.selectedProvider)}/${escapeHtml(execution.selectedModel)}</p>
      <p><strong>Route:</strong> ${escapeHtml(formatRoute(execution))}</p>
      <p><strong>Policy:</strong> ${execution.policySnapshot
        ? `timeout=${execution.policySnapshot.timeoutMs}ms | maxRetries=${execution.policySnapshot.maxRetries} | fallbackMode=${escapeHtml(execution.policySnapshot.fallbackMode)}`
        : 'unavailable'}</p>
      <p><strong>Retries:</strong> ${execution.retriesPerformed} | <strong>Timeouts:</strong> ${execution.timeoutCount}</p>
      <p><strong>Fallback:</strong> ${execution.fallbackUsed ? 'Yes' : 'No'}</p>
      <p><strong>Failure Stage:</strong> ${escapeHtml(execution.failureStage || 'none')}</p>
      <p><strong>Usage:</strong> ${execution.usage?.totalTokens ?? 'unavailable'} tokens (${escapeHtml(execution.usage?.tokenAvailability ?? 'unavailable')})</p>
      <p><strong>Cost:</strong> ${execution.usage?.actualCostUsd ?? execution.usage?.estimatedCostUsd ?? 'unavailable'} (${escapeHtml(execution.usage?.costAvailability ?? 'unavailable')})</p>
    </div>
  `).join('');
}

export function renderHistoryList(items: HistoryListItem[]): string {
  if (!items.length) {
    return `
      <div class="result-section">
        <h3>No workflow history yet</h3>
        <p>Start a new workflow from the home page, then revisit it here.</p>
      </div>
    `;
  }

  return items.map(({ run, result }) => {
    const provider = run.providerExecutions?.[0];
    const recommendation = result?.decision?.recommendation;

    return `
      <article class="result-section">
        <h3><a href="/history/${encodeURIComponent(run.runId)}">${escapeHtml(run.runId)}</a></h3>
        <p><strong>Status:</strong> ${escapeHtml(formatStatusLabel(run.status))}</p>
        <p><strong>Idea:</strong> ${escapeHtml(truncate(run.idea, 160))}</p>
        <p><strong>Recommendation:</strong> ${escapeHtml(truncate(recommendation, 140))}</p>
        <p><strong>Provider:</strong> ${provider ? `${escapeHtml(provider.selectedProvider)}/${escapeHtml(provider.selectedModel)}` : 'n/a'}</p>
        <p><a href="/history/${encodeURIComponent(run.runId)}">Open run detail</a></p>
      </article>
    `;
  }).join('');
}

export function renderHistoryDetail(run: WorkflowRun | null | undefined, result?: WorkflowResult | null): string {
  if (!run) {
    return '<p>Run not found.</p>';
  }

  const executions = result?.providerExecutions ?? run.providerExecutions;
  const nextSteps = run.status === 'failed'
    ? [
        'Inspect the failed phase and provider summary below.',
        'Fix the input or provider configuration, then rerun the workflow.',
        'Use the opt-in real-provider smoke only when investigating provider behavior.',
      ]
    : [
        'Review the recommendation and generated files below.',
        'Reuse this run as the baseline before starting another workflow.',
        'Open artifacts directly from the stored project path when you need the raw files.',
      ];

  return `
    <div class="result-section">
      <h3>Run Overview</h3>
      <p><strong>Run ID:</strong> ${escapeHtml(run.runId)}</p>
      <p><strong>Status:</strong> ${escapeHtml(formatStatusLabel(run.status))}</p>
      <p><strong>Idea:</strong> ${escapeHtml(run.idea)}</p>
      <p><strong>Started:</strong> ${escapeHtml(run.startedAt)}</p>
      <p><strong>Completed:</strong> ${escapeHtml(run.completedAt || 'in progress')}</p>
      ${run.error ? `<p><strong>Error:</strong> ${escapeHtml(run.error)}</p>` : ''}
    </div>
    <div class="result-section">
      <h3>Phase Status</h3>
      <ul>
        ${run.phases.map((phase) => `
          <li>
            <strong>${escapeHtml(phase.phase)}</strong>: ${escapeHtml(formatStatusLabel(phase.status))}
            (${escapeHtml(formatDurationMs(phase.durationMs))})
            ${phase.error ? ` - ${escapeHtml(phase.error)}` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
    <div class="result-section">
      <h3>Result Summary</h3>
      <p><strong>Challenge:</strong> ${result?.challenge ? `${result.challenge.hypothesesCount} hypotheses at ${escapeHtml(result.challenge.artifactPath)}` : 'unavailable'}</p>
      <p><strong>Recommendation:</strong> ${escapeHtml(result?.decision?.recommendation || 'unavailable')}</p>
      <p><strong>Artifacts:</strong> ${result?.assets?.files?.length ?? 0} file(s)</p>
      ${result?.assets?.projectPath ? `<p><strong>Project Path:</strong> <code>${escapeHtml(result.assets.projectPath)}</code></p>` : ''}
    </div>
    ${result?.assets?.files?.length ? `
      <div class="result-section">
        <h3>Artifacts</h3>
        <ul>
          ${result.assets.files.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div class="result-section">
      <h3>Next Steps</h3>
      <ul>
        ${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
      </ul>
    </div>
    <div class="result-section">
      <h3>Provider Reliability</h3>
      ${renderProviderSummary(executions)}
    </div>
  `;
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DecisionToAssetHandoff, DecisionArtifact } from '@prodmind/shared-types';

export async function writeDecisionArtifact(
  projectDir: string,
  handoff: DecisionToAssetHandoff
): Promise<string> {
  const artifact = handoff.artifact;
  const content = formatDecisionArtifact(artifact);

  const decisionPath = path.join(projectDir, `decision-${artifact.sessionId}.md`);
  await fs.writeFile(decisionPath, content, 'utf8');
  return decisionPath;
}

function formatDecisionArtifact(artifact: DecisionArtifact): string {
  const lines: string[] = [
    `# Decision Analysis: ${artifact.problem}`,
    '',
    `Session: ${artifact.sessionId}`,
    `Created: ${artifact.createdAt}`,
    `Steps: ${artifact.stepCount}`,
    '',
    '## Hypotheses',
    '',
  ];

  for (const hyp of artifact.summary.hypotheses) {
    lines.push(`- **${hyp.statement}** (confidence: ${hyp.confidence})`);
    if (hyp.evidence.length > 0) {
      lines.push(`  - Evidence: ${hyp.evidence.join(', ')}`);
    }
  }

  lines.push('', '## Risks', '');
  for (const risk of artifact.summary.risks) {
    lines.push(`- **${risk.description}** (severity: ${risk.severity})`);
    if (risk.mitigation) {
      lines.push(`  - Mitigation: ${risk.mitigation}`);
    }
  }

  lines.push('', '## Options', '');
  for (const opt of artifact.summary.options) {
    lines.push(`### ${opt.description}`);
    if (opt.pros.length > 0) {
      lines.push('**Pros:**');
      opt.pros.forEach((p: string) => lines.push(`- ${p}`));
    }
    if (opt.cons.length > 0) {
      lines.push('**Cons:**');
      opt.cons.forEach((c: string) => lines.push(`- ${c}`));
    }
    lines.push('');
  }

  lines.push('## Recommendation', '', artifact.summary.recommendation);

  return lines.join('\n');
}

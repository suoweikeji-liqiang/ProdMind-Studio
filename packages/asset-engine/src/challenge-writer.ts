import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChallengeToAssetHandoff, ChallengeArtifact } from '@prodmind/shared-types';

export async function writeChallengeArtifact(
  projectDir: string,
  handoff: ChallengeToAssetHandoff
): Promise<string> {
  const artifact = handoff.artifact;

  const content = [
    '# Challenge Output',
    '',
    `## Session: ${artifact.sessionId}`,
    `- Idea: ${artifact.idea}`,
    `- Rounds: ${artifact.roundCount}`,
    `- Converged: ${handoff.metadata.converged ? 'Yes' : 'No'}`,
    '',
    '## Hypotheses',
    ...artifact.hypotheses.map(h => `- [${h.priority}] ${h.statement}`),
    '',
    '## MVP Boundary',
    artifact.mvpBoundary,
    '',
    '## Conflicts',
    ...artifact.conflicts.map(c => `- ${c}`),
    '',
    '## Falsification Checks',
    ...artifact.falsificationChecks.map(f =>
      `- Hypothesis: ${f.hypothesis}\n  - Wrong because: ${f.wrongBecause}\n  - Minimal action: ${f.minimalAction}`
    ),
    '',
    '## Next Actions',
    ...artifact.nextActions.map(a => `- [${a.priority}] ${a.action}${a.timeframe ? ` (${a.timeframe})` : ''}`),
    '',
  ].join('\n');

  const challengePath = path.join(projectDir, 'challenge.md');
  await fs.writeFile(challengePath, content, 'utf8');
  return challengePath;
}

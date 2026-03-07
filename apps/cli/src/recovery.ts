import * as fs from 'fs';
import * as path from 'path';

export interface PhaseStatus {
  challenge: boolean;
  decision: boolean;
  asset: boolean;
}

export function detectCompletedPhases(projectPath: string): PhaseStatus {
  const challengePath = path.join(projectPath, 'challenge.md');
  const decisionPath = path.join(projectPath, 'assets', 'decision.json');

  return {
    challenge: fs.existsSync(challengePath) && fs.statSync(challengePath).size > 0,
    decision: fs.existsSync(decisionPath) && fs.statSync(decisionPath).size > 0,
    asset: false, // Always re-run asset phase (idempotent)
  };
}

export function shouldSkipPhase(phase: keyof PhaseStatus, completed: PhaseStatus): boolean {
  return completed[phase];
}

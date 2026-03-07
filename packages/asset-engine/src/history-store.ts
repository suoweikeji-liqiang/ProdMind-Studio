import * as fs from 'fs';
import * as path from 'path';
import type { WorkflowRun, WorkflowResult } from '@prodmind/shared-types';

export interface HistoryStore {
  saveRun(projectPath: string, run: WorkflowRun): Promise<void>;
  updateRun(projectPath: string, run: WorkflowRun): Promise<void>;
  saveResult(projectPath: string, result: WorkflowResult): Promise<void>;
  listRuns(projectPath: string): Promise<WorkflowRun[]>;
  getRun(projectPath: string, runId: string): Promise<WorkflowRun | null>;
  getResult(projectPath: string, runId: string): Promise<WorkflowResult | null>;
}

function getHistoryDir(projectPath: string): string {
  return path.join(projectPath, '.prodmind', 'history');
}

function getRunDir(projectPath: string, runId: string): string {
  return path.join(getHistoryDir(projectPath), runId);
}

function ensureHistoryDir(projectPath: string): void {
  const dir = getHistoryDir(projectPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createHistoryStore(): HistoryStore {
  return {
    async saveRun(projectPath: string, run: WorkflowRun): Promise<void> {
      ensureHistoryDir(projectPath);

      const runDir = getRunDir(projectPath, run.runId);
      if (!fs.existsSync(runDir)) {
        fs.mkdirSync(runDir, { recursive: true });
      }

      const runPath = path.join(runDir, 'run.json');
      fs.writeFileSync(runPath, JSON.stringify(run, null, 2), 'utf8');

      const runsFile = path.join(getHistoryDir(projectPath), 'runs.jsonl');
      const line = JSON.stringify({ runId: run.runId, idea: run.idea, status: run.status, startedAt: run.startedAt }) + '\n';
      fs.appendFileSync(runsFile, line, 'utf8');
    },

    async updateRun(projectPath: string, run: WorkflowRun): Promise<void> {
      const runPath = path.join(getRunDir(projectPath, run.runId), 'run.json');
      fs.writeFileSync(runPath, JSON.stringify(run, null, 2), 'utf8');
    },

    async saveResult(projectPath: string, result: WorkflowResult): Promise<void> {
      const resultPath = path.join(getRunDir(projectPath, result.runId), 'result.json');
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    },

    async listRuns(projectPath: string): Promise<WorkflowRun[]> {
      const runsFile = path.join(getHistoryDir(projectPath), 'runs.jsonl');
      if (!fs.existsSync(runsFile)) return [];

      const lines = fs.readFileSync(runsFile, 'utf8').trim().split('\n').filter(l => l);
      const runIds = lines.map(l => JSON.parse(l).runId).reverse();

      const runs: WorkflowRun[] = [];
      for (const runId of runIds) {
        const run = await this.getRun(projectPath, runId);
        if (run) runs.push(run);
      }
      return runs;
    },

    async getRun(projectPath: string, runId: string): Promise<WorkflowRun | null> {
      const runPath = path.join(getRunDir(projectPath, runId), 'run.json');
      if (!fs.existsSync(runPath)) return null;
      return JSON.parse(fs.readFileSync(runPath, 'utf8'));
    },

    async getResult(projectPath: string, runId: string): Promise<WorkflowResult | null> {
      const resultPath = path.join(getRunDir(projectPath, runId), 'result.json');
      if (!fs.existsSync(resultPath)) return null;
      return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    },
  };
}

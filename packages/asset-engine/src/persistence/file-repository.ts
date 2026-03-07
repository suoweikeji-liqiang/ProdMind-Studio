import * as fs from 'fs';
import * as path from 'path';
import type { PersistenceRepository, WorkflowRun, WorkflowResult } from '@prodmind/shared-types';

export function createFileRepository(basePath: string): PersistenceRepository {
  const historyDir = path.join(basePath, '.prodmind', 'history');

  function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function getRunDir(runId: string): string {
    return path.join(historyDir, runId);
  }

  return {
    async saveRun(run: WorkflowRun): Promise<void> {
      ensureDir(historyDir);
      const runDir = getRunDir(run.runId);
      ensureDir(runDir);

      const runPath = path.join(runDir, 'run.json');
      fs.writeFileSync(runPath, JSON.stringify(run, null, 2), 'utf8');

      const indexPath = path.join(historyDir, 'runs.jsonl');
      const line = JSON.stringify({
        runId: run.runId,
        idea: run.idea,
        status: run.status,
        startedAt: run.startedAt
      }) + '\n';
      fs.appendFileSync(indexPath, line, 'utf8');
    },

    async updateRun(run: WorkflowRun): Promise<void> {
      const runPath = path.join(getRunDir(run.runId), 'run.json');
      fs.writeFileSync(runPath, JSON.stringify(run, null, 2), 'utf8');
    },

    async saveResult(result: WorkflowResult): Promise<void> {
      const resultPath = path.join(getRunDir(result.runId), 'result.json');
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    },

    async listRuns(limit?: number): Promise<WorkflowRun[]> {
      const indexPath = path.join(historyDir, 'runs.jsonl');
      if (!fs.existsSync(indexPath)) return [];

      const lines = fs.readFileSync(indexPath, 'utf8').trim().split('\n').filter(l => l);
      const runIds = lines.map(l => JSON.parse(l).runId).reverse();
      const idsToFetch = limit ? runIds.slice(0, limit) : runIds;

      const runs: WorkflowRun[] = [];
      for (const runId of idsToFetch) {
        const run = await this.getRun(runId);
        if (run) runs.push(run);
      }
      return runs;
    },

    async getRun(runId: string): Promise<WorkflowRun | null> {
      const runPath = path.join(getRunDir(runId), 'run.json');
      if (!fs.existsSync(runPath)) return null;
      return JSON.parse(fs.readFileSync(runPath, 'utf8'));
    },

    async getResult(runId: string): Promise<WorkflowResult | null> {
      const resultPath = path.join(getRunDir(runId), 'result.json');
      if (!fs.existsSync(resultPath)) return null;
      return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    },
  };
}

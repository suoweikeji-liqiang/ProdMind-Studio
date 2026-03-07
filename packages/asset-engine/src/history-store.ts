import type { PersistenceRepository, PersistenceConfig, WorkflowRun, WorkflowResult } from '@prodmind/shared-types';
import { createRepository } from './persistence/factory.js';

export interface HistoryStore {
  saveRun(projectPath: string, run: WorkflowRun): Promise<void>;
  updateRun(projectPath: string, run: WorkflowRun): Promise<void>;
  saveResult(projectPath: string, result: WorkflowResult): Promise<void>;
  listRuns(projectPath: string): Promise<WorkflowRun[]>;
  getRun(projectPath: string, runId: string): Promise<WorkflowRun | null>;
  getResult(projectPath: string, runId: string): Promise<WorkflowResult | null>;
}

export function createHistoryStore(config?: PersistenceConfig): HistoryStore {
  const repos = new Map<string, PersistenceRepository>();

  function getRepo(projectPath: string): PersistenceRepository {
    if (!repos.has(projectPath)) {
      const repoConfig: PersistenceConfig = config || { backend: 'file', basePath: projectPath };
      if (!config) {
        repoConfig.basePath = projectPath;
      }
      repos.set(projectPath, createRepository(repoConfig));
    }
    return repos.get(projectPath)!;
  }

  return {
    async saveRun(projectPath: string, run: WorkflowRun): Promise<void> {
      await getRepo(projectPath).saveRun(run);
    },

    async updateRun(projectPath: string, run: WorkflowRun): Promise<void> {
      await getRepo(projectPath).updateRun(run);
    },

    async saveResult(projectPath: string, result: WorkflowResult): Promise<void> {
      await getRepo(projectPath).saveResult(result);
    },

    async listRuns(projectPath: string): Promise<WorkflowRun[]> {
      return getRepo(projectPath).listRuns();
    },

    async getRun(projectPath: string, runId: string): Promise<WorkflowRun | null> {
      return getRepo(projectPath).getRun(runId);
    },

    async getResult(projectPath: string, runId: string): Promise<WorkflowResult | null> {
      return getRepo(projectPath).getResult(runId);
    },
  };
}

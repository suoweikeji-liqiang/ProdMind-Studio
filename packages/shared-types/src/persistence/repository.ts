import type { WorkflowRun, WorkflowResult } from '../workflow/history.js';

export interface PersistenceRepository {
  saveRun(run: WorkflowRun): Promise<void>;
  updateRun(run: WorkflowRun): Promise<void>;
  saveResult(result: WorkflowResult): Promise<void>;
  listRuns(limit?: number): Promise<WorkflowRun[]>;
  getRun(runId: string): Promise<WorkflowRun | null>;
  getResult(runId: string): Promise<WorkflowResult | null>;
}

export interface PersistenceConfig {
  backend: 'file' | 'sqlite';
  basePath?: string;
  connectionString?: string;
}

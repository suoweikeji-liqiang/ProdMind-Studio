import Database from 'better-sqlite3';
import type { PersistenceRepository, WorkflowRun, WorkflowResult } from '@prodmind/shared-types';

export function createSqliteRepository(dbPath: string): PersistenceRepository {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      runId TEXT PRIMARY KEY,
      idea TEXT NOT NULL,
      status TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      completedAt TEXT,
      phases TEXT NOT NULL,
      error TEXT,
      providerExecutions TEXT
    );

    CREATE TABLE IF NOT EXISTS results (
      runId TEXT PRIMARY KEY,
      challenge TEXT,
      decision TEXT,
      assets TEXT,
      providerExecutions TEXT,
      FOREIGN KEY (runId) REFERENCES runs(runId)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_started ON runs(startedAt DESC);
  `);

  return {
    async saveRun(run: WorkflowRun): Promise<void> {
      const stmt = db.prepare(`
        INSERT INTO runs (runId, idea, status, startedAt, completedAt, phases, error, providerExecutions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        run.runId,
        run.idea,
        run.status,
        run.startedAt,
        run.completedAt || null,
        JSON.stringify(run.phases),
        run.error || null,
        run.providerExecutions ? JSON.stringify(run.providerExecutions) : null
      );
    },

    async updateRun(run: WorkflowRun): Promise<void> {
      const stmt = db.prepare(`
        UPDATE runs
        SET status = ?, completedAt = ?, phases = ?, error = ?, providerExecutions = ?
        WHERE runId = ?
      `);
      stmt.run(
        run.status,
        run.completedAt || null,
        JSON.stringify(run.phases),
        run.error || null,
        run.providerExecutions ? JSON.stringify(run.providerExecutions) : null,
        run.runId
      );
    },

    async saveResult(result: WorkflowResult): Promise<void> {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO results (runId, challenge, decision, assets, providerExecutions)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        result.runId,
        result.challenge ? JSON.stringify(result.challenge) : null,
        result.decision ? JSON.stringify(result.decision) : null,
        result.assets ? JSON.stringify(result.assets) : null,
        result.providerExecutions ? JSON.stringify(result.providerExecutions) : null
      );
    },

    async listRuns(limit?: number): Promise<WorkflowRun[]> {
      const stmt = db.prepare(`
        SELECT * FROM runs ORDER BY startedAt DESC ${limit ? 'LIMIT ?' : ''}
      `);
      const rows = limit ? stmt.all(limit) : stmt.all();
      return rows.map((row: any) => ({
        runId: row.runId,
        idea: row.idea,
        status: row.status,
        startedAt: row.startedAt,
        completedAt: row.completedAt || undefined,
        phases: JSON.parse(row.phases),
        error: row.error || undefined,
        providerExecutions: row.providerExecutions ? JSON.parse(row.providerExecutions) : undefined,
      }));
    },

    async getRun(runId: string): Promise<WorkflowRun | null> {
      const stmt = db.prepare('SELECT * FROM runs WHERE runId = ?');
      const row: any = stmt.get(runId);
      if (!row) return null;
      return {
        runId: row.runId,
        idea: row.idea,
        status: row.status,
        startedAt: row.startedAt,
        completedAt: row.completedAt || undefined,
        phases: JSON.parse(row.phases),
        error: row.error || undefined,
        providerExecutions: row.providerExecutions ? JSON.parse(row.providerExecutions) : undefined,
      };
    },

    async getResult(runId: string): Promise<WorkflowResult | null> {
      const stmt = db.prepare('SELECT * FROM results WHERE runId = ?');
      const row: any = stmt.get(runId);
      if (!row) return null;
      return {
        runId: row.runId,
        challenge: row.challenge ? JSON.parse(row.challenge) : undefined,
        decision: row.decision ? JSON.parse(row.decision) : undefined,
        assets: row.assets ? JSON.parse(row.assets) : undefined,
        providerExecutions: row.providerExecutions ? JSON.parse(row.providerExecutions) : undefined,
      };
    },
  };
}

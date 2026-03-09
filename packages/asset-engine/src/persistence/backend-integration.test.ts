import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { createHistoryStore } from '../history-store.js';
import { createSqliteRepository } from './sqlite-repository.js';
import type { WorkflowRun, WorkflowResult } from '@prodmind/shared-types';
import * as fs from 'fs';
import * as path from 'path';

describe('HistoryStore - Backend Integration', () => {
  const testDir = path.join(process.cwd(), '.test-history-backends');
  const require = createRequire(import.meta.url);
  const sqliteAvailable = (() => {
    try {
      require('better-sqlite3');
      createSqliteRepository(path.join(process.cwd(), '.test-sqlite-probe.db'));
      return true;
    } catch {
      return false;
    }
  })();

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const testRun: WorkflowRun = {
    runId: 'test-run-1',
    idea: 'Test idea',
    status: 'running',
    startedAt: new Date().toISOString(),
    phases: [
      { phase: 'challenge', status: 'completed', startedAt: new Date().toISOString() }
    ],
    providerExecutions: [
      {
        selectedProvider: 'fake',
        selectedModel: 'fake-default',
        attempts: 1,
        retriesPerformed: 0,
        timeoutCount: 0,
        fallbackUsed: false,
        usage: {
          requestCount: 1,
          tokenAvailability: 'estimated',
          totalTokens: 21,
          costAvailability: 'unavailable',
        },
      },
    ],
  };

  const testResult: WorkflowResult = {
    runId: 'test-run-1',
    challenge: {
      artifactPath: '/test/path',
      hypothesesCount: 3,
    },
    providerExecutions: [
      {
        selectedProvider: 'fake',
        selectedModel: 'fake-default',
        attempts: 1,
        retriesPerformed: 0,
        timeoutCount: 0,
        fallbackUsed: false,
        usage: {
          requestCount: 1,
          tokenAvailability: 'estimated',
          totalTokens: 21,
          costAvailability: 'unavailable',
        },
      },
    ],
  };

  describe('File Backend', () => {
    it('should save and retrieve run', async () => {
      const store = createHistoryStore({ backend: 'file', basePath: testDir });
      await store.saveRun(testDir, testRun);
      const retrieved = await store.getRun(testDir, testRun.runId);
      expect(retrieved).toEqual(testRun);
    });

    it('should update run', async () => {
      const store = createHistoryStore({ backend: 'file', basePath: testDir });
      await store.saveRun(testDir, testRun);
      const updated = { ...testRun, status: 'completed' as const };
      await store.updateRun(testDir, updated);
      const retrieved = await store.getRun(testDir, testRun.runId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.status).toBe('completed');
    });

    it('should save and retrieve result', async () => {
      const store = createHistoryStore({ backend: 'file', basePath: testDir });
      await store.saveRun(testDir, testRun);
      await store.saveResult(testDir, testResult);
      const retrieved = await store.getResult(testDir, testResult.runId);
      expect(retrieved).toEqual(testResult);
    });

    it('should list runs', async () => {
      const store = createHistoryStore({ backend: 'file', basePath: testDir });
      await store.saveRun(testDir, testRun);
      const runs = await store.listRuns(testDir);
      expect(runs).toHaveLength(1);
      expect(runs[0]!.runId).toBe(testRun.runId);
    });
  });

  describe.skipIf(!sqliteAvailable)('SQLite Backend', () => {
    it('should save and retrieve run', async () => {
      const store = createHistoryStore({
        backend: 'sqlite',
        connectionString: path.join(testDir, 'test.db')
      });
      await store.saveRun(testDir, testRun);
      const retrieved = await store.getRun(testDir, testRun.runId);
      expect(retrieved).toEqual(testRun);
    });

    it('should update run', async () => {
      const store = createHistoryStore({
        backend: 'sqlite',
        connectionString: path.join(testDir, 'test.db')
      });
      await store.saveRun(testDir, testRun);
      const updated = { ...testRun, status: 'completed' as const };
      await store.updateRun(testDir, updated);
      const retrieved = await store.getRun(testDir, testRun.runId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.status).toBe('completed');
    });

    it('should save and retrieve result', async () => {
      const store = createHistoryStore({
        backend: 'sqlite',
        connectionString: path.join(testDir, 'test.db')
      });
      await store.saveRun(testDir, testRun);
      await store.saveResult(testDir, testResult);
      const retrieved = await store.getResult(testDir, testResult.runId);
      expect(retrieved).toEqual(testResult);
    });

    it('should list runs', async () => {
      const store = createHistoryStore({
        backend: 'sqlite',
        connectionString: path.join(testDir, 'test.db')
      });
      await store.saveRun(testDir, testRun);
      const runs = await store.listRuns(testDir);
      expect(runs).toHaveLength(1);
      expect(runs[0]!.runId).toBe(testRun.runId);
    });
  });
});

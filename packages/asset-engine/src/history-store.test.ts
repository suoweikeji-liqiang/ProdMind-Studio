import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHistoryStore } from './history-store.js';
import type { WorkflowRun, WorkflowResult } from '@prodmind/shared-types';
import * as fs from 'fs';
import * as path from 'path';

describe('HistoryStore', () => {
  const testDir = path.join(process.cwd(), '.test-history');
  const store = createHistoryStore();

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('saves and retrieves a workflow run', async () => {
    const run: WorkflowRun = {
      runId: 'run-1',
      idea: 'Test idea',
      status: 'running',
      startedAt: new Date().toISOString(),
      phases: [
        { phase: 'challenge', status: 'pending' },
        { phase: 'decision', status: 'pending' },
        { phase: 'asset', status: 'pending' },
      ],
    };

    await store.saveRun(testDir, run);
    const retrieved = await store.getRun(testDir, 'run-1');

    expect(retrieved).toEqual(run);
  });

  it('updates an existing run', async () => {
    const run: WorkflowRun = {
      runId: 'run-2',
      idea: 'Test idea',
      status: 'running',
      startedAt: new Date().toISOString(),
      phases: [{ phase: 'challenge', status: 'running' }],
    };

    await store.saveRun(testDir, run);

    const updated: WorkflowRun = {
      ...run,
      status: 'completed',
      completedAt: new Date().toISOString(),
      phases: [{ phase: 'challenge', status: 'completed', durationMs: 1000 }],
    };

    await store.updateRun(testDir, updated);
    const retrieved = await store.getRun(testDir, 'run-2');

    expect(retrieved?.status).toBe('completed');
    expect(retrieved?.completedAt).toBeDefined();
  });

  it('saves and retrieves workflow result', async () => {
    const run: WorkflowRun = {
      runId: 'run-3',
      idea: 'Test',
      status: 'completed',
      startedAt: new Date().toISOString(),
      phases: [],
    };

    await store.saveRun(testDir, run);

    const result: WorkflowResult = {
      runId: 'run-3',
      challenge: { artifactPath: 'challenge.md', hypothesesCount: 3 },
      decision: { artifactPath: 'decision.json', recommendation: 'Use approach A' },
    };

    await store.saveResult(testDir, result);
    const retrieved = await store.getResult(testDir, 'run-3');

    expect(retrieved).toEqual(result);
  });

  it('lists runs in reverse chronological order', async () => {
    const run1: WorkflowRun = {
      runId: 'run-a',
      idea: 'First',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      phases: [],
    };

    const run2: WorkflowRun = {
      runId: 'run-b',
      idea: 'Second',
      status: 'running',
      startedAt: '2026-01-02T00:00:00Z',
      phases: [],
    };

    await store.saveRun(testDir, run1);
    await store.saveRun(testDir, run2);

    const runs = await store.listRuns(testDir);

    expect(runs).toHaveLength(2);
    expect(runs[0]!.runId).toBe('run-b');
    expect(runs[1]!.runId).toBe('run-a');
  });

  it('returns null for non-existent run', async () => {
    const run = await store.getRun(testDir, 'non-existent');
    expect(run).toBeNull();
  });

  it('returns empty array when no runs exist', async () => {
    const runs = await store.listRuns(testDir);
    expect(runs).toEqual([]);
  });
});

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];

function createLintRoot() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'prodmind-lint-'));
  tempRoots.push(rootDir);
  return rootDir;
}

function runLint(scope: string) {
  return spawnSync('node', ['scripts/lint.mjs', '--scope', scope], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('scripts/lint.mjs', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const rootDir = tempRoots.pop();
      if (rootDir) {
        rmSync(rootDir, { recursive: true, force: true });
      }
    }
  });

  it('ignores prodmind-project runtime output directories', () => {
    const rootDir = createLintRoot();
    const runtimeDir = path.join(rootDir, 'prodmind-project');

    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(path.join(runtimeDir, 'challenge.md'), 'generated line with padding   \n');

    const result = runLint(rootDir);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('still reports trailing whitespace in source directories', () => {
    const rootDir = createLintRoot();
    const sourceDir = path.join(rootDir, 'src');
    const runtimeDir = path.join(rootDir, 'prodmind-project');
    const sourceFile = path.join(sourceDir, 'notes.md');

    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(sourceFile, 'needs cleanup   \n');
    writeFileSync(path.join(runtimeDir, 'challenge.md'), 'generated line with padding   \n');

    const result = runLint(rootDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(sourceFile);
    expect(result.stderr).toContain('trailing whitespace');
  });
});

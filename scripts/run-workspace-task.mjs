import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const task = process.argv[2];

const SUPPORTED_TASKS = new Set(["lint", "typecheck", "test", "build"]);

if (!SUPPORTED_TASKS.has(task)) {
  console.error(
    `unsupported task "${task}". expected one of: ${[
      ...SUPPORTED_TASKS,
    ].join(", ")}`
  );
  process.exit(1);
}

const workspaces = [
  { name: "@prodmind/shared-types", dir: "packages/shared-types" },
  { name: "@prodmind/llm-adapter", dir: "packages/llm-adapter" },
  { name: "@prodmind/asset-engine", dir: "packages/asset-engine" },
  { name: "@prodmind/challenge-engine", dir: "packages/challenge-engine" },
  { name: "@prodmind/decision-engine", dir: "packages/decision-engine" },
  { name: "@prodmind/app-cli", dir: "apps/cli" },
  { name: "@prodmind/app-web", dir: "apps/web" },
];

const tscBin = path.join(rootDir, "node_modules", "typescript", "bin", "tsc");
const lintScript = path.join(rootDir, "scripts", "lint.mjs");
const testScript = path.join(rootDir, "scripts", "test-package.mjs");

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const workspace of workspaces) {
  if (!exists(workspace.dir)) {
    console.log(`[skip] missing workspace: ${workspace.dir}`);
    continue;
  }

  console.log(`\n>> ${task}: ${workspace.name}`);

  if (task === "lint") {
    run("node", [lintScript, "--scope", path.join(workspace.dir, "src")]);
    continue;
  }

  if (task === "typecheck") {
    run("node", [tscBin, "-p", path.join(workspace.dir, "tsconfig.json"), "--noEmit"]);
    continue;
  }

  if (task === "build") {
    run("node", [tscBin, "-p", path.join(workspace.dir, "tsconfig.json")]);
    continue;
  }

  run("node", [testScript, "--scope", workspace.dir, "--package", workspace.name]);
}

console.log(`\nworkspace ${task} completed.`);

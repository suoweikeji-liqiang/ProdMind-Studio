import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

function readArg(flag, fallback = undefined) {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  return args[i + 1] ?? fallback;
}

const scope = path.resolve(process.cwd(), readArg("--scope", "."));
const pkgName = readArg("--package", path.basename(scope));
const tscBin = path.resolve(process.cwd(), "node_modules", "typescript", "bin", "tsc");
const workspaceBuildOrder = [
  { name: "@prodmind/shared-types", dir: "packages/shared-types" },
  { name: "@prodmind/llm-adapter", dir: "packages/llm-adapter" },
  { name: "@prodmind/asset-engine", dir: "packages/asset-engine" },
  { name: "@prodmind/challenge-engine", dir: "packages/challenge-engine" },
  { name: "@prodmind/decision-engine", dir: "packages/decision-engine" },
  { name: "@prodmind/app-cli", dir: "apps/cli" },
  { name: "@prodmind/app-web", dir: "apps/web" },
];

const searchRoots = [path.join(scope, "src"), path.join(scope, "test"), path.join(scope, "tests")];
const testFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full);
      continue;
    }
    if (/\.(test|spec)\.(ts|mts|cts|mjs|cjs|js)$/.test(entry.name)) {
      testFiles.push(full);
    }
  }
}

for (const root of searchRoots) {
  walk(root);
}

if (testFiles.length === 0) {
  console.log(`[test scaffold] ${pkgName}: no runnable tests found yet.`);
  console.log(
    `[TODO] add tests following docs/testing-standards.md and docs/test-layout.md.`
  );
  process.exit(0);
}

const vitestBin = path.resolve(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const currentWorkspaceIndex = workspaceBuildOrder.findIndex((workspace) => workspace.name === pkgName);
const buildTargets = currentWorkspaceIndex >= 0
  ? workspaceBuildOrder.slice(0, currentWorkspaceIndex + 1)
  : [{ name: pkgName, dir: path.relative(process.cwd(), scope) }];

for (const target of buildTargets) {
  const tsconfigPath = path.resolve(process.cwd(), target.dir, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) continue;

  const buildResult = spawnSync("node", [tscBin, "-p", tsconfigPath], {
    stdio: "inherit",
  });

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

const result = spawnSync("node", [vitestBin, "run", ...testFiles], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

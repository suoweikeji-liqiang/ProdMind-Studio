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

const searchRoots = [path.join(scope, "src"), path.join(scope, "tests")];
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
    if (/\.(test|spec)\.(mjs|cjs|js)$/.test(entry.name)) {
      testFiles.push(full);
    }
  }
}

for (const root of searchRoots) {
  walk(root);
}

if (testFiles.length === 0) {
  console.log(`[test scaffold] ${pkgName}: no runnable JS tests yet.`);
  console.log(
    `[TODO] add tests following docs/testing-standards.md and docs/test-layout.md.`
  );
  process.exit(0);
}

const result = spawnSync("node", ["--test", ...testFiles], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}


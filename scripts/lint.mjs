import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const scopeIndex = args.indexOf("--scope");
const scopeArg = scopeIndex >= 0 ? args[scopeIndex + 1] : ".";
const root = path.resolve(process.cwd(), scopeArg ?? ".");

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yaml",
  ".yml",
]);

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
]);

function shouldIgnoreDir(name) {
  return (
    IGNORED_DIRS.has(name) ||
    name === ".worktrees" ||
    name === ".prodmind" ||
    name === "prodmind-project" ||
    name.startsWith(".tmp-")
  );
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    const full = path.join(dir, entry.name);
    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
}

function checkFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    if (/[ \t]+$/.test(line)) {
      issues.push(`${filePath}:${lineNo} trailing whitespace`);
    }
  }

  return issues;
}

const files = [];
walk(root, files);

let issueCount = 0;
for (const file of files) {
  const issues = checkFile(file);
  for (const issue of issues) {
    issueCount += 1;
    console.error(issue);
  }
}

if (issueCount > 0) {
  console.error(`lint failed with ${issueCount} issue(s).`);
  process.exit(1);
}

console.log(`lint ok: scanned ${files.length} file(s) under ${root}.`);

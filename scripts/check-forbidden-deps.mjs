import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const forbiddenForPackages = new Set([
  "next",
  "react",
  "react-dom",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "zustand",
  "commander",
  "inquirer",
  "chalk",
  "ora",
]);

function listPackagesDir(baseRel) {
  const base = path.join(root, baseRel);
  if (!fs.existsSync(base)) return [];
  const entries = fs.readdirSync(base, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(base, e.name))
    .filter((dir) => fs.existsSync(path.join(dir, "package.json")));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectImports(content) {
  const specs = new Set();
  const patterns = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /export\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      specs.add(m[1]);
    }
  }
  return [...specs];
}

function walkSource(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walkSource(full, out);
      continue;
    }
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
}

const packageDirs = listPackagesDir("packages");
const errors = [];

for (const pkgDir of packageDirs) {
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const pkgJson = readJson(pkgJsonPath);
  const pkgName = pkgJson.name ?? pkgDir;

  const dependencyFields = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  for (const field of dependencyFields) {
    const deps = pkgJson[field] ?? {};
    for (const depName of Object.keys(deps)) {
      if (forbiddenForPackages.has(depName)) {
        errors.push(`${pkgName}: forbidden dependency "${depName}" in ${field}`);
      }
    }
  }

  const srcFiles = [];
  walkSource(path.join(pkgDir, "src"), srcFiles);
  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const imports = collectImports(content);
    for (const spec of imports) {
      const rootSpecifier = spec.startsWith("@")
        ? spec.split("/").slice(0, 2).join("/")
        : spec.split("/")[0];
      if (forbiddenForPackages.has(rootSpecifier)) {
        errors.push(
          `${pkgName}: forbidden import "${rootSpecifier}" in ${path.relative(
            root,
            filePath
          )}`
        );
      }
    }
  }
}

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`forbidden-deps-check: ${err}`);
  }
  process.exit(1);
}

console.log("forbidden-deps-check ok.");
console.log(
  "[TODO] extend rules to app-level policies when CLI/Web implementation starts."
);


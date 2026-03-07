import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const workspaceRoots = ["packages", "apps"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listWorkspacePackages() {
  const out = [];
  for (const base of workspaceRoots) {
    const absBase = path.join(root, base);
    if (!fs.existsSync(absBase)) continue;
    const entries = fs.readdirSync(absBase, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgDir = path.join(absBase, entry.name);
      const pkgJsonPath = path.join(pkgDir, "package.json");
      if (!fs.existsSync(pkgJsonPath)) continue;
      const pkgJson = readJson(pkgJsonPath);
      out.push({
        dir: pkgDir,
        packageJsonPath: pkgJsonPath,
        name: pkgJson.name,
        packageJson: pkgJson,
      });
    }
  }
  return out;
}

const packages = listWorkspacePackages();
const byName = new Map(packages.map((p) => [p.name, p]));

const allowedInternalDeps = {
  "@prodmind/app-cli": [
    "@prodmind/challenge-engine",
    "@prodmind/decision-engine",
    "@prodmind/asset-engine",
    "@prodmind/shared-types",
    "@prodmind/llm-adapter",
  ],
  "@prodmind/app-web": [
    "@prodmind/challenge-engine",
    "@prodmind/decision-engine",
    "@prodmind/asset-engine",
    "@prodmind/shared-types",
    "@prodmind/llm-adapter",
  ],
  "@prodmind/challenge-engine": [
    "@prodmind/shared-types",
    "@prodmind/llm-adapter",
  ],
  "@prodmind/decision-engine": [
    "@prodmind/shared-types",
    "@prodmind/llm-adapter",
  ],
  "@prodmind/asset-engine": ["@prodmind/shared-types"],
  "@prodmind/llm-adapter": ["@prodmind/shared-types"],
  "@prodmind/shared-types": [],
};

const errors = [];

for (const pkg of packages) {
  if (!pkg.name) {
    errors.push(`package at ${pkg.dir} has no "name" in package.json`);
    continue;
  }

  if (!Object.prototype.hasOwnProperty.call(allowedInternalDeps, pkg.name)) {
    errors.push(`package ${pkg.name} has no boundary policy entry`);
    continue;
  }

  const allowed = new Set(allowedInternalDeps[pkg.name]);
  const dependencyFields = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  for (const field of dependencyFields) {
    const deps = pkg.packageJson[field] ?? {};
    for (const depName of Object.keys(deps)) {
      if (!depName.startsWith("@prodmind/")) continue;
      if (!allowed.has(depName)) {
        errors.push(
          `${pkg.name}: disallowed internal dependency "${depName}" in ${field}`
        );
      }
    }
  }
}

function walkSourceFiles(pkgDir) {
  const srcDir = path.join(pkgDir, "src");
  const out = [];
  if (!fs.existsSync(srcDir)) return out;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        walk(full);
        continue;
      }
      if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) out.push(full);
    }
  }

  walk(srcDir);
  return out;
}

function extractImports(content) {
  const specs = new Set();
  const patterns = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /export\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      specs.add(match[1]);
    }
  }
  return [...specs];
}

function resolveRelativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs"),
    path.join(base, "index.cjs"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

for (const pkg of packages) {
  const pkgName = pkg.name;
  if (!pkgName || !allowedInternalDeps[pkgName]) continue;
  const allowed = new Set(allowedInternalDeps[pkgName]);
  const files = walkSourceFiles(pkg.dir);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const imports = extractImports(content);
    for (const spec of imports) {
      if (spec.startsWith("@prodmind/")) {
        if (!allowed.has(spec)) {
          errors.push(`${pkgName}: disallowed import "${spec}" in ${filePath}`);
        }
        continue;
      }

      if (spec.startsWith(".")) {
        const resolved = resolveRelativeImport(filePath, spec);
        if (resolved && !resolved.startsWith(pkg.dir)) {
          errors.push(
            `${pkgName}: relative import escapes package boundary in ${filePath}: ${spec}`
          );
        }
      }
    }
  }
}

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`boundary-check: ${err}`);
  }
  process.exit(1);
}

console.log("boundary-check ok.");
console.log(
  "[TODO] upgrade to AST-level import graph checks and alias path resolution."
);


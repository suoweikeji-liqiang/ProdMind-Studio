import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredDocs = [
  "docs/ui-standards.md",
  "docs/testing-standards.md",
  "docs/quality-gates.md",
  "docs/repo-analysis.md",
  "docs/module-boundary.md",
  "docs/migration-plan.md",
  "docs/shared-types-plan.md",
  "docs/llm-adapter-contract.md",
  "docs/phase1-exclusion-list.md",
  "docs/phase1-definition-of-done.md",
  "docs/test-layout.md",
  "docs/ci-plan.md",
  "docs/README.md",
  "README.md",
];

const requiredRootReadmeLinks = [
  "docs/README.md",
  "docs/ui-standards.md",
  "docs/testing-standards.md",
  "docs/quality-gates.md",
  "docs/repo-analysis.md",
  "docs/module-boundary.md",
  "docs/migration-plan.md",
];

const requiredDocsIndexHeadings = [
  "## Architecture",
  "## Standards",
  "## Migration",
  "## Execution",
];

const requiredDocsIndexLinks = [
  "ui-standards.md",
  "testing-standards.md",
  "quality-gates.md",
  "repo-analysis.md",
  "module-boundary.md",
  "migration-plan.md",
];

const errors = [];

for (const rel of requiredDocs) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`missing required doc/file: ${rel}`);
  }
}

if (fs.existsSync(path.join(root, "README.md"))) {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  for (const token of requiredRootReadmeLinks) {
    if (!readme.includes(token)) {
      errors.push(`README.md missing reference: ${token}`);
    }
  }
}

if (fs.existsSync(path.join(root, "docs/README.md"))) {
  const docsReadme = fs.readFileSync(path.join(root, "docs/README.md"), "utf8");
  for (const heading of requiredDocsIndexHeadings) {
    if (!docsReadme.includes(heading)) {
      errors.push(`docs/README.md missing section heading: ${heading}`);
    }
  }
  for (const linkToken of requiredDocsIndexLinks) {
    if (!docsReadme.includes(linkToken)) {
      errors.push(`docs/README.md missing link token: ${linkToken}`);
    }
  }
}

if (errors.length > 0) {
  for (const err of errors) {
    console.error(`docs-check: ${err}`);
  }
  process.exit(1);
}

console.log("docs-check ok.");
console.log(
  "[TODO] upgrade docs-check to parse markdown links and validate URL/path targets."
);


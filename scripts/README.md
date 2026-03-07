# Scripts

Repository check scripts used by quality gates.

Current scripts:
- `lint.mjs` - basic repo/package lint checks (trailing whitespace)
- `check-docs.mjs` - required docs and docs index presence checks
- `check-boundaries.mjs` - simplified package boundary checks
- `check-forbidden-deps.mjs` - forbidden dependency/import checks for `packages/*`
- `test-package.mjs` - package test runner with scaffold fallback

Known TODO upgrades:
- replace regex import scanning with AST parser
- integrate ESLint and stricter lint policies
- enforce coverage thresholds in CI


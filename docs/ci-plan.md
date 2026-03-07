# CI Plan

## Goal
Provide a practical gate sequence now (local + future CI), aligned with `quality-gates.md`.

## Local Gate Order (recommended)
1. `pnpm run check:docs`
2. `pnpm run check:boundaries`
3. `pnpm run check:forbidden-deps`
4. `pnpm run lint`
5. `pnpm run typecheck`
6. `pnpm run test`
7. `pnpm run build`

Reason:
- Fail fast on structural violations before expensive compile/test steps.

## Future CI Pipeline Order

## Stage 1: Fast Structural Checks (parallel)
- `check:docs`
- `check:boundaries`
- `check:forbidden-deps`

## Stage 2: Code Health (parallel)
- `lint`
- `typecheck`

## Stage 3: Behavior Validation (serial after Stage 2)
- `test`

## Stage 4: Build Validation (serial after Stage 3)
- `build`

## Parallel vs Serial Guidance
- Parallel:
  - docs/boundary/forbidden checks
  - lint and typecheck
- Serial:
  - test after lint/typecheck
  - build after tests

## Blocking vs Warning
- Blocking (must fail merge):
  - `check:boundaries`
  - `check:forbidden-deps`
  - `typecheck`
  - `test`
  - `build`
- Warning (can pass with follow-up issue in early migration period):
  - parts of `lint` that are still scaffold-level TODO checks
  - docs wording quality (not docs existence/required-link checks)

## TODO Upgrades
- Replace current script-level checks with:
  - AST-based dependency graph for boundary checks
  - ESLint + import rules
  - test coverage threshold enforcement per package


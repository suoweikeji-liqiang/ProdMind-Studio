# @prodmind/asset-engine

Project state and artifact generation kernel.

Current state:
- scaffold only
- compile/test scripts wired

Boundary:
- allowed internal dependency: `@prodmind/shared-types`
- must not depend on CLI/Web shells
- must not call provider SDKs directly

TODO:
- implement Phase 1 core modules from `docs/migration-plan.md`


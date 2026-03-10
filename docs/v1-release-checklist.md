# V1 Release Checklist

## Release Gate

Ready for internal V1 release: yes.

This checklist is the gate for the conversation-first internal thinking tool V1. It is not a broader production rollout checklist.

## Blocking Checks

- [x] `pnpm run check:all`
- [x] Fake-provider happy path verified
- [x] Web main path verified
- [x] CLI auxiliary path verified
- [x] History revisit verified in Web and CLI
- [x] Failure and recovery semantics verified
- [x] `README.md`, `docs/runbook.md`, `docs/release-readiness.md`, and `docs/support-matrix.md` aligned

## Non-Blocking But Expected

- [ ] Opt-in real-provider smoke executed in the current environment
- [x] SQLite validation executed in the current environment

These remain non-blocking because V1 is still internal-pilot scoped and the default CI path stays fake-provider based.

## Required User Journey

1. Start from Web home page.
2. Start from a topic or reopen a session from Web.
3. Observe conversation progress and completion or failure semantics.
4. Review drafts, artifacts, or legacy structured results depending on the active path.
5. Reopen the session or run from Web history.
6. Reopen the same record from CLI history.

## Required Commands

```bash
pnpm run check:all
node scripts/test-package.mjs --scope apps/web --package @prodmind/app-web
node scripts/test-package.mjs --scope apps/cli --package @prodmind/app-cli
```

Optional operator-run validation:

```bash
node scripts/smoke-real-provider.mjs
node scripts/validate-sqlite-backend.mjs
```

## Blockers

Any of the following blocks internal V1 release:

- `check:all` failing
- Web happy path broken
- CLI history or revisit broken
- persisted history not usable for revisit
- docs/runbook/readiness materially mismatching current behavior

## Acceptable Known Limitations

- single-user only
- fake provider remains the default path
- real-provider smoke remains opt-in
- SQLite remains a secondary backend validation path
- usage and cost visibility is minimal, not billing-grade
- no auth, collaboration, workspace, marketplace, or dashboard product

## Final Acceptance Record

- Ready for internal V1 release: yes
- Why:
  - `pnpm run check:all` passed on 2026-03-09
  - Web main path and CLI auxiliary path both passed acceptance verification
  - History revisit worked in both shells
  - Result and failure semantics are now clearer and contract-backed
- Remaining blockers:
  - none for the internal V1 release target
- Limitations accepted into V1:
  - real-provider smoke was not executed in this environment because no provider API key was available
  - SQLite validation skipped with an explicit missing native-binding reason
  - single-user and internal-pilot scope remain unchanged

# Session Shell Chinese Consistency Design

**Date:** 2026-03-11

**Goal:** Tighten the Web V1 user-facing shell so the primary session journey reads consistently in Chinese, while keeping legacy workflow compatibility strictly behind the scenes.

## Scope

- Replace user-visible English mode labels in the session-first Web shell with Chinese labels.
- Localize replay fallback text that still exposes legacy workflow wording.
- Update the root README so Web is described as the primary, already-session-first product path.
- Remove obsolete skipped Web tests that are already superseded by active fake-provider coverage.

## Non-Goals

- No route, API, type, or persistence renaming for legacy workflow compatibility.
- No change to internal mode keys: `challenge`, `decision`, and `requirement-build` stay stable in code and stored data.
- No compatibility-layer removal in this pass.

## User-Facing Design

The UI should distinguish between internal keys and visible labels:

- `challenge` -> "质疑模式"
- `decision` -> "裁决模式"
- `requirement-build` -> "需求共建模式"

This applies to:

- Session page mode pills
- Session page current-mode summaries and hints
- Session history current-mode display
- Replay mode-switch events where the user sees mode names
- Replay fallback strings for legacy records

The visible shell should read as a Chinese product even when compatibility logic is active under the hood.

## Data and Architecture

No backend contracts change. The server continues to:

- accept and persist internal mode keys
- expose legacy redirects and `/api/workflow`
- fall back to legacy workflow history during replay

Only rendering and documentation change in this pass, plus test cleanup.

## Error Handling

Existing error states stay as-is. The cleanup only changes labels and explanatory copy, so all current request, replay, and finalize failure flows remain intact.

## Testing Strategy

- Update renderer tests first to assert the new Chinese labels and the removal of visible English fallback copy.
- Run the focused Web test file to verify the new assertions fail before implementation.
- Remove the two skipped tests that are already replaced by active fake-provider integration tests, so the suite no longer reports stale intentional gaps.
- Re-run the focused Web test file after implementation.

## Risks

- The touched files already have local uncommitted changes; edits must be applied from the `HEAD` baseline to avoid carrying forward mojibake.
- Some legacy English text is intentionally kept in internal APIs and code identifiers; only user-visible copy should change here.

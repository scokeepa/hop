# Problem 1-Pager: HOP Issues #10, #14

## Background
HOP owns the desktop shell, studio-host overrides, release pipeline, and integration UI. `third_party/rhwp` stays read-only, so fixes should live in `apps/desktop`, `apps/studio-host`, docs, and tests unless the defect is proven to require upstream document-engine changes.

## Problem
- `#10`: Windows save/save-as can produce a broken HWP file even though upstream `rhwp` does not reproduce the issue.
- `#14`: Linux Korean input can still fail in the desktop app after a previous text-blur fix.

## Goal
- Make staged HWP saves fail closed if the frontend staging write is incomplete or not committed before native validation.
- Improve Linux IME composition reliability without changing upstream input logic.

## Non-goals
- Do not modify `third_party/rhwp`.
- Do not implement HWPX direct overwrite support as part of `#10`.
- Do not implement `#18` until the product spec is explicit enough to define the user flow, safety boundary, and acceptance criteria.
- Do not claim a full Linux distro matrix smoke without actual Linux runtime evidence.

## Constraints
- Cross-platform behavior must remain safe on macOS, Windows, and Linux.
- Save paths and file bytes must stay local; do not log private document contents.
- Linux IME changes must be scoped to Linux desktop behavior to avoid regressing browser/macOS/Windows input.

## Implementation outline
- `#10`: Keep the current native staged-save architecture, explicitly close the Tauri FS handle before native commit, and add a post-write size check before Rust reads and validates the staging file.
- `#14`: Keep the upstream textarea/composition handlers, but on Linux place the focused input element at the visible caret location with near-transparent styling instead of an offscreen fully hidden textarea.

## Verification plan
- Add focused Vitest coverage for staged-save ordering/size failure and Linux input-anchor calculation.
- Run targeted tests for changed files.
- Run `pnpm test`, `pnpm run build:studio`, `pnpm run clippy:desktop`, and `git diff --check`.

## Rollback or recovery notes
- Save integrity changes are fail-closed: if staging verification is too strict, users see a save error before the target file is replaced.
- Linux IME positioning is isolated behind Linux platform detection and can be reverted without affecting non-Linux input.
- `#18` remains intentionally deferred; there is no product code to roll back.

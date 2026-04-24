# Phase 01: Issue #12 Page Centering After Fullscreen

## Objective
Fix HOP’s stale page-centering behavior so rendered pages and overlay consumers remain horizontally aligned after fullscreen -> windowed transitions and other viewport-size changes.

## Root Cause To Address
- HOP replaced upstream CSS centering with explicit page-left calculation in `apps/studio-host/src/view/canvas-view.ts`.
- The visible page canvases keep their previous `left` value when the viewport width changes in single-column mode because `onViewportResize()` does not reposition already-rendered canvases.
- Overlay and hit-test code in HOP already depends on `resolveVirtualScrollPageLeft(...)`, so the page X position is HOP-owned and must stay coherent everywhere.

## Phase Discovery Gate
- [x] Re-read `apps/studio-host/src/view/canvas-view.ts`, `apps/studio-host/src/view/page-left.ts`, `third_party/rhwp/rhwp-studio/src/view/canvas-view.ts`, and `third_party/rhwp/rhwp-studio/src/view/viewport-manager.ts`.
- [ ] Reproduce the issue on macOS with a document that has multiple visible pages and confirm whether plain window resizes also expose stale `left` values.
- [x] Check whether table/cell overlays, ruler behavior, or other visible layers require an explicit reposition call when the viewport width changes.

## Implementation Checklist
- [x] Add a HOP-owned `repositionVisiblePages()` or equivalent path in `CanvasView` that reapplies `resolveVirtualScrollPageLeft(...)` to active page canvases whenever the viewport width changes.
- [x] Ensure the resize path updates visible pages even when grid mode does not change and a full rerender is not triggered.
- [x] Audit HOP-owned overlay consumers that cache page-left-derived coordinates and ensure they read the same helper after resize.
- [x] Keep `page-left.ts` as the only display-X translation helper; do not duplicate math in per-feature code.
- [x] Add or extend targeted tests so a viewport-width change proves that single-column page-left values are recomputed.

## Validation Strategy
- [x] Run `pnpm run test:studio`.
- [x] Add a focused Vitest regression for page-left or `CanvasView` resize behavior.
- [ ] Manual macOS smoke: open document -> enter fullscreen -> exit fullscreen -> verify page centering, caret hit-testing, and selection overlays stay aligned.

## Exit Criteria
- [x] Visible pages recenter immediately after fullscreen exit.
- [x] No overlay or hit-test drift is introduced by the fix.
- [x] The final solution stays entirely inside HOP-owned studio-host code.

## Phase-End Multi-Pass Review
- [x] Behavior review: fullscreen/windowed and ordinary resize behavior both remain correct
- [x] Coordinate review: canvases, overlays, and hit-testing use the same X-position rule
- [x] Upstream boundary review: no upstream files required editing
- [ ] Validation review: automated and manual evidence captured

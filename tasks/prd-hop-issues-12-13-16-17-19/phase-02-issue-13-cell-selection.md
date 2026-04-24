# Phase 02: Issue #13 Table Cell Selection Accessibility On macOS

## Objective
Make table cell selection reachable and usable on macOS without relying on default function-key behavior, while preserving the existing upstream cell-selection state machine.

## Root Cause To Address
- Upstream enters cell-selection mode via `F5`.
- HOP reuses that upstream keyboard handler and does not currently expose any HOP-owned menu or command path for cell selection.
- Apple documents that function keys are not standard app keys by default on macOS.
- HOP mouse logic only expands/toggles cell selections after cell-selection mode is already active, so the pointer path also lacks an entry point.

## Phase Discovery Gate
- [x] Re-read `third_party/rhwp/rhwp-studio/src/engine/input-handler-keyboard.ts`, `third_party/rhwp/rhwp-studio/src/engine/cursor.ts`, `apps/studio-host/src/engine/input-handler.ts`, `apps/studio-host/src/engine/input-handler-mouse.ts`, and `apps/desktop/src-tauri/src/menu.rs`.
- [ ] Reproduce the issue on macOS and verify whether `Fn+F5` works, whether plain `F5` fails, and whether cell merge is blocked specifically by inability to enter selection mode.
- [x] Confirm whether any remaining page-coordinate bug from Phase 01 affects table hit-testing in the same reproduction path.

## Implementation Checklist
- [x] Introduce a HOP-owned command such as `table:cell-selection-enter` that wraps the existing `CursorState.enterCellSelectionMode()` / phase-advance behavior without modifying upstream files.
- [x] Expose that command through a native macOS menu path and an in-app pointer path such as a context-menu item for tables.
- [x] Add a platform-safe accelerator or alternate shortcut on macOS that does not depend on default function-key behavior, while keeping `F5` compatibility for users who already use it.
- [x] Extend pointer behavior so modifier-click or another explicit mouse path can enter selection mode from a normal cell caret before range expansion / toggle logic runs.
- [x] Add focused tests for command dispatch and selection-state transitions wherever they can be represented cheaply.

## Validation Strategy
- [x] Run `pnpm run test:studio`.
- [x] Add or extend unit tests around command dispatch and desktop menu event routing if new command IDs are introduced.
- [ ] Manual macOS smoke: create table -> enter cell-selection mode from the new path -> select multiple cells -> merge -> exit selection mode.
- [ ] Manual non-macOS sanity check: existing `F5` behavior still works and is not regressed.

## Exit Criteria
- [x] macOS users can enter cell-selection mode without changing global keyboard settings.
- [x] A mouse-accessible path exists for reaching the same cell-selection state.
- [ ] Cell merge is demonstrably usable end-to-end on macOS.

## Phase-End Multi-Pass Review
- [x] Accessibility review: the entry path is discoverable and usable on macOS
- [x] State-machine review: HOP reuses upstream selection phases instead of forking them
- [x] Shortcut review: the new path does not conflict with existing HOP shortcuts
- [ ] Validation review: merge flow evidence captured on macOS

# Phase 03: Issue #16 Installed Font Discovery And Precedence

## Objective
Replace the current web-only font discovery assumption with a desktop-owned installed-font catalog so actual local fonts can be discovered and used, especially on macOS where the current path is weakest.

## Root Cause To Address
- HOP’s `core/font-loader` override registers substitute `@font-face` rules for many vendor families, including some Korean desktop fonts.
- HOP only skips those substitute registrations for a small hardcoded `OS_FONT_CANDIDATES` list, so real installed families outside that list can be silently shadowed.
- Upstream local font detection depends on `window.queryLocalFonts()`, which MDN marks as limited/experimental.
- Tauri uses WebKit on macOS/Linux, so a Chromium-only discovery assumption is not a safe desktop strategy.

## Phase Discovery Gate
- [x] Re-read `apps/studio-host/src/core/font-loader.ts`, `apps/studio-host/src/ui/toolbar.ts`, `third_party/rhwp/rhwp-studio/src/core/local-fonts.ts`, `third_party/rhwp/rhwp-studio/src/core/font-loader.ts`, and `apps/studio-host/vite.config.ts`.
- [ ] Confirm which font picker and dialog surfaces currently depend on `getLocalFonts()` or bundled registered families.
- [x] Confirm which native crate or helper should own installed-font discovery, with `usvg::fontdb` as the default first option because it already exists in the desktop crate.

## Implementation Checklist
- [x] Add a native desktop command that returns a normalized catalog of installed system/user fonts with family, style, and source metadata.
- [x] Add a HOP-owned font-catalog service or `core/local-fonts` override that hydrates the editor UI from the native catalog in desktop builds.
- [x] Refactor `font-loader` precedence so native-catalog families suppress substitute registrations for the same family name.
- [x] Preserve bundled substitute faces only as fallback for families that are not actually available through the native catalog.
- [x] Add targeted tests for native-catalog hydration, precedence decisions, and toolbar population using mocked desktop bridge data.

## Validation Strategy
- [x] Run `pnpm run test:studio`.
- [x] Run `pnpm run test:desktop` if native font discovery helpers are added in Rust.
- [x] Add focused unit tests for precedence rules: installed family present, installed family absent, and substitute fallback only.
- [ ] Manual macOS smoke: install a font that is not in the hardcoded HOP alias list, relaunch HOP, choose the font, and verify that the rendered document changes to the actual installed family.

## Exit Criteria
- [x] Desktop builds expose installed local fonts without depending on `queryLocalFonts()`.
- [x] HOP no longer shadows actual installed families with bundled substitute faces.
- [x] The font picker can show and apply a newly installed macOS font that was previously invisible.

## Phase-End Multi-Pass Review
- [x] Discovery review: the desktop font catalog source is explicit and testable
- [x] Precedence review: installed vs substitute resolution is deterministic
- [x] UI review: picker surfaces receive the same catalog data
- [ ] Validation review: macOS installed-font evidence captured

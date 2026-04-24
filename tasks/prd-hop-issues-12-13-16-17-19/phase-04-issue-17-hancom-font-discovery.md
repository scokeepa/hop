# Phase 04: Issue #17 Hancom And Vendor Font File Integration

## Objective
Extend the Phase 03 font-catalog design so HOP can discover and use supported vendor font files that are present locally but not installed as system fonts, starting with Windows Hancom environments.

## Root Cause To Address
- `queryLocalFonts()` only covers installed local fonts, not arbitrary vendor font files.
- User-reported Hancom fonts may live in versioned Hancom `Shared/TTF` directories.
- HOP’s editor path has no native file-backed font loader, while `pdf_export.rs` already uses a native font database and extra directory logic.
- Without a shared resolver, the editor and PDF export will continue to diverge.

## Phase Discovery Gate
- [x] Re-read `apps/desktop/src-tauri/src/pdf_export.rs`, `apps/studio-host/src/core/font-loader.ts`, and the Phase 03 design before editing.
- [x] Inventory the exact Windows font directories HOP should scan first: system fonts, per-user fonts, and Hancom versioned shared font roots.
- [x] Decide how file-backed fonts will be passed into the webview safely: byte loading + `FontFace`, asset protocol indirection, or another desktop-only mechanism.

## Implementation Checklist
- [x] Extend the native font catalog to support extra scanned directories and mark entries as `system-installed` vs `file-backed`.
- [x] Implement bounded discovery of Windows vendor roots, including Hancom shared font directories and per-user font locations.
- [x] Add a desktop command to load raw font bytes for file-backed entries and register them lazily in the editor only when needed.
- [x] Reuse the same discovery roots in `pdf_export.rs` so editor rendering and PDF export follow the same local font rules.
- [x] Add tests for directory discovery helpers and catalog normalization even if end-to-end proprietary font smoke remains manual.
- [x] Document fallback order and licensing boundaries so HOP never bundles or uploads discovered proprietary fonts.

## Validation Strategy
- [x] Run `pnpm run test:studio`.
- [x] Run `pnpm run test:desktop`.
- [x] Add focused unit tests for Windows path discovery / normalization helpers.
- [ ] Manual Windows smoke: place or verify Hancom fonts in a supported local directory, open a document using those fonts, confirm editor rendering and PDF export both resolve them.

## Exit Criteria
- [x] Supported vendor font files can be discovered without being bundled into the repo.
- [x] The editor can render those fonts through a HOP-owned file-backed load path.
- [x] PDF export and editor behavior use the same high-level discovery rules.

## Phase-End Multi-Pass Review
- [x] Resolver review: installed and file-backed font paths are clearly separated
- [x] Licensing review: no proprietary font binaries are shipped or logged
- [x] Parity review: editor and PDF export discovery rules match
- [ ] Validation review: Windows Hancom-font evidence captured

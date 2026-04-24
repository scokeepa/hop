# Context: HOP Issue Remediation (#12, #13, #16, #17, #19)

## Reviewed Inputs

### GitHub Issues
- `#12`: <https://github.com/golbin/hop/issues/12>
- `#13`: <https://github.com/golbin/hop/issues/13>
- `#16`: <https://github.com/golbin/hop/issues/16>
- `#17`: <https://github.com/golbin/hop/issues/17>
- `#19`: <https://github.com/golbin/hop/issues/19>

### HOP Docs And Ownership Rules
- `docs/architecture/UPSTREAM.md`
- `docs/DEVELOPMENT.md`
- `docs/operations/DESKTOP_RELEASE.md`
- `.github/workflows/hop-desktop.yml`

### HOP Code Surfaces
- View/layout ownership:
  - `apps/studio-host/src/view/canvas-view.ts`
  - `apps/studio-host/src/view/page-left.ts`
  - `third_party/rhwp/rhwp-studio/src/view/canvas-view.ts`
  - `third_party/rhwp/rhwp-studio/src/view/viewport-manager.ts`
- Table selection and macOS input path ownership:
  - `apps/studio-host/src/engine/input-handler.ts`
  - `apps/studio-host/src/engine/input-handler-mouse.ts`
  - `apps/desktop/src-tauri/src/menu.rs`
  - `third_party/rhwp/rhwp-studio/src/engine/input-handler-keyboard.ts`
  - `third_party/rhwp/rhwp-studio/src/engine/cursor.ts`
- Font/editor runtime ownership:
  - `apps/studio-host/src/core/font-loader.ts`
  - `apps/studio-host/src/ui/toolbar.ts`
  - `apps/studio-host/vite.config.ts`
  - `third_party/rhwp/rhwp-studio/src/core/local-fonts.ts`
  - `third_party/rhwp/rhwp-studio/src/core/font-loader.ts`
  - `third_party/rhwp/rhwp-studio/src/core/font-substitution.ts`
- Native desktop/runtime and PDF export:
  - `apps/desktop/src-tauri/src/lib.rs`
  - `apps/desktop/src-tauri/src/pdf_export.rs`
  - `apps/desktop/src-tauri/src/linux_runtime.rs`
- Override ownership list:
  - `apps/studio-host/hop-overrides.ts`

### External Official References
- MDN: Local Font Access API  
  <https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API>
- Tauri: Webview Versions  
  <https://v2.tauri.app/reference/webview-versions/>
- Apple Support: How to use the function keys on your Mac  
  <https://support.apple.com/en-us/102439>
- AppImage docs: Best practices / old-enough base system  
  <https://docs.appimage.org/reference/best-practices.html?highlight=libc>
- `tauri_runtime` docs: `WindowEvent` resize / scale-factor events  
  <https://docs.rs/tauri-runtime/latest/tauri_runtime/window/enum.WindowEvent.html>

## Current System Summary

### Ownership Boundary
HOP explicitly owns desktop runtime, menu/command routing, font loader overrides, file integration, and UI corrections. The repo documents that `third_party/rhwp` is read-only vendor source and that HOP should solve product-level behavior in `apps/desktop` or `apps/studio-host` first.

Design implication:
- All five issues belong inside the HOP-owned boundary already defined by the repo. No phase should start by planning an upstream patch.

### Issue #12: Page Centering After Fullscreen
Evidence:
- HOP overrides `canvas-view.ts` and `page-left.ts`.
- Upstream `canvas-view.ts` centers single-column pages using CSS `left: 50%` with `translateX(-50%)`.
- HOP changed this to an explicit computed pixel `left` based on `resolveVirtualScrollPageLeft(...)`.
- On `viewport-resize`, HOP `CanvasView.onViewportResize()` recalculates layout and updates visible pages, but it does not reapply `left` to already-rendered canvases unless grid mode changes trigger a full rerender.

Design implication:
- The issue is a HOP-owned stale-position bug. The fix should be a single repositioning path for visible canvases plus any overlay consumers that depend on page X coordinates.

### Issue #13: Table Cell Selection On macOS
Evidence:
- Upstream enters cell-selection mode on `F5` inside `input-handler-keyboard.ts`.
- HOP does not override the keyboard handler; it reuses the upstream `F5` logic.
- Apple documents that function keys are not standard app keys by default on macOS and often require `Fn`.
- HOP’s macOS native menu currently only exposes app/file/edit/view/window items and has no table-selection command.
- HOP mouse handling only supports range/toggle behavior when `cursor.isInCellSelectionMode()` is already true; it does not auto-enter cell-selection mode from a plain table caret.

Design implication:
- The primary defect is not just “selection logic broken”; HOP lacks a macOS-accessible entry path. A HOP-owned command surface is required before investigating deeper selection-state bugs.

### Issue #16: Installed Font Discovery And Real Font Precedence
Evidence:
- HOP overrides `core/font-loader` with a hardcoded family list that maps many vendor font family names to bundled substitute files.
- HOP only checks a very small `OS_FONT_CANDIDATES` list before registering substitute `@font-face` rules.
- If a real font is installed but is not in that small candidate list, HOP can still inject a substitute face under the same family name and shadow the real installed font.
- Upstream `local-fonts.ts` depends on `window.queryLocalFonts()`.
- Tauri uses WebView2/Chromium on Windows but WebKit on macOS and Linux.
- MDN marks Local Font Access as limited / experimental, and it is not a stable cross-webview strategy.

Design implication:
- HOP needs a native desktop font catalog and a new precedence model: real installed families first, file-backed local fonts second, bundled substitutes last.

### Issue #17: Hancom/Vendor Font File Discovery
Evidence:
- User-reported fonts include Hancom/vendor families and a known Hancom shared TTF path on Windows.
- The editor path has no native font enumeration or file-backed font loading.
- `pdf_export.rs` already uses `usvg::fontdb::Database`, loads system fonts, and adds some directory-specific fallbacks.
- `usvg` / `fontdb` is already a dependency in `apps/desktop/src-tauri/Cargo.toml`.
- `queryLocalFonts()` only exposes locally installed fonts, not arbitrary vendor font files in application directories.

Design implication:
- HOP can extend an existing native font-loading pattern rather than invent a new one. The editor and PDF export should converge on one HOP-owned local font resolver with explicit source categories.

### Issue #19: Ubuntu 22.04 Compatibility
Evidence:
- The GitHub Actions Linux build currently runs on `ubuntu-24.04`.
- Release docs also list Linux x64 on `ubuntu-24.04`.
- AppImage’s own documentation says binaries should be built on a base system that is not newer than the oldest target system because `glibc` compatibility frequently breaks in the newer-to-older direction.

Design implication:
- The Linux release pipeline must stop assuming the runner image is a safe ABI baseline. A pinned older build environment plus ABI checks belongs in HOP’s release workflow.

## Validation Surface
- TypeScript / studio host validation:
  - `pnpm run test:studio`
  - focused Vitest additions beside existing files such as `page-left.test.ts`, `desktop-events.test.ts`, and new targeted tests for font and command behavior
- Rust / desktop validation:
  - `pnpm run test:desktop`
  - targeted Rust unit tests for new font directory discovery helpers or Linux ABI helper scripts
- Packaging / release validation:
  - workflow-level artifact ABI checks
  - manual or containerized smoke on Ubuntu 22.04
- Manual desktop smoke checks:
  - macOS fullscreen/windowed transitions
  - macOS table merge flow
  - macOS installed font selection
  - Windows Hancom/vendor font selection and PDF export parity

## Existing Patterns To Reuse
- `page-left.ts` already centralizes page-left calculation and should remain the only place that translates virtual-scroll page positions into display X coordinates.
- `menu.rs` already dispatches native menu commands into the webview, so adding HOP-owned desktop-only commands is low-risk.
- `pdf_export.rs` already uses `usvg::fontdb`, which is a strong candidate for the native font catalog shared with editor-side font discovery.
- `desktop-events.ts` and `tauri-bridge.ts` already hydrate desktop-specific state into the host, which is the right boundary for a future font catalog bootstrap.

## Constraints
- Do not edit `third_party/rhwp`.
- Do not ship proprietary fonts.
- Keep `pnpm` as the only package manager.
- Preserve stable release asset names documented in release notes and workflows.

## Design Principles For Implementation
- One page-positioning truth: all rendered pages and overlays derive from the same HOP helper.
- One desktop font catalog: the host should know which fonts are system-installed, file-backed, or substitute-only.
- One explicit precedence rule: installed > file-backed local > bundled substitute.
- One pinned Linux baseline: the workflow should make ABI intent explicit, not implicit.

## Known Gaps / Follow-Up Checks
- Confirm the best macOS accelerator or command surface for cell selection without introducing conflicts with existing shortcuts.
- Confirm the bounded set of Hancom installation directory patterns to support first.
- Confirm whether Linux release packaging should target Ubuntu 22.04 directly or use a dedicated container for even tighter reproducibility.

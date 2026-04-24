# PRD: HOP Issue Remediation (#12, #13, #16, #17, #19)

## Document Status
- Status: Draft
- File Mode: Split
- Current Phase: Phase 05
- Active Phase File: [Phase 05](./prd-hop-issues-12-13-16-17-19/phase-05-issue-19-linux-glibc-baseline.md)
- Context File: [context.md](./prd-hop-issues-12-13-16-17-19/context.md)
- Last Updated: 2026-04-24
- PRD File: `tasks/prd-hop-issues-12-13-16-17-19.md`
- Purpose: Living PRD and execution source of truth for resolving HOP-owned open issues `#12`, `#13`, `#16`, `#17`, and `#19` without patching `third_party/rhwp`.

## Problem
HOP has five open issues that sit in the desktop shell, studio host override, font/runtime integration, and Linux release pipeline rather than in the upstream `rhwp` engine itself.

- `#12`: fullscreen -> windowed transitions can leave the rendered A4 page off-center on macOS.
- `#13`: table cell selection is effectively inaccessible on macOS because the current entry path depends on an `F5`-driven upstream flow and HOP does not expose a platform-safe alternative.
- `#16`: actual installed fonts are not reliably discoverable or applied on macOS desktop builds, and HOP can silently shadow real installed families with bundled substitute faces.
- `#17`: Hancom and other vendor fonts that exist as local font files, but not as OS-installed system fonts, are not available to the editor path even though PDF export already has some native font loading behavior.
- `#19`: Linux release artifacts are built on a newer ABI baseline than Ubuntu 22.04 expects, creating a likely `glibc` compatibility failure.

Issue `#14` is explicitly out of scope for this PRD.

## Goals
- G-1: Resolve all five issues entirely within HOP-owned layers: `apps/studio-host`, `apps/desktop`, docs, and CI/release files.
- G-2: Keep the upstream update boundary intact so future `third_party/rhwp` updates remain a submodule bump plus small compatibility adjustments.
- G-3: Identify the concrete root cause for each issue before editing code, and design one clear validation path per issue rather than relying on ad hoc manual fixes.
- G-4: Improve desktop-specific architecture where needed so fixes compose cleanly: shared page positioning rules, explicit font catalog ownership, and pinned Linux release baselines.

## Non-Goals
- NG-1: Fix Linux IME issue `#14`.
- NG-2: Modify files under `third_party/rhwp`.
- NG-3: Introduce broad product redesign unrelated to the five issues.
- NG-4: Bundle proprietary third-party fonts into the repository or release artifacts.

## Success Criteria
- SC-1: After entering and exiting fullscreen on macOS, visible pages and selection overlays remain horizontally centered without requiring a manual extra resize.
- SC-2: On macOS, a user can enter table cell selection and merge cells without depending on default function-key settings.
- SC-3: On macOS desktop builds, installed fonts outside the current hardcoded alias list appear in the font picker and the actual installed family takes precedence over HOP substitutes.
- SC-4: On Windows, Hancom/vendor fonts located in supported local font directories can be discovered and used by both editor rendering and PDF export without copying those fonts into the repo.
- SC-5: Linux release artifacts produced by CI have a baseline compatible with Ubuntu 22.04, and the workflow includes ABI evidence instead of assuming compatibility.

## Key Scenarios
### Scenario 1: Fullscreen Round-Trip
- Actor: macOS desktop user
- Trigger: Open a document, enter fullscreen, exit fullscreen
- Expected outcome: The page stays centered and hit-testing/overlays remain aligned

### Scenario 2: Table Cell Merge On macOS
- Actor: macOS desktop user
- Trigger: Create a table, enter cell-selection mode, select a range, merge cells
- Expected outcome: Cell selection is reachable from a platform-safe command path and merge works

### Scenario 3: Use A Newly Installed Font
- Actor: macOS desktop user
- Trigger: Install a new local font, reopen HOP, choose that font in the editor
- Expected outcome: The new family is discoverable and renders as the actual installed font

### Scenario 4: Use Hancom Vendor Fonts
- Actor: Windows desktop user in a Hancom Office environment
- Trigger: Open a document that references Hancom/vendor fonts stored in local font directories
- Expected outcome: The editor can resolve those fonts and PDF export uses the same resolution strategy

### Scenario 5: Run Linux Artifact On Ubuntu 22.04
- Actor: Linux user on Ubuntu 22.04
- Trigger: Download the latest HOP release artifact and launch it
- Expected outcome: The artifact starts without a newer-`glibc` failure attributable to the build baseline

## Discovery Summary
- Reviewed: issue bodies for `#12`, `#13`, `#16`, `#17`, `#19`; `docs/architecture/UPSTREAM.md`; `docs/operations/DESKTOP_RELEASE.md`; `.github/workflows/hop-desktop.yml`; `apps/studio-host` overrides; `apps/desktop` runtime and PDF export code; official Tauri, Apple, MDN, and AppImage documentation listed in [context.md](./prd-hop-issues-12-13-16-17-19/context.md).
- Current system: HOP already owns viewport/page-left logic, desktop bridge/runtime code, macOS native menus, font loading overrides, and Linux packaging. The unresolved issues live inside those ownership boundaries rather than in upstream `rhwp`.
- Validation surface: `pnpm run test:studio`, targeted Vitest files, desktop Rust tests, workflow checks, manual smoke on macOS/Windows, and Linux artifact ABI inspection.
- Design implications: The fixes should converge on three HOP-owned primitives: one page-positioning source of truth, one desktop font catalog/resolver, and one pinned Linux build baseline.
- Confidence / gaps: Root cause for `#12`, `#16`, `#17`, and `#19` is strong from code + external evidence. `#13` still needs careful reproduction to separate pure accessibility gaps from any remaining coordinate bug, but the current entry-path design problem is already clear enough to plan against.

## Requirements
### Functional Requirements
- FR-1: All code changes for these issues must live outside `third_party/rhwp`.
- FR-2: Page centering logic must recompute visible page X positions whenever viewport width, zoom, fullscreen state, or scale factor changes affect layout.
- FR-3: Table cell-selection mode must have at least one HOP-owned, non-function-key entry path that works on macOS desktop builds.
- FR-4: HOP must own a desktop font catalog that can enumerate actual available font families instead of relying solely on web-only font APIs.
- FR-5: Real installed font families must take precedence over HOP’s substitute `@font-face` registrations.
- FR-6: HOP must support a second class of fonts that are available as local files in supported vendor/user directories even when they are not installed as system fonts.
- FR-7: Editor rendering and PDF export must share the same high-level local font discovery rules for supported extra directories.
- FR-8: Linux release builds must be produced from a stable baseline that is explicitly chosen to support Ubuntu 22.04.

### Non-Functional Requirements
- NFR-1: Preserve cross-platform behavior for macOS, Windows, and Linux.
- NFR-2: Preserve release asset names and updater artifact naming.
- NFR-3: Do not exfiltrate, log, or bundle private local font files.
- NFR-4: Prefer reusing existing crates and HOP-owned abstractions before adding new dependencies.
- NFR-5: Add focused regression tests or workflow checks wherever the bug can be represented cheaply and clearly.

## Assumptions
- A-1: Adding new Tauri commands and studio-host overrides is acceptable because these layers are already HOP-owned.
- A-2: A Linux container or older runner image can be introduced without changing release asset names.
- A-3: Hancom font roots vary by version, so discovery should support a bounded set of known directory patterns rather than one hardcoded version string.
- A-4: System-installed fonts can render in the desktop webview by family name once they are discoverable and no longer shadowed by substitute registrations.

## Dependencies / Constraints
- HOP must use `pnpm` only.
- `third_party/rhwp` remains read-only.
- Any font handling design must respect local licensing boundaries and avoid shipping proprietary font binaries.
- macOS fixes should prefer native menu or in-app command paths over asking users to change global system keyboard settings.
- Linux packaging changes must remain compatible with the existing GitHub Actions release flow.

## Risks / Edge Cases
- R-1: Fullscreen exit on macOS can coincide with resize and scale-factor changes, so page centering fixes must update canvases and overlays together.
- R-2: Non-Apple keyboards and Touch Bar variants make function-key-only commands fragile on macOS.
- R-3: Some fonts share family names across multiple files or styles; discovery and dynamic loading must normalize duplicates.
- R-4: Vendor font files may exist in user-specific, machine-wide, or versioned application directories.
- R-5: Moving Linux builds to an older ABI baseline can expose dependency availability differences that must be accounted for in CI.

## Execution Rules
- Complete phases in order unless this PRD is revised with new evidence.
- Before editing code, re-check the master PRD, [context.md](./prd-hop-issues-12-13-16-17-19/context.md), and the active phase file.
- Use HOP-owned adapters and overrides first; do not create a forked upstream patch as the primary solution.
- Record new evidence in the PRD if implementation changes the assumptions for a later phase.
- Prefer minimal, reversible changes with explicit tests or validation hooks over broad refactors.

## Phase Index
- [x] [Phase 01: Issue #12 Page Centering After Fullscreen](./prd-hop-issues-12-13-16-17-19/phase-01-issue-12-page-centering.md)
- [x] [Phase 02: Issue #13 Table Cell Selection Accessibility On macOS](./prd-hop-issues-12-13-16-17-19/phase-02-issue-13-cell-selection.md)
- [x] [Phase 03: Issue #16 Installed Font Discovery And Precedence](./prd-hop-issues-12-13-16-17-19/phase-03-issue-16-installed-font-application.md)
- [x] [Phase 04: Issue #17 Hancom And Vendor Font File Integration](./prd-hop-issues-12-13-16-17-19/phase-04-issue-17-hancom-font-discovery.md)
- [ ] [Phase 05: Issue #19 Linux ABI Baseline For Ubuntu 22.04](./prd-hop-issues-12-13-16-17-19/phase-05-issue-19-linux-glibc-baseline.md)

## Final Multi-Pass Review
- [ ] Product behavior review completed for all five issues
- [x] Upstream boundary review confirms no `third_party/rhwp` edits were required
- [x] Platform review confirms macOS, Windows, and Linux side effects are understood
- [ ] Validation evidence review confirms each issue has direct proof of resolution
- [x] Documentation and issue closure review updates release/dev docs as needed

## Change Log
- 2026-04-23: Initial split-file PRD created for issues `#12`, `#13`, `#16`, `#17`, and `#19`; issue `#14` explicitly excluded.
- 2026-04-24: Completed Phase 01 implementation for page recentering after resize/fullscreen transitions; added `CanvasView` regression coverage and kept the fix inside HOP-owned studio-host code.
- 2026-04-24: Completed Phase 02 implementation for macOS table cell-selection access; added a HOP-owned table selection command, menu/context entry points, mouse range-selection behavior, and regression coverage.
- 2026-04-24: Completed Phase 03 implementation for installed-font discovery and precedence; added a native desktop font catalog, HOP local-font hydration, and substitute suppression for real installed families.
- 2026-04-24: Completed Phase 04 implementation for Hancom/vendor font file support; added bounded desktop font-root discovery, a file-backed font byte bridge, shared editor/PDF discovery rules, and regression coverage for Windows path discovery plus webview font registration.
- 2026-04-24: Implemented Phase 05 Linux baseline changes; moved Linux CI builds to `ubuntu-22.04`, added a `GLIBC_2.35` gate plus AppImage extract smoke, and updated release docs. Final CI evidence is still pending an actual GitHub Actions run.

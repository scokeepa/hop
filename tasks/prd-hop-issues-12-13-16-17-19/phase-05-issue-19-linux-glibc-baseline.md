# Phase 05: Issue #19 Linux ABI Baseline For Ubuntu 22.04

## Objective
Pin the Linux release build to an explicit ABI baseline that supports Ubuntu 22.04 and prove that compatibility with workflow evidence instead of assumption.

## Root Cause To Address
- HOP’s Linux release pipeline currently builds on `ubuntu-24.04`.
- AppImage’s official guidance warns that binaries built on a newer base system often fail on older targets because of `glibc` and similar core-library version requirements.
- The repo currently documents and implements the newer baseline directly, so the compatibility problem is structural rather than incidental.

## Phase Discovery Gate
- [x] Re-read `.github/workflows/hop-desktop.yml`, `docs/operations/DESKTOP_RELEASE.md`, and `apps/desktop/src-tauri/tauri.conf.json`.
- [x] Confirm which Linux packages are required at build time and whether they exist cleanly on Ubuntu 22.04 or in a dedicated container image.
- [x] Decide whether the Linux baseline should be expressed by the runner image, a pinned container, or both. Prefer the most reproducible option.

## Implementation Checklist
- [x] Replace the Linux build baseline with an explicit Ubuntu 22.04-compatible environment and pair it with ABI evidence, while keeping the workflow maintainable.
- [x] Keep existing release asset names, updater keys, and release flow unchanged.
- [x] Add an ABI verification step that records the highest required `GLIBC_*` version for Linux release binaries or otherwise proves the target baseline.
- [x] Add a smoke path for Ubuntu 22.04 when practical, such as an AppImage extract run on the same Linux baseline job.
- [x] Update release/development docs so the intended Linux compatibility baseline is explicit.

## Validation Strategy
- [ ] Run workflow-level Linux build validation with the new baseline.
- [x] Capture ABI inspection output as part of CI logs or artifacts.
- [x] If practical, add an Ubuntu 22.04 smoke-run of the produced artifact.
- [x] Confirm release asset naming remains unchanged.

## Exit Criteria
- [x] Linux artifacts are no longer built on an ABI baseline newer than the intended Ubuntu 22.04 target.
- [ ] CI provides direct compatibility evidence.
- [x] Release docs reflect the new Linux baseline and any package recommendations.

## Phase-End Multi-Pass Review
- [x] ABI review: build environment and artifact inspection agree on the target baseline
- [x] Release review: asset names and updater flow remain stable
- [x] Docs review: release/development docs match the implementation
- [ ] Validation review: CI evidence is attached and understandable

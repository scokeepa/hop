# Linux Native Package Default 1-Pager

## Background

Issue #14 reports that Korean IME switching still fails only in the Linux AppImage on a CachyOS KDE Plasma Wayland environment. Native package installation converted from the release artifact works in the same environment.

## Problem

The AppImage bundles GTK/WebKit runtime pieces and a GTK input-method cache that can diverge from the host IME setup. The native `.deb` and `.rpm` packages use the host runtime path more directly, so they are a better default for Linux users who need reliable Korean input.

## Goal

Make Linux `.deb` the default public download, keep `.rpm` visible for RPM-based distributions, and keep AppImage as a portable fallback with an IME limitation notice.

## Non-goals

Do not remove the AppImage artifact. Do not force existing AppImage installs to migrate to `.deb` through the updater. Do not change Windows or macOS release behavior.

## Constraints

Release asset names must remain stable. Tauri updater installer-specific keys such as `linux-x86_64-appimage`, `linux-x86_64-deb`, and `linux-x86_64-rpm` must keep pointing at their matching package types. README, website, workflow, and release docs should agree on the Linux default.

Arch-based distributions are not covered by the `.deb` or `.rpm` packages. Converting the `.deb` with tools such as `debtap` is a user workaround, not an official package path, and can produce invalid Arch dependency names such as `gtk`.
Converted `.deb` installs can also keep Tauri's embedded bundle type as `deb`, so the in-app updater may later download a `.deb` and attempt a `dpkg -i` update on a non-Debian host. Do not document debtap conversion as a supported install or update path.

## Implementation Outline

Update README and website download links so Linux `.deb` is primary and `.rpm`/AppImage are secondary. Update release documentation to describe native Linux packages as the recommended download. Update the release workflow so the generic `linux-x86_64` updater fallback points to `.deb`, while AppImage-specific updates still use `linux-x86_64-appimage`.

## Verification Plan

Check all Linux download links and manifest key mappings with text search. Run focused release workflow syntax checks where practical; otherwise verify the changed shell calls preserve existing helper signatures and artifact names.

## Rollback

Revert the README/site/docs wording and switch the generic `linux-x86_64` updater fallback back to AppImage. Installer-specific Linux updater keys can remain unchanged.

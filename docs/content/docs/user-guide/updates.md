---
title: Updates
weight: 99
---

## 1.6.1 - Additional updates

- **Date:** 2026-02-15
- **Version:** 1.6.1

**Summary:** This release includes the changes listed below.

### Additional Changes

- Updated project path handling to normalize home-relative (`~`) and relative paths.
- Updated documentation into a full static site and rewrote getting-started content to be clearer and more task-focused.
- Updated CI and release automation to better validate installations and support manual publishing flows.
- Updated repository and documentation hygiene to reduce noise and clarify help output.
- Updated vouch and trust metadata to reflect current maintainer decisions.
- Updated package versions to reflect the set of changes shipped in this cycle.

### New Features

- Added a unified `/delete` command for notes and projects with optional `--force` confirmation bypass.

### Bug Fixes

- Fixed the chat interface so it reflects project changes immediately after project mutations.
- Fixed slash command parsing to handle quoted and empty quoted arguments more consistently.

### Breaking Changes

- Updated the command system to remove older specialized tools and commands in favor of the skill-based approach.


## 1.6.0 - Bun installation documentation

- **Date:** 2026-02-13
- **Version:** 1.6.0

**Summary:** This update addresses Bun installation guidance for configuring `trustedDependencies` before installing `@britt/llpm`.

### Additional Changes

- Updated Bun installation documentation to describe configuring Bun's `trustedDependencies` before installing `@britt/llpm` to reduce install-time trust and policy failures.

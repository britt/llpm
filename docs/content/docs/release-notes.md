---
title: Updates
weight: 99
---

## 1.9.1 - bug fixes and refinements

- **Date:** 2026-03-11
- **Version:** 1.9.1

**Summary:** This release covers targeted bug fixes and incremental refinements.

```json
{
  "Additional Changes": [
    "Updated the documentation structure to improve navigation and standardize page metadata across the docs site.",
    "Updated the command documentation to describe a unified ` /delete` command across notes and projects and to reduce duplicated guidance.",
    "Updated release-notes documentation to reflect newer releases and to use a more consistent Markdown format.",
    "Updated the package version to reflect the latest patch release."
  ],
  "Breaking Changes": [
    "Updated the internal data contracts to match the latest model, project, skill, tool, and LLM response schemas."
  ],
  "New Features": [
    "Added an event-driven mechanism so switching projects clears outdated chat content and reloads the correct history automatically."
  ]
}

```

## 1.9.0 - `/delete` command and docs site overhaul

- **Date:** 2026-02-15
- **Version:** 1.9.0

**Summary:** This release introduces the `/delete` command, transitions the command system to a skill-based approach, and updates documentation and CI.

### New Features

- Added a unified `/delete` command to remove notes or projects, including an optional `--force` flag to bypass confirmation.

### Breaking Changes

- Removed older specialized tools and commands and updated the command system to use the skill-based approach instead.

### Bug Fixes

- Resolved an issue where `ChatInterface` did not reload the current project after project switch, set, add, or remove operations.
- Fixed slash command parsing by using a shared quote-aware parser so quoted and empty-quoted arguments are handled consistently.

### Additional Changes

- Updated project path handling by normalizing `~` expansion and converting relative paths to absolute paths.
- Updated documentation by publishing a Hugo/Hextra static site under `docs/` and rewriting getting-started content with clearer CLI examples and prompt formatting.
- Updated GitHub Actions to validate `npm pack` and global installation on Node.js 18, 20, and 22, and to skip tests for docs-only changes.
- Refined repository hygiene by removing unused editor/config files, adding `.doc.holiday` exclusions for dot-directories and build artifacts, and cleaning redundant docs and CLI help headings.
- Updated `VOUCHED.td` to reflect current maintainer decisions.


## 1.6.0 - Bun installation documentation

- **Date:** 2026-02-13
- **Version:** 1.6.0

**Summary:** This update addresses Bun installation guidance for configuring `trustedDependencies` before installing `@britt/llpm`.

### Additional Changes

- Updated Bun installation documentation to describe configuring Bun's `trustedDependencies` before installing `@britt/llpm` to reduce install-time trust and policy failures.

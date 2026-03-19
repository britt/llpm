---
title: Updates
weight: 99
---

## 1.10.0 - release notes

- **Date:** 2026-03-19
- **Version:** 1.10.0

**Summary:** This release includes the updates listed below.

```json
{
  "Additional Changes": [
    "The skills guides and examples were updated to be less tied to specific vendors and to reflect the current set of built-in skills. The documentation now uses generic tool placeholders instead of GitHub-specific examples and updates the documented core skills count from 19 to 20.",
    "The release documentation for v1.9.1 was rewritten for clarity and consistency. The v1.9.1 notes now use structured Markdown sections (with updated wording and summaries) and include an added v1.9.1 section in the release-notes documentation.",
    "The package was released as v1.10.0 with maintenance improvements carried forward from the prior v1.9.1 work. The project version was bumped from 1.9.1 to 1.10.0 after prior tightening of TypeScript types, skill `instructions` metadata documentation, and runtime safety refinements."
  ],
  "Breaking Changes": [
    "Skill metadata now uses a single, consistent field name for tool permissions and a single value format. The skill frontmatter key has been standardized to `allowed-tools` and is documented as a space-delimited string (replacing `allowed_tools` and YAML-list variants), so existing skill files should be updated to match the new schema."
  ],
  "Bug Fixes": [
    "Skill documentation no longer references incorrect or unsupported metadata fields. The README/SKILL.md examples were corrected to use the current frontmatter schema (including `allowed-tools`) and to remove or replace unsupported fields with the newer metadata fields."
  ],
  "New Features": [
    "The command-line help output is now easier to read and more consistent across commands. The CLI now renders `/help` in Markdown and standardizes `--help`/`-h` handling across commands for unified help behavior."
  ]
}

```

## 1.9.1 - project switch chat reload

- **Date:** 2026-03-11
- **Version:** 1.9.1

**Summary:** This release includes project-switch chat state handling, schema alignment updates, and documentation refinements.

### New Features

- Added `ProjectEventBus` and a `project:switched` event so project switches clear stale chat content and reload history automatically.

### Breaking Changes

- Updated internal data contracts to align with updated `model`, `project`, `skill`, `tool`, and `LLMResponse` schemas; update custom integrations and test fixtures to match the new shapes.

### Additional Changes

- Updated the documentation structure to improve navigation and standardize page metadata across the docs site.
- Updated command documentation to describe a unified `/delete` command across notes and projects and reduce duplicated guidance.
- Updated release notes documentation to include recent versions and use a consistent Markdown structure.
- Updated the package version from `1.9.0` to `1.9.1`.

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

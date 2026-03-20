---
title: Updates
weight: 99
---

## 1.11.1 - `/history` viewer and marketplace Skills

- **Date:** 2026-03-19
- **Version:** 1.11.1

**Summary:** This release includes an interactive `/history` viewer, marketplace-backed skill discovery and installation, and related documentation, refactors, and security updates.

### New Features

- Added an interactive `/history` viewer with scrolling and search using Ink components (`HistoryViewer`, `HistorySearchBar`, `HistoryMessage`) and keyboard navigation.
- Added marketplace-backed skill discovery and installation via `search_marketplace_skills` and `install_skill`, including `SkillSource.marketplace` and a JSON-configured `MarketplaceService` with caching.
- Added an optional `timestamp` field to messages and began wiring it through creation and serialization paths.

### Bug Fixes

- Fixed `/history` argument validation and interactive output edge cases, with expanded tests for empty history and slicing boundaries.
- Fixed stale history message rendering by updating the `HistoryMessage` hook `useMemo` dependency to the full message object and adding regression coverage.
- Fixed history parsing by validating roles in `LogStringToMessage` and improving timestamp and content edge-case handling with additional tests.

### Security

- Updated PR automation workflows to use a GitHub token with `pull-requests: write` permissions and removed SSH deploy key usage.
- Updated marketplace sync and skill install and remove flows to add strict marketplace repository and skill name validation with fully mocked shell-execution tests.

### Additional Changes

- Updated `/history` documentation with keybindings and expanded manual verification guidance.
- Updated history formatting by extracting shared utilities into a separate module and updating tests to target the extracted utilities.
- Updated package versioning to `1.11.1` and tightened TypeScript typecheck and test hygiene to keep CI stable.
- Added a help-system planning document outlining intended improvements and test coverage expectations.

## 1.10.0 - CLI help output and skill metadata schema

- **Date:** 2026-03-19
- **Version:** 1.10.0

**Summary:** This release includes CLI help rendering improvements, standardized skill tool-permission metadata (via `allowed-tools`), and updates to skills documentation.

### New Features

- Added Markdown rendering for `/help` output and standardized `--help`/`-h` handling across commands.

### Breaking Changes

- Updated skill frontmatter to require `allowed-tools` as a space-delimited string for tool permissions.

### Bug Fixes

- Corrected skills documentation examples to use the current frontmatter schema and to remove unsupported metadata fields.

### Additional Changes

- Updated skills guides to use vendor-neutral tool placeholders and to reflect the current set of built-in skills.
- Updated v1.9.1 release notes to use structured Markdown sections and consistent wording.
- Updated the package version from `1.9.1` to `1.10.0`.

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

---
title: Updates
weight: 99
---

## 1.11.1 - maintenance update

- **Date:** 2026-03-19
- **Version:** 1.11.1

**Summary:** This release includes maintenance updates and stability improvements.

{
  "Additional Changes": [
    "The history viewer rollout is now fully documented with updated keybindings and expanded manual verification guidance. This updates `/history` documentation, records completion status in `PROGRESS.md`, and adds detailed verification scenarios (including quick smoke test updates and scenarios 10–14 in `VERIFICATION_PLAN.md`) to cover both history viewing and marketplace prerequisites.",
    "History formatting logic has been refactored into a shared module to simplify maintenance and testing. This extracts history formatting utilities into a separate module, updates imports, exports HistoryMessage helper functions, and rewrites tests to exercise the extracted logic rather than rendering.",
    "The project versioning and TypeScript build hygiene have been updated to reflect the latest release state. This bumps the package version through `1.11.0` to `1.11.1` and includes TypeScript typecheck fixes and test cleanup (including non-null assertions and consolidated imports) to keep CI stable.",
    "Planning for upcoming help system work is now captured to guide future implementation and testing. This adds a planning document describing intended help-system improvements and associated test coverage expectations."
  ],
  "Bug Fixes": [
    "The `/history` command now handles more edge cases and invalid inputs more reliably when generating interactive output. This tightens argument validation, adds stricter interactive type checks, and expands tests for help/empty-history behavior and slicing boundaries.",
    "History message rendering logic now updates consistently when the underlying message object changes to prevent stale UI output. This updates the `HistoryMessage` hook to depend on the full message object in `useMemo` rather than partial fields and adds regression coverage.",
    "History parsing now rejects invalid roles and better handles timestamp and content edge cases to avoid malformed entries in the viewer. This adds role validation in `LogStringToMessage` and extends tests for timestamp parsing and content boundary conditions."
  ],
  "New Features": [
    "Users can now browse prior chat output in an interactive history viewer that supports scrolling and searching from the command line. This adds Ink components (HistoryViewer, HistorySearchBar, and HistoryMessage) with keyboard navigation, match indicators, role-colored labels, and an interactive `history-view` `CommandResult` returned by `/history` through `useChat` into `ChatInterface`.",
    "The CLI can now install and discover skills from a configured marketplace instead of relying only on local sources. This introduces marketplace-backed tools (`search_marketplace_skills`, `install_skill`), adds `SkillSource.marketplace` and marketplace-aware source tagging in `SkillRegistry`, and implements a JSON-configured `MarketplaceService` with index caching/building and cross-marketplace search tests.",
    "Messages can now optionally include timestamps so history and other views can present more contextual metadata to the user. This adds an optional `timestamp` field and begins wiring it through message creation and serialization paths with supporting type updates."
  ],
  "Security": [
    "Automation workflows that create or manage pull requests now use a GitHub token with pull-request write permissions instead of an SSH deploy key. This updates the vouch manage-by-issue and manage-by-discussion workflows to run in PR mode with `pull-requests: write` and removes SSH deploy key usage.",
    "Marketplace syncing and skill install/remove flows now validate inputs more strictly to reduce the risk of unsafe repository or skill name usage. This adds strict validation for marketplace repo and skill names and introduces fully mocked, injectable shell-execution tests covering marketplace sync and skill installation/removal."
  ]
}


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

---
title: Updates
weight: 99
---

## 1.6.1 - Additional updates

- **Date:** 2026-02-15
- **Version:** 1.6.1

**Summary:** This release includes the changes listed below.

### Additional Changes

{
  "Additional Changes": [
    "Project paths are now normalized so users can provide home-relative or relative paths without manual cleanup. A new `expandPath()` utility performs `~` expansion and relative-to-absolute normalization and is used in `addProject` and the setup wizard, with CLI output, docs, and tests updated accordingly.",
    "Documentation has been rebuilt into a full static site and the getting-started content has been rewritten to be clearer and more task-focused. The project now includes a Hugo/Hextra docs site under `docs/`, revised homepage/quickstart/installation content (including `llpm`/`llpm run` examples, `/exit`, and `\u003e` prompt formatting), and contributing guide/index updates covering vouch-based access, PR workflow, and LLPM-driven issue creation/analysis.",
    "CI and release automation were updated to better validate installations and support manual publishing flows. GitHub Actions now verifies `npm pack` + global install on Node 18/20/22, skips tests for docs-only changes, and the npm publish workflow supports `workflow_dispatch` with a required `RELEASE_TAG`/`tag` input fallback.",
    "Repository and docs hygiene were improved to reduce noise and clarify help output. This removes unused editor/config files, adds a `.doc.holiday` exclusion config for dot-directories/build artifacts, and cleans up redundant headings/empty sections in docs and CLI help text.",
    "The project’s vouch/trust metadata was updated to reflect current maintainer decisions. The VOUCHED list was amended by adding a new name, with related documentation aligned in the contributing materials.",
    "The package version was advanced to reflect the set of changes shipped in this cycle. Versions were bumped across the sequence (including 1.8.2, 1.8.3, and ultimately 1.9.0 for the `/delete` addition) as part of the release process."
  ],
  "Breaking Changes": [
    "The command system has been reorganized so older specialized tools and commands are no longer available, and the new skill-based approach is the supported path forward. The prior elicitation/question/stakeholder/risk tool and command implementations were removed and replaced with five skills built on primitive tools (including a project-analysis skill), with corresponding updates to skills, registries, services/types, and tests."
  ],
  "Bug Fixes": [
    "The chat interface now reliably reflects project changes immediately after project mutations occur. A `projectSwitchTrigger` counter is propagated from `useChat` so `ChatInterface` reloads the current project after successful project switch/set/add/remove operations, with accompanying tests and a patch version bump.",
    "Slash command parsing now handles quoted and empty quoted arguments more consistently across commands. A shared quote-aware parser (`parseQuotedArgs` via `parseCommand`) was added and applied broadly, with updated stakeholder command expectations, new integration/unit tests, and fixes for empty quoted arguments."
  ],
  "New Features": [
    "You can now delete notes and projects using a single command, with an option to bypass confirmation when you are sure. The CLI adds a unified `/delete` command that targets both entities and supports `--force`, and it is registered in the command system with tests/docs updated as part of the 1.9.0 release."
  ]
}


## 1.6.0 - Bun installation documentation

- **Date:** 2026-02-13
- **Version:** 1.6.0

**Summary:** This update addresses Bun installation guidance for configuring `trustedDependencies` before installing `@britt/llpm`.

### Additional Changes

- Updated Bun installation documentation to describe configuring Bun's `trustedDependencies` before installing `@britt/llpm` to reduce install-time trust and policy failures.

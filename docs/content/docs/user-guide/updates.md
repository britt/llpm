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
    "Project paths are now normalized so users can provide home-relative or relative paths without manual cleanup.",
    "Documentation has been rebuilt into a full static site and the getting-started content has been rewritten to be clearer and more task-focused.",
    "CI and release automation were updated to better validate installations and support manual publishing flows.",
    "Repository and docs hygiene were improved to reduce noise and clarify help output.",
    "The project’s vouch/trust metadata was updated to reflect current maintainer decisions.",
    "The package version was advanced to reflect the set of changes shipped in this cycle."
  ],
  "Breaking Changes": [
    "The command system has been reorganized so older specialized tools and commands are no longer available, and the new skill-based approach is the supported path forward."
  ],
  "Bug Fixes": [
    "The chat interface now reliably reflects project changes immediately after project mutations occur.",
    "Slash command parsing now handles quoted and empty quoted arguments more consistently across commands."
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

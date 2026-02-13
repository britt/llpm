---
title: Updates
weight: 5
---

This page summarizes notable user-facing updates.

## v1.6.0: documentation and packaging updates

- Date: 2026-02-13
- Version: 1.6.0

This release covers documentation and packaging updates for `@britt/llpm`.

### New Features

- Added clearer guidance for `npm` and source-based installation, including prerequisites and configuration.

### Breaking Changes

- Updated the published package runtime requirement to `Node.js 18+`; update CI images and local runtimes to `Node.js 18` or later.

### Deprecations

- Removed documentation for an unimplemented proxy approach to prevent relying on unsupported behavior.

### Additional Changes

- Updated `README.md` to reflect the current defaults and available capabilities for day-to-day usage.
- Updated packaging for `@britt/llpm` with restricted published files and an automated publish workflow.

---
title: Updates
weight: 5
---

## Latest updates

```json
{
  "Additional Changes": [
    "The documentation has been updated to reflect the current defaults and available capabilities for day-to-day usage. The README now references GPT-5.2 as the default model, expands the listed skills and commands, and includes a more complete tool catalog.",
    "The package is now prepared for distribution with tighter publishing hygiene and automated release steps. @britt/llpm was configured as a publishable npm package with restricted published files, an automated publish workflow, and aligned license/tests/docs updates."
  ],
  "Breaking Changes": [
    "The published package now requires a newer Node.js runtime, which may require updating your environment before upgrading. The scoped @britt/llpm package enforces a Node 18+ engine requirement, so CI/CD images and local runtimes must be updated to Node.js 18 or later."
  ],
  "Deprecations": [
    "Documentation for an unimplemented proxy approach has been removed to prevent relying on unsupported behavior. The README no longer includes the unimplemented LiteLLM proxy section, and users should follow the documented tool catalog and llpm-based workflows instead."
  ],
  "New Features": [
    "The project can now be installed and set up using either npm or a source-based workflow with clearer guidance on prerequisites and configuration. The README was reorganized to document npm vs. source installs, updated runtime requirements, centralized configuration, and llpm-based usage patterns."
  ]
}

```

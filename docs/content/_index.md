---
title: LLPM Documentation
---

# Large Language Model Product Manager

LLPM is an AI-powered product management CLI for working with GitHub issues, local codebases, stakeholders, and requirement elicitation.

## Install and run

1. Install dependencies:

   ```bash
   bun install
   ```

2. Start LLPM:

   ```bash
   bun start
   ```

3. Configure at least one model provider:

   ```text
   /model providers
   ```

## What LLPM does

### Multi-provider models

Connect one or more providers, then list and switch models per project or task.

Supported providers:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Common commands:

- Configure provider credentials: `/model providers`
- List models: `/model list`
- Switch models (interactive): `/model switch`
- Switch models directly: `/model switch <provider>/<model-id>`
- Refresh the cached model catalog: `/model update`

### Projects, scans, and GitHub

Use projects to keep separate context, repositories, and scan results.

- Manage projects: `/project`
- Scan a codebase: `/project scan`
- Connect and browse repositories: `/github`

### Skills and guided workflows

Use skills to guide repeatable workflows (planning, elicitation, stakeholder updates, diagrams).

- List skills: `/skills list`
- Preview a skill: `/skills test <name>`
- Reload after editing skill files: `/skills reload`
- Restore bundled skills: `/skills reinstall`

### Notes and search

Store decisions as Markdown notes and search them with ripgrep.

- Notes are stored under `~/.llpm/projects/{projectId}/notes/` as Markdown files with YAML frontmatter.
- Notes search uses ripgrep-based text search.

## Next steps

- Follow the setup guide: [Getting Started](./docs/getting-started/)
- Learn the workflows: [User Guide](./docs/user-guide/)

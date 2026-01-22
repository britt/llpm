---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI for working with:

- GitHub issues and pull requests
- Local projects (including codebase scanning)
- Notes (stored as Markdown)
- Stakeholders and goals
- Requirement elicitation

## Install (from source)

1. **Clone the repository.**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies.**

   ```bash
   bun install
   ```

3. **Start LLPM.**

   ```bash
   bun start
   ```

## Quickstart

1. **Start LLPM.**

   ```bash
   bun start
   ```

2. **Configure at least one model provider.**

   Run:

   ```text
   /model providers
   ```

   Then set the required environment variables for the provider you want to use.

3. **Select a model.**

   ```text
   /model switch
   ```

4. **Set up a project (optional).**

   Run:

   ```text
   /project
   ```

## What LLPM helps with

### Multi-provider model management

LLPM works with multiple model providers so you can switch models as you work.

- See which providers are configured: `/model providers`
- List available models: `/model list`
- Refresh the cached model catalog from provider APIs: `/model update`
- Switch interactively: `/model switch`
- Switch directly by ID: `/model switch cerebras/qwen-3-235b-a22b-instruct-2507`

### Projects, scans, and GitHub workflows

Projects keep separate context for different repositories and directories.

- Manage projects: `/project`
- Scan the current project: `/project scan`
- Work with GitHub repositories and issues: `/github`, `/issue`, `/project`

### Skills and guided workflows

Skills guide repeatable workflows (planning, diagrams, requirement elicitation, stakeholder updates).

- List skills: `/skills list`
- Preview a skill: `/skills test <name>`
- Reload after editing skill files: `/skills reload`
- Restore bundled skills: `/skills reinstall`

### Notes (Markdown) and search

Notes are stored as Markdown files and can be searched with ripgrep.

- Notes live under `~/.llpm/projects/{projectId}/notes/`.
- Notes search uses ripgrep-based text search.

## Model providers

LLPM supports these model providers:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

To see what credentials each provider needs, run:

```text
/model providers
```

For the full configuration reference, see [Configuration](./docs/getting-started/configuration/).

## Next steps

- Start here: [Getting Started](./docs/getting-started/)
- Learn the workflows: [User Guide](./docs/user-guide/)
- Browse skills: [Skills Reference](./docs/skills-reference/)

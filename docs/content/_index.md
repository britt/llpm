---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI.

Use it to work with:

- GitHub issues and pull requests
- Local projects (including codebase scanning)
- Notes (stored as Markdown)
- Stakeholders and goals
- Requirement elicitation

## Install (from source)

**Prerequisites**

- [Bun](https://bun.com)
- At least one configured model provider (see [Model providers](#model-providers))

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

## Next

1. **Check provider configuration.**

   ```text
   /model providers
   ```

2. **Switch models.**

   ```text
   /model switch
   ```

3. **Add or switch projects.**

   ```text
   /project
   ```

## What LLPM helps with

### Multi-provider models (with a cached catalog)

LLPM supports multiple LLM providers and stores a model catalog on disk so model selection stays fast.

Use these commands:

- `/model providers` to see which providers are configured
- `/model list` to list available models
- `/model update` to refresh the cached model catalog
- `/model switch` to switch models interactively

Example direct switch:

```text
/model switch cerebras/qwen-3-235b-a22b-instruct-2507
```

### Projects and codebase scans

Projects keep separate context for different repositories and directories.

Use these commands:

- `/project` to manage projects
- `/project scan` to scan a project directory

### GitHub workflows

LLPM includes slash commands for GitHub-oriented product work.

Use these commands:

- `/github` to browse and search repositories
- `/issue` to work with issues

### Skills and guided workflows

Skills are reusable workflow guides (planning, diagrams, requirement elicitation, stakeholder updates).

Use these commands:

- `/skills list`
- `/skills test <name>`
- `/skills reload`
- `/skills reinstall`

### Notes (Markdown) and search

Notes are stored as Markdown files.

- Notes live under `~/.llpm/projects/{projectId}/notes/`.
- Notes search uses ripgrep-based text search.

## Model providers

LLPM supports these model providers:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

To see what credentials each provider needs:

```text
/model providers
```

For full provider configuration and model reference, see [Getting Started: Configuration](./docs/getting-started/configuration/).

## Next steps

- Start here: [Getting Started](./docs/getting-started/)
- Learn the workflows: [User Guide](./docs/user-guide/)
- Browse skills: [Skills Reference](./docs/skills-reference/)

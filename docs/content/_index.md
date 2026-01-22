---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to:

- Work with GitHub issues and pull requests
- Manage local projects (including codebase scanning)
- Keep notes (stored as Markdown)
- Track stakeholders and goals
- Run requirement elicitation workflows

## Install

### Install from source

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

3. **Configure environment variables.**

   ```bash
   cp .env.example .env
   ```

4. **Start LLPM.**

   ```bash
   bun start
   ```

### Install globally (optional)

To run `llpm` as a command, link it globally:

```bash
bun link
llpm
```

## Quickstart

1. **Check provider configuration.**

   ```text
   /model providers
   ```

2. **Switch models (optional).**

   ```text
   /model switch
   ```

3. **Add or switch projects.**

   ```text
   /project
   ```

## What LLPM helps with

### Models (multi-provider)

LLPM supports multiple model providers and caches provider model catalogs.

Use these commands:

- `/model providers` to see which providers are configured
- `/model list` to list available models
- `/model update` to refresh the cached model catalog
- `/model switch` to switch models interactively

Example direct switch:

```text
/model switch cerebras/qwen-3-235b-a22b-instruct-2507
```

### Projects, scans, and GitHub

Projects keep separate context for different repositories and directories.

Use these commands:

- `/project` to manage projects
- `/project scan` to scan a project directory
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

### Models (multi-provider)

LLPM supports multiple model providers and caches provider model catalogs.

Use these commands:

- `/model providers` to see which providers are configured
- `/model list` to list available models
- `/model update` to refresh the cached model catalog
- `/model switch` to switch models interactively

Example direct switch:

```text
/model switch cerebras/qwen-3-235b-a22b-instruct-2507
```

### Projects, scans, and GitHub

Projects keep separate context for different repositories and directories.

Use these commands:

- `/project` to manage projects
- `/project scan` to scan a project directory
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

LLPM supports multiple model providers and caches provider model catalogs.

Use these commands:

- `/model providers` to see which providers are configured
- `/model list` to list available models
- `/model update` to refresh the cached model catalog
- `/model switch` to switch models interactively

Example direct switch:

```text
/model switch cerebras/qwen-3-235b-a22b-instruct-2507
```

## Projects, scans, and GitHub

Projects keep separate context for different repositories and directories.

Use these commands:

- `/project` to manage projects
- `/project scan` to scan a project directory
- `/github` to browse and search repositories
- `/issue` to work with issues

## Skills and guided workflows

Skills are reusable workflow guides (planning, diagrams, requirement elicitation, stakeholder updates).

Use these commands:

- `/skills list`
- `/skills test <name>`
- `/skills reload`
- `/skills reinstall`

## Notes (Markdown) and search

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

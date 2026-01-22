---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use LLPM to:

- Manage work in GitHub (issues, pull requests, and projects)
- Scan a codebase to understand structure, dependencies, and docs
- Keep project notes as Markdown and search them with ripgrep
- Track stakeholders, goals, and dependencies
- Run a requirement-elicitation workflow to produce a requirements document

## Install

### Install from source

**Prerequisites**

- [Bun](https://bun.com)
- At least one configured model provider

1. **Clone the repository.**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies.**

   ```bash
   bun install
   ```

3. **Create a local `.env` file.**

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

3. **Manage projects.**

   ```text
   /project
   ```

## What LLPM helps with

### Model management (multi-provider)

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

### Projects, scans, and repository context

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

For provider configuration and environment variable setup, see [Getting Started: Configuration]({{< relref "docs/getting-started/configuration" >}}).

## Next steps

- Start here: [Getting Started]({{< relref "docs/getting-started" >}})
- Learn the workflows: [User Guide]({{< relref "docs/user-guide" >}})
- Browse skills: [Skills Reference]({{< relref "docs/skills-reference" >}})

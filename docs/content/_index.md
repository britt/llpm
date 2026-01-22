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

### Prerequisites

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

## Quickstart

1. **Start LLPM.**

   ```bash
   bun start
   ```

2. **Check provider configuration.**

   ```text
   /model providers
   ```

3. **Switch models.**

   ```text
   /model switch
   ```

4. **Add or switch projects.**

   ```text
   /project
   ```

## What LLPM helps with

### Multi-provider model management

LLPM supports switching between multiple providers, so different projects or tasks can use different models.

Common commands:

- `/model providers` (see which providers are configured)
- `/model list` (list models)
- `/model update` (refresh the cached model catalog)
- `/model switch` (switch interactively)

Example direct switch:

```text
/model switch cerebras/qwen-3-235b-a22b-instruct-2507
```

### Projects, scans, and GitHub workflows

Projects keep separate context for different repositories and directories.

Common commands:

- `/project` (manage projects)
- `/project scan` (scan a project directory)
- `/github` and `/issue` (work with GitHub)

### Skills and guided workflows

Skills guide repeatable workflows (planning, diagrams, requirement elicitation, stakeholder updates).

Common commands:

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

## Next steps

- Start here: [Getting Started](./docs/getting-started/)
- Learn the workflows: [User Guide](./docs/user-guide/)
- Browse skills: [Skills Reference](./docs/skills-reference/)

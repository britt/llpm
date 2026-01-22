---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI for working with GitHub issues, local codebases, stakeholders, and requirement elicitation.

## Install

Install and run LLPM from source:

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

2. **Check which providers are configured.**

   ```text
   /model providers
   ```

3. **Switch to a model.**

   ```text
   /model switch
   ```

## What LLPM helps with

### Multi-provider models

Connect one or more providers, then list, update, and switch models while you work.

- List the current catalog: `/model list`
- Refresh the catalog from provider APIs: `/model update`
- Switch interactively: `/model switch`
- Switch directly: `/model switch cerebras/qwen-3-235b-a22b-instruct-2507`

### Projects, scans, and GitHub

Create projects to keep separate context for different repos and directories. Scan a codebase to help LLPM understand the project’s structure.

- Manage projects: `/project`
- Scan a codebase: `/project scan`
- Connect and browse repositories: `/github`

### Skills and guided workflows

Use skills to guide repeatable workflows (planning, requirement elicitation, stakeholder updates, and diagrams).

- List skills: `/skills list`
- Preview a skill: `/skills test <name>`
- Reload after editing skill files: `/skills reload`
- Restore bundled skills: `/skills reinstall`

### Notes and search

Store decisions as Markdown notes and search them with ripgrep.

- Notes are stored under `~/.llpm/projects/{projectId}/notes/`.
- Notes search uses ripgrep-based text search.

## Configure a model provider

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

For the full model/provider configuration reference, see [Configuration](./docs/getting-started/configuration/).

## What to do next

- Start here: [Getting Started](./docs/getting-started/)
- Learn the workflows: [User Guide](./docs/user-guide/)
- Browse skills: [Skills Reference](./docs/skills-reference/)

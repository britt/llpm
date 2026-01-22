---
title: LLPM Documentation
layout: hextra-home
---

# Large Language Model Product Manager

LLPM is an AI-powered product management CLI for working with GitHub issues, local codebases, stakeholders, and requirement elicitation.

## Install

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

LLPM is organized around four core workflows:

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

Default model IDs in the built-in catalog:

- OpenAI: `gpt-5.2`, `gpt-5.2-mini`, `gpt-5.2-turbo`, `gpt-5.1`, `gpt-5.1-mini`, `gpt-5.1-turbo`, `gpt-4o`, `gpt-4o-mini`, `o4-mini`, `o3-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`, `claude-sonnet-4`, `claude-opus-4`, `claude-3-7-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-haiku`
- Groq: `meta-llama/llama-4-maverick-17b-128e-instruct`, `llama-3.3-70b-versatile`, `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`, `deepseek-r1-distill-llama-70b`, `moonshotai/kimi-k2-instruct`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3-32b`
- Google Vertex: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-ultra`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`, `llama3.1-8b`, `llama3.1-70b`

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

---
title: LLPM Documentation
layout: hextra-home
---

# Large Language Model Product Manager

AI-powered product management CLI for GitHub issues, codebases, stakeholders, and requirements.

## Install

1. Install LLPM with Bun:

   ```bash
   bun add -g llpm
   ```

2. Start LLPM:

   ```bash
   llpm
   ```

3. Configure at least one model provider (environment variables).

4. Confirm LLPM sees your credentials:

   ```text
   /model providers
   ```

5. Pick a model:

   ```text
   /model switch
   ```

For prerequisites, provider setup, and other install options, see [Installation](./docs/getting-started/installation.md).

## What LLPM does

### Multi-provider models

- Configure providers and credentials: `/model providers`
- Switch models (interactive): `/model switch`
- Switch models directly: `/model switch <provider>/<model>`
- List models: `/model list` (use `/model list --all` to include unconfigured providers)
- Refresh the cached catalog: `/model update`

Supported provider IDs: `openai`, `anthropic`, `groq`, `google-vertex`, `cerebras`.

Example model IDs (from `MODELS.md`):

- OpenAI: `gpt-5.2`, `gpt-5.2-mini`, `gpt-5.2-turbo`, `gpt-5.1`, `gpt-5.1-mini`, `gpt-5.1-turbo`, `gpt-4o`, `gpt-4o-mini`, `o4-mini`, `o3-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`, `claude-sonnet-4`, `claude-opus-4`, `claude-3-7-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-haiku`
- Google Vertex: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-ultra`
- Groq: `meta-llama/llama-4-maverick-17b-128e-instruct`, `llama-3.3-70b-versatile`, `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`, `deepseek-r1-distill-llama-70b`, `moonshotai/kimi-k2-instruct`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3-32b`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`, `llama3.1-8b`, `llama3.1-70b`

Notes:

- Model discovery is cached in `~/.llpm/models.json`.
- If a provider is not configured, its models stay hidden from the selector and the footer only shows models from configured providers.

### Projects, scans, and GitHub

- Manage projects: `/project`
- Scan a codebase: `/project scan` (uses the active project or the current working directory)
- Connect and browse repositories: `/github`

Scan results are saved to `~/.llpm/projects/{projectId}/project.json`.

### Skills and guided workflows

- List skills: `/skills list`
- Preview a skill: `/skills test <name>`
- Reload after editing skill files: `/skills reload`
- Restore bundled skills: `/skills reinstall`

Skills are discovered from `~/.llpm/skills/` and project skill folders.

### Notes, search, and shell

- Notes are stored under `~/.llpm/projects/{projectId}/notes/` as Markdown files with YAML frontmatter.
- Notes search uses ripgrep-based text search.
- Shell execution is configured in `~/.llpm/config.json` under the `shell` section.

## Next steps

- Follow the setup guide: [Getting Started](./docs/getting-started/_index.md)
- Learn the workflows: [User Guide](./docs/user-guide/_index.md)

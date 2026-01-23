---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to manage projects, work with GitHub, organize Markdown notes, and switch between multiple AI model providers.

## Install

### Install from source

1. **Install dependencies.**

   ```bash
   bun install
   ```

2. **Create a `.env` file.**

   ```bash
   cp .env.example .env
   ```

3. **Configure at least one provider.**

   In `.env`:

   ```bash
   # Required: configure at least one
   OPENAI_API_KEY=your-openai-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   GROQ_API_KEY=your-groq-api-key
   CEREBRAS_API_KEY=your-cerebras-api-key
   GOOGLE_VERTEX_PROJECT_ID=your-project-id

   # Optional
   GOOGLE_VERTEX_REGION=us-central1
   GITHUB_TOKEN=your-github-token
   ```

4. **Start LLPM.**

   ```bash
   bun start
   ```

For the full setup, see [Installation](./docs/getting-started/installation/).

## Choose a model provider

LLPM supports these provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Use `/model providers` to see which providers are configured.

For provider setup and example model IDs, see [Model Providers and Configuration](../../MODELS.md).

### Refresh the model list

LLPM can fetch the latest model lists from provider APIs:

```text
/model update
```

LLPM caches provider model lists in `~/.llpm/models.json`.

## Quickstart

1. **List configured providers.**

   ```text
   /model providers
   ```

2. **List models (configured providers only).**

   ```text
   /model list
   ```

3. **Switch models.**

   ```text
   /model switch
   ```

## What you can do with LLPM

### Work across projects

Manage projects (local path + optional GitHub repository) and scan a codebase to understand its structure and dependencies.

Common commands:

- `/project list`
- `/project switch`
- `/project scan`

Notes:

- `/project scan` runs even if no project is configured yet (it scans the current working directory).

### Manage GitHub work

Use a GitHub token to browse repositories and manage issues.

Common commands:

- `/github list`
- `/issue list`
- `/issue create`

### Use skills for guided workflows

Skills are guided workflows that help the assistant follow consistent patterns.

Common commands:

- `/skills list`
- `/skills reinstall`

### Keep notes in Markdown

Notes are stored as Markdown files.

Common commands:

- `/notes list`
- `/notes create`
- `/notes search`

## Next steps

- [Installation](./docs/getting-started/installation/)
- [Quickstart](./docs/getting-started/quickstart/)
- [Configuration](./docs/getting-started/configuration/)
- [User Guide](./docs/user-guide/)
- [Skills Reference](./docs/skills-reference/)
- [Contributing](./docs/contributing/)

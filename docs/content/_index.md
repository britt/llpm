---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to manage projects, work with GitHub, organize Markdown notes, and switch between multiple AI model providers.

## Install

### Install from source

1. **Clone the repository.**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies.**

   ```bash
   bun install
   ```

3. **Create a `.env` file.**

   ```bash
   cp .env.example .env
   ```

4. **Configure at least one model provider.**

   Add one (or more) of these to `.env`:

   ```bash
   # Configure at least one
   OPENAI_API_KEY=your-openai-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   GROQ_API_KEY=your-groq-api-key
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
   CEREBRAS_API_KEY=your-cerebras-api-key

   # Optional
   GOOGLE_VERTEX_REGION=us-central1
   GITHUB_TOKEN=your-github-token
   ```

5. **Start LLPM.**

   ```bash
   bun start
   ```

### (Optional) Link as a global command

```bash
bun link
llpm
```

For more detail, see [Installation](./docs/getting-started/installation.md).

## Quick start

1. **Start LLPM.**

   ```bash
   llpm
   ```

2. **Check configured providers.**

   ```text
   /model providers
   ```

3. **Pick a model.**

   ```text
   /model switch
   ```

## What you can do with LLPM

### Multi-provider model management

Connect one or more providers, then list, update, and switch models.

Common commands:

- `/model providers`
- `/model list`
- `/model update`
- `/model switch`

### Projects, scans, and GitHub

Track projects (local path + optional GitHub repository), and scan codebases to understand structure and dependencies.

Common commands:

- `/project list`
- `/project switch`
- `/project scan`
- `/github status`

### Skills and guided workflows

Use skills as reusable, tool-driven workflows.

Common commands:

- `/skills list`
- `/skills show <skill-name>`
- `/skills reinstall`

### Notes and search

Store notes as Markdown files and run text search.

Common commands:

- `/notes list`
- `/notes add`
- `/notes search`

## Model providers

LLPM supports these provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Example model IDs from the built-in defaults (`src/types/models.ts`):

- OpenAI: `gpt-5.2`, `gpt-4o-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`
- Groq: `meta-llama/llama-4-maverick-17b-128e-instruct`, `llama-3.3-70b-versatile`
- Google Vertex AI: `gemini-2.5-pro`, `gemini-2.5-flash`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`

## Next steps

- Start with: [Getting Started](./docs/getting-started/_index.md)
- Learn commands: [Commands](./docs/user-guide/commands.md)
- Browse skills: [Skills Reference](./docs/skills-reference/_index.md)

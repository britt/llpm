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
   CEREBRAS_API_KEY=your-cerebras-api-key
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id

   # Optional
   GOOGLE_VERTEX_REGION=us-central1
   GITHUB_TOKEN=your-github-token
   ```

5. **Start LLPM.**

   ```bash
   bun start
   ```

### Install globally (optional)

```bash
bun link
llpm
```

## Quickstart

1. **List configured providers.**

   ```text
   /model providers
   ```

2. **Refresh the cached model catalog (optional).**

   ```text
   /model update
   ```

   LLPM caches provider model lists in `~/.llpm/models.json`.

3. **List models (configured providers only).**

   ```text
   /model list
   ```

4. **Switch models.**

   ```text
   /model switch
   ```

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
- Groq: `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`
- Google Vertex AI: `gemini-2.5-pro`, `gemini-2.5-flash`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`

## What you can do with LLPM

## What you can do with LLPM

### Multi-provider model management

Connect one or more providers, then switch models per project or task.

Common commands:

- `/model providers`
- `/model list`
- `/model update`
- `/model switch`

### Projects, scans, and GitHub

LLPM tracks projects (local path + optional GitHub repository) and can scan a codebase to understand its structure and dependencies.

Common commands:

- `/project list`
- `/project switch`
- `/project scan`
- `/github status`

### Skills and guided workflows

LLPM includes a skills system for reusable, tool-driven workflows.

Common commands:

- `/skills list`
- `/skills show <skill-name>`
- `/skills reinstall`

### Notes, search, and shell

LLPM stores notes as Markdown files and supports text search.

Common commands:

- `/notes list`
- `/notes add`
- `/notes search`

LLPM can also run shell commands through a dedicated tool when enabled.

Related documentation:

- [Getting Started](./docs/getting-started/_index.md)
- [User Guide](./docs/user-guide/_index.md)
- [Skills Reference](./docs/skills-reference/_index.md)


### Use GitHub inside your terminal

Connect a project to a GitHub repository, then list and triage issues and pull requests.

Common commands:

- `/github status`
- `/issue list`
- `/issue show`
- `/project at-risk`

### Use skills for repeatable workflows

Use built-in skills (and create your own) to guide workflows like requirement elicitation, stakeholder tracking, and project planning.

Common commands:

- `/skills list`
- `/skills show`
- `/skills reinstall`

### Keep lightweight Markdown notes

Store notes as Markdown files and search them using ripgrep.

Common commands:

- `/notes add`
- `/notes list`
- `/notes search`

## Next steps

- Follow the Getting Started guides: [Getting Started](./docs/getting-started/_index.md)
- Learn the available commands: [Commands](./docs/user-guide/commands.md)
- Browse the skills catalog: [Skills Reference](./docs/skills-reference/_index.md)


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

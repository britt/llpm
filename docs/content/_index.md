---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to manage projects, work with GitHub, organize Markdown notes, and switch between multiple AI model providers.

## Install

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

---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to manage projects, work with GitHub, organize Markdown notes, and switch between multiple AI model providers.

## Install

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

For the full setup, see [Installation](./docs/getting-started/installation/).

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

For provider setup and example model IDs, see [Model Providers and Configuration](../../MODELS.md).

## What you can do with LLPM

## Work across projects

Manage projects (local path + optional GitHub repository) and scan a codebase to understand its structure and dependencies.

Common commands:

- `/project list`
- `/project switch`
- `/project scan`

Notes:

- `/project scan` runs even if no project is configured yet (it scans the current working directory).

## Manage GitHub work

Use a GitHub token to browse repositories and manage issues.

Common commands:

- `/github list`
- `/issue list`
- `/issue create`

## Use skills for guided workflows

Skills are guided workflows that help the assistant follow consistent patterns.

Common commands:

- `/skills list`
- `/skills reinstall`

## Keep notes in Markdown

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

For provider setup and example model IDs, see [Model Providers and Configuration](../../MODELS.md).

## What you can do with LLPM

## Work across projects

Manage projects (local path + optional GitHub repository) and scan a codebase to understand its structure and dependencies.

Common commands:

- `/project list`
- `/project switch`
- `/project scan`

Notes:

- `/project scan` runs even if no project is configured yet (it scans the current working directory).

## Manage GitHub work

Use a GitHub token to browse repositories and manage issues.

Common commands:

- `/github list`
- `/issue list`
- `/issue create`

## Use skills for guided workflows

Skills are guided workflows that help the assistant follow consistent patterns.

Common commands:

- `/skills list`
- `/skills reinstall`

## Keep notes in Markdown

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

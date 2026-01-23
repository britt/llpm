---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to work across projects, GitHub, notes, and multiple model providers from a single terminal UI.

## Install

1. **Install dependencies.**

   ```bash
   bun install
   ```

2. **Copy the example environment file.**

   ```bash
   cp .env.example .env
   ```

3. **Configure at least one provider.**

   In `.env`:

   ```bash
   # Configure at least one provider
   OPENAI_API_KEY=your-openai-api-key-here
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   GROQ_API_KEY=your-groq-api-key-here
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_VERTEX_REGION=us-central1  # Optional (defaults to us-central1)
   CEREBRAS_API_KEY=your-cerebras-api-key-here

   # Optional integrations
   GITHUB_TOKEN=your-github-token-here
   ```

4. **Start LLPM.**

   ```bash
   bun start
   ```

## Choose a model provider

LLPM supports these provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

For provider setup details and example model IDs, see [Model Providers and Configuration](../../MODELS.md).

## Quickstart

1. **Confirm which providers are configured.**

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

4. **(Optional) Refresh the cached model catalog.**

   ```text
   /model update
   ```

LLPM caches provider model lists in `~/.llpm/models.json`.

## What you can do with LLPM

### Multi-provider models

- Connect one or more providers, then switch models per project or task.
- Refresh provider model lists on demand with `/model update`.
- Keep model selection consistent with configured providers.

Example Cerebras model ID:

- `qwen-3-235b-a22b-instruct-2507`

### Projects and scans

- Save a local path and (optionally) a GitHub repository as a project.
- Scan a codebase to understand structure and dependencies.

Common commands:

- **List projects:**

  ```text
  /project list
  ```

- **Switch projects:**

  ```text
  /project switch
  ```

- **Scan a codebase:**

  ```text
  /project scan
  ```

If no active project is set, `/project scan` scans the current working directory.

### GitHub

Use a GitHub token to browse repositories and manage issues.

- **List repositories:**

  ```text
  /github list
  ```

- **List issues:**

  ```text
  /issue list
  ```

- **Create an issue:**

  ```text
  /issue create
  ```

### Skills and guided workflows

Skills are guided workflows that help the assistant follow consistent patterns.

- **List skills:**

  ```text
  /skills list
  ```

- **Reinstall bundled core skills (optional):**

  ```text
  /skills reinstall
  ```

### Notes, search, and shell

Notes are stored as Markdown files.

- **List notes:**

  ```text
  /notes list
  ```

- **Create a note:**

  ```text
  /notes create
  ```

- **Search notes:**

  ```text
  /notes search
  ```

## Next steps

- [Installation](./docs/getting-started/installation/)
- [Quickstart](./docs/getting-started/quickstart/)
- [Configuration](./docs/getting-started/configuration/)
- [User Guide](./docs/user-guide/)
- [Skills Reference](./docs/skills-reference/)
- [Contributing](./docs/contributing/)
### Skills

Use skills for guided workflows.

- **List skills:**

  ```text
  /skills list
  ```

- **Reinstall bundled core skills (optional):**

  ```text
  /skills reinstall
  ```

### Notes

Write and search notes as Markdown files.

- **List notes:**

  ```text
  /notes list
  ```

- **Create a note:**

  ```text
  /notes add
  ```

- **Search notes:**

  ```text
  /notes search
  ```

## Next steps

- [User Guide](/docs/user-guide/)
- [Skills Reference](/docs/skills-reference/)
- [Contributing](/docs/contributing/)


  ```text
  /model providers
  ```

- Switch models interactively:

  ```text
  /model switch
  ```

- Refresh the model list from provider APIs (optional):

  ```text
  /model update
  ```

Supported provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Example Cerebras model ID:

- `qwen-3-235b-a22b-instruct-2507`

### Projects, scans, and GitHub

Use projects to keep work and context organized.

- Manage projects:

  ```text
  /project
  ```

- Scan a codebase for structure and dependencies:

  ```text
  /project scan
  ```

- Use GitHub features:

  ```text
  /github
  ```

### Skills

Use skills to run repeatable workflows.

- List skills:

  ```text
  /skills
  ```

- Reinstall bundled core skills (useful after upgrading):

  ```text
  /skills reinstall
  ```

### Notes

Store project notes as Markdown.

```text
/notes
```

## Next steps

- [User Guide](/docs/user-guide/)
- [Skills Reference](/docs/skills-reference/)
- [Contributing](/docs/contributing/)

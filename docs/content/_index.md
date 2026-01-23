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

To check whether a provider is configured, run:

```text
/model providers
```

## Switch models

Common model commands:

- **List models (configured providers only):**

  ```text
  /model list
  ```

- **Switch models interactively:**

  ```text
  /model switch
  ```

- **Switch to a specific model:**

  ```text
  /model switch <provider>/<model-id>
  ```

- **Fetch the latest model catalog (optional):**

  ```text
  /model update
  ```

LLPM caches provider model lists in `~/.llpm/models.json`.

Example model IDs (by provider):

- OpenAI: `gpt-5.2`, `gpt-4o`, `o4-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`
- Groq: `llama-3.3-70b-versatile`, `meta-llama/llama-4-maverick-17b-128e-instruct`
- Google Vertex: `gemini-2.5-pro`, `gemini-2.5-flash`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`

For full configuration details and more model examples, see [Model Providers and Configuration](../../../MODELS.md).

## What you can do with LLPM

### Work across projects

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

### Use GitHub from the terminal

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

### Use guided workflows (skills)

- **List skills:**

  ```text
  /skills list
  ```

- **Reinstall bundled core skills (optional):**

  ```text
  /skills reinstall
  ```

### Keep project notes as Markdown

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

3. **Configure at least one model provider.**

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

## Configure models

LLPM supports these provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Common model commands:

- **Show provider configuration requirements:**

  ```text
  /model providers
  ```

- **List models (configured providers only):**

  ```text
  /model list
  ```

- **Switch models interactively:**

  ```text
  /model switch
  ```

- **Fetch the latest model catalog (optional):**

  ```text
  /model update
  ```

LLPM caches provider model lists in `~/.llpm/models.json`.

## Work across projects

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

## Use GitHub from the terminal

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

## Use guided workflows (skills)

- **List skills:**

  ```text
  /skills list
  ```

- **Reinstall bundled core skills (optional):**

  ```text
  /skills reinstall
  ```

## Keep project notes as Markdown

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
- [User Guide](/docs/user-guide/)
- [Skills Reference](/docs/skills-reference/)
- [Contributing](/docs/contributing/)


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
  /notes create
  ```

- **Search notes:**

  ```text
  /notes search
  ```

## Next steps

- [User Guide](/docs/user-guide/)
- [Skills Reference](/docs/skills-reference/)
- [Contributing](/docs/contributing/)


- **List configured models:**

  ```text
  /model list
  ```

- **Show provider configuration requirements:**

  ```text
  /model providers
  ```

- **Switch models interactively:**

  ```text
  /model switch
  ```

- **Fetch the latest model catalog (optional):**

  ```text
  /model update
  ```

LLPM caches provider model lists in `~/.llpm/models.json`.

### Projects and scans

Use projects to save a local path and (optionally) a GitHub repository.

- **List projects:**

  ```text
  /project list
  ```

- **Switch projects:**

  ```text
  /project switch
  ```

- **Scan a codebase for structure and dependencies:**

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
  /notes create
  ```

- **Search notes:**

  ```text
  /notes search
  ```

## Next steps

- [User Guide](/docs/user-guide/)
- [Skills Reference](/docs/skills-reference/)
- [Contributing](/docs/contributing/)

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

- **Create an issue:**

  ```text
  /issue create
  ```

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

  ```

### Skills

Use skills for guided workflows (for example: requirement elicitation, stakeholder tracking, or project planning).

- **List skills:**

  ```text
  /skills list
  ```

- **Reinstall bundled skills (optional):**

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

---

## Next steps

- Browse the docs: [Docs](./docs/)

title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use it to work across projects, GitHub, and multiple model providers from a single terminal UI.

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

3. **Copy the example environment file.**

   ```bash
   cp .env.example .env
   ```

4. **Configure at least one model provider.**

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

5. **Start LLPM.**

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

1. **Start LLPM.**

   ```text
   llpm
   ```

2. **Confirm provider configuration.**

   ```text
   /model providers
   ```

3. **Switch models (optional).**

   ```text
   /model switch
   ```

4. **Scan a codebase (optional).**

   ```text
   /project scan
   ```

## What you can do

### Models

Use a single CLI to work with multiple providers.

- **List providers and required environment variables:**

  ```text
  /model providers
  ```

- **Switch models interactively:**

  ```text
  /model switch
  ```

- **Refresh the model list from provider APIs (optional):**

  ```text
  /model update
  ```

Supported provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

LLPM caches provider model lists in `~/.llpm/models.json`.

Example Cerebras model ID:

- `qwen-3-235b-a22b-instruct-2507`

### Projects and scans

Save a local path and (optionally) a GitHub repository as a project.

- **List projects:**

  ```text
  /project list
  ```

- **Switch projects:**

  ```text
  /project switch
  ```

- **Scan a codebase for structure and dependencies:**

  ```text
  /project scan
  ```

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

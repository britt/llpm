---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use LLPM to keep work close to the terminal:

- Connect an LLM provider and switch models.
- Scan a codebase for context.
- Manage GitHub work.
- Keep notes and run guided workflows (skills).

## Install

### Install from source

**Prerequisites**

- [Bun](https://bun.com)
- At least one configured model provider:
  - OpenAI (`openai`)
  - Anthropic (`anthropic`)
  - Groq (`groq`)
  - Google Vertex AI (`google-vertex`)
  - Cerebras (`cerebras`)

1. **Clone the repository.**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies.**

   ```bash
   bun install
   ```

3. **Create a local `.env` file.**

   ```bash
   cp .env.example .env
   ```

4. **Configure at least one provider.**

   ```bash
   # OpenAI
   OPENAI_API_KEY=...

   # Anthropic
   ANTHROPIC_API_KEY=...

   # Groq
   GROQ_API_KEY=...

   # Cerebras
   CEREBRAS_API_KEY=...

   # Google Vertex AI
   GOOGLE_VERTEX_PROJECT_ID=...
   GOOGLE_VERTEX_REGION=us-central1  # Optional (defaults to us-central1)
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

## What LLPM helps with

### Models

Use a single CLI to manage multiple providers.

- List providers and required env vars:

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

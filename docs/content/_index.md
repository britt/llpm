---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use LLPM to keep work close to the terminal:

- Connect an LLM provider and switch models
- Scan a codebase for context
- Manage GitHub work
- Keep notes and run guided workflows (skills)

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

4. **Start LLPM.**

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

2. **List configured providers.**

   ```text
   /model providers
   ```

3. **Switch models (optional).**

   ```text
   /model switch
   ```

4. **Set up and scan a project.**

   ```text
   /project
   /project scan
   ```

## What LLPM helps with

### Multi-provider models

Connect one or more providers and switch models without leaving the terminal.

- Show configured providers:

  ```text
  /model providers
  ```

- Switch models:

  ```text
  /model switch
  ```

- Fetch the latest model list from provider APIs (optional):

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

Use projects to keep work and context organized, including scanning a codebase.

- Manage projects:

  ```text
  /project
  ```

- Scan a codebase:

  ```text
  /project scan
  ```

- Use GitHub features:

  ```text
  /github
  ```

### Skills and guided workflows

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

Store project notes as Markdown and search them using ripgrep.

```text
/notes
```

## Next steps

- [User Guide](/docs/user-guide/)
- [Skills Reference](/docs/skills-reference/)
- [Contributing](/docs/contributing/)

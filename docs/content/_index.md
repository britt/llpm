---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

## Install

### Install from source

**Prerequisites**

- [Bun](https://bun.com)
- At least one configured model provider: OpenAI, Anthropic, Groq, Google Vertex AI, or Cerebras

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

Connect one or more providers, then switch models per project or task.

- List configured providers:

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

Use projects to keep work, context, and artifacts organized. Scan a codebase to understand structure, dependencies, and docs.

- Show the current project:

  ```text
  /project
  ```

- Scan a codebase:

  ```text
  /project scan
  ```

- Work in GitHub:

  ```text
  /github
  ```

### Skills and guided workflows

Use skills to run repeatable workflows (for example, requirement elicitation).

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

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

## Get started

1. **Configure a provider.**

   Use `.env` (after `cp .env.example .env`) or environment variables.

2. **Start LLPM.**

   ```text
   llpm
   ```

3. **List configured providers.**

   ```text
   /model providers
   ```

4. **Switch models (optional).**

   ```text
   /model switch
   ```

5. **Set up and scan a project.**

   ```text
   /project
   /project scan
   ```

## What LLPM helps with

## Use multiple model providers

Connect one or more providers, then switch models per project or task.

1. **List configured providers.**

   ```text
   /model providers
   ```

2. **Switch models.**

   ```text
   /model switch
   ```

3. **Fetch the latest model list from provider APIs (optional).**

   ```text
   /model update
   ```

Supported provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

## Manage projects and scans

Use projects to keep work, context, and artifacts organized.

1. **Manage projects.**

   ```text
   /project
   ```

2. **Scan a codebase to understand structure, dependencies, and docs.**

   ```text
   /project scan
   ```

## Work in GitHub

Use LLPM to work with GitHub issues and pull requests.

```text
/github
```

## Use skills for guided workflows

Use skills to run repeatable workflows (for example, requirement elicitation).

1. **List skills.**

   ```text
   /skills
   ```

2. **Reinstall bundled core skills (useful after upgrading).**

   ```text
   /skills reinstall
   ```

## Keep notes as Markdown

Store project notes as Markdown and search them using ripgrep.

```text
/notes
```

## Next steps

- [User Guide](./docs/user-guide/)
- [Skills Reference](./docs/skills-reference/)
- [Contributing](./docs/contributing/)

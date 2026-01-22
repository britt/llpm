---
title: LLPM Documentation
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

## Install

### Install from source

**Prerequisites**

- [Bun](https://bun.com)
- At least one configured model provider (OpenAI, Anthropic, Groq, Google Vertex AI, or Cerebras)

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

## What LLPM helps with

- Manage work in GitHub (issues, pull requests, and projects)
- Scan a codebase to understand structure, dependencies, and docs
- Keep project notes as Markdown and search them with ripgrep
- Track stakeholders, goals, and dependencies
- Run a requirement-elicitation workflow to produce a requirements document

## Quickstart

1. **Check provider configuration.**

   ```text
   /model providers
   ```

2. **Switch models (optional).**

   ```text
   /model switch
   ```

3. **Manage projects.**

   ```text
   /project
   ```

## Model providers

LLPM supports these model providers:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

To see what credentials each provider needs:

```text
/model providers
```

## Next steps

- [Getting Started](./docs/getting-started/)
- [User Guide](./docs/user-guide/)
- [Skills Reference](./docs/skills-reference/)

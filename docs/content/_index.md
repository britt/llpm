---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

## Install

1. Clone the repository:

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env` file with at least one provider API key:

   ```bash
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GROQ_API_KEY=gsk_...
   CEREBRAS_API_KEY=your-cerebras-api-key

   # Optional: Google Vertex AI
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_VERTEX_REGION=us-central1

   # Optional: GitHub integration
   GITHUB_TOKEN=ghp_...
   ```

4. Start LLPM:

   ```bash
   bun start
   ```

## Start here

- [Getting Started](./docs/getting-started/)
- [Quickstart](./docs/getting-started/quickstart/)
- [User Guide](./docs/user-guide/)
- [Skills Reference](./docs/skills-reference/)

## What LLPM does

- **Projects**: track local projects and optionally associate a GitHub repo.
- **GitHub**: work with issues and pull requests.
- **Notes**: keep Markdown notes and search them.
- **Skills**: run guided workflows for common PM tasks.
- **Models**: switch between multiple model providers.

## Common commands

### Models

```text
/model providers
/model list
/model update
/model switch
```

### Projects

```text
/project list
/project switch
/project scan
```

### Skills

```text
/skills list
/skills show <skill-name>
/skills reinstall
```

### Notes

```text
/notes list
/notes add
/notes search
```

## Model providers

Provider IDs (from `src/types/models.ts`):

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Example default model IDs (from `src/types/models.ts`):

- OpenAI: `gpt-5.2`, `gpt-4o-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`
- Groq: `meta-llama/llama-4-maverick-17b-128e-instruct`, `llama-3.3-70b-versatile`
- Google Vertex AI: `gemini-2.5-pro`, `gemini-2.5-flash`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`

<!-- homepage: keep this page pure Markdown (no Hugo shortcodes) -->

---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal.

Use LLPM to:

- track projects (local path + optional GitHub repository)
- work with GitHub issues and pull requests
- keep Markdown notes
- run skills (guided workflows)
- switch between multiple AI model providers

## Install

### Option 1: Run from the repo

1. **Clone the repository**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Configure environment**

   Create a `.env` file with at least one provider API key.

   ```bash
   # At least one AI provider is required
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GROQ_API_KEY=gsk_...

   # Optional: GitHub integration
   GITHUB_TOKEN=ghp_...

   # Optional: Google Vertex AI
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_VERTEX_REGION=us-central1

   # Optional: Cerebras
   CEREBRAS_API_KEY=your-cerebras-api-key
   ```

4. **Start LLPM**

   ```bash
   bun start
   ```

### Option 2: Link as a global command (optional)

From the repository directory:

```bash
bun link
llpm
```

## Get started

- Follow [Getting Started](./docs/getting-started/_index.md)
- Run through the [Quickstart](./docs/getting-started/quickstart.md)
- Learn common workflows in the [User Guide](./docs/user-guide/_index.md)
- Browse guided workflows in the [Skills Reference](./docs/skills-reference/_index.md)

## Common workflows

### Switch models across providers

1. **List configured providers**

   ```text
   /model providers
   ```

2. **List available models**

   ```text
   /model list
   ```

3. **Fetch the latest model catalog**

   ```text
   /model update
   ```

4. **Switch models**

   ```text
   /model switch
   ```

### Track projects (and scan codebases)

1. **List projects**

   ```text
   /project list
   ```

2. **Switch to a project**

   ```text
   /project switch
   ```

3. **Scan a project**

   ```text
   /project scan
   ```

### Use skills (guided workflows)

1. **List skills**

   ```text
   /skills list
   ```

2. **Show a skill**

   ```text
   /skills show <skill-name>
   ```

3. **Reinstall bundled skills**

   ```text
   /skills reinstall
   ```

### Keep Markdown notes

1. **List notes**

   ```text
   /notes list
   ```

2. **Add a note**

   ```text
   /notes add
   ```

3. **Search notes**

   ```text
   /notes search
   ```

## Model providers

Provider IDs (from `src/types/models.ts`):

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Example default model IDs (also from `src/types/models.ts`):

- OpenAI: `gpt-5.2`, `gpt-4o-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`
- Groq: `meta-llama/llama-4-maverick-17b-128e-instruct`, `llama-3.3-70b-versatile`
- Google Vertex AI: `gemini-2.5-pro`, `gemini-2.5-flash`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`

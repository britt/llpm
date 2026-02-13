---
title: Configuration
weight: 3
---

## Environment Variables

Create a `.env` file in your project root:

```bash
cp .env.example .env
```

### AI Providers

Configure at least one AI provider:

```bash
# OpenAI (default provider)
OPENAI_API_KEY=your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key

# Groq
GROQ_API_KEY=your-groq-api-key

# Cerebras
CEREBRAS_API_KEY=your-cerebras-api-key

# Google Vertex AI
GOOGLE_VERTEX_PROJECT_ID=your-project-id
GOOGLE_VERTEX_REGION=us-central1
```

### Optional Integrations

```bash
# GitHub integration
GITHUB_TOKEN=your-github-token

# Optional: Web search
ARCADE_API_KEY=your-arcade-api-key-here
```

## Configuration Files

LLPM stores configuration in `~/.llpm/`:

| File | Purpose |
|------|---------|
| `config.json` | Project configurations |
| `chat-sessions/` | Persistent chat history |
| `system_prompt.txt` | Custom system prompt |
| `skills/` | Installed skills |

## Custom System Prompt

Edit the system prompt to customize AI behavior:

```bash
nano ~/.llpm/system_prompt.txt
```

Changes take effect on the next chat session.

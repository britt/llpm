#!/bin/bash

# LiteLLM Proxy entrypoint script
echo "Starting LiteLLM Proxy Server..."

# Export API keys for various providers
export OPENAI_API_KEY="${OPENAI_API_KEY}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
export HUGGINGFACE_TOKEN="${HUGGINGFACE_TOKEN}"
export GROQ_API_KEY="${GROQ_API_KEY}"
export GOOGLE_VERTEX_PROJECT_ID="${GOOGLE_VERTEX_PROJECT_ID}"

# Set master key if provided
if [ -n "$LITELLM_MASTER_KEY" ]; then
    export LITELLM_MASTER_KEY="${LITELLM_MASTER_KEY}"
    echo "Master key configured for authentication"
fi

# Check which providers are configured
echo "Configured providers:"
[ -n "$OPENAI_API_KEY" ] && echo "  ✓ OpenAI"
[ -n "$ANTHROPIC_API_KEY" ] && echo "  ✓ Anthropic"
[ -n "$HUGGINGFACE_TOKEN" ] && echo "  ✓ HuggingFace"
[ -n "$GROQ_API_KEY" ] && echo "  ✓ Groq"
[ -n "$GOOGLE_VERTEX_PROJECT_ID" ] && echo "  ✓ Google Vertex AI"

# Check for Ollama connection
if [ -n "$OLLAMA_API_BASE" ]; then
    echo "  ✓ Ollama (${OLLAMA_API_BASE})"
fi

echo "LiteLLM Proxy starting on port 4000..."

# Explicitly disable database to avoid Prisma issues
export DISABLE_PRISMA_CLIENT=true
export STORE_MODEL_IN_DB=false

# Run the command passed to docker run
exec "$@"
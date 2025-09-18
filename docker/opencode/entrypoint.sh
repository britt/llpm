#!/bin/bash

# OpenCode entrypoint script
echo "Starting OpenCode environment..."

# Set up HuggingFace configuration if token is provided
if [ -n "$HUGGINGFACE_TOKEN" ]; then
    echo "Setting up HuggingFace authentication..."
    mkdir -p ~/.huggingface
    echo "$HUGGINGFACE_TOKEN" > ~/.huggingface/token
fi

# Start Ollama service if available
if command -v ollama &> /dev/null; then
    echo "Starting Ollama service..."
    ollama serve > /var/log/ollama.log 2>&1 &
    sleep 2
    
    # Pull the default model if specified
    if [ -n "$OPENCODE_MODEL" ]; then
        echo "Pulling model: $OPENCODE_MODEL"
        ollama pull "$OPENCODE_MODEL" || true
    fi
fi

# Set up LiteLLM proxy if configured
if [ -n "$LITELLM_MODEL" ]; then
    echo "Configuring LiteLLM with model: $LITELLM_MODEL"
    export LITELLM_MODEL="$LITELLM_MODEL"
fi

# Create configuration directory
mkdir -p ~/.opencode
cat > ~/.opencode/config.json <<EOF
{
    "default_model": "${OPENCODE_MODEL:-codellama}",
    "ollama_host": "${OLLAMA_HOST:-http://localhost:11434}",
    "huggingface_token": "${HUGGINGFACE_TOKEN}",
    "litellm_model": "${LITELLM_MODEL}",
    "workspace": "/opencode-workspace"
}
EOF

# Run the command passed to docker run
exec "$@"
#!/bin/bash

# OpenCode entrypoint script
echo "Starting OpenCode environment as user: $(whoami)"
echo "Home directory: $HOME"
echo "Working directory: $(pwd)"

# Initialize git config for user if not exists
if [ ! -f ~/.gitconfig ]; then
    git config --global user.email "opencode@llpm.local"
    git config --global user.name "OpenCode Assistant"
    git config --global init.defaultBranch main
fi

# Set up HuggingFace configuration if token is provided
if [ -n "$HUGGINGFACE_TOKEN" ]; then
    echo "Setting up HuggingFace authentication..."
    mkdir -p ~/.huggingface
    echo "$HUGGINGFACE_TOKEN" > ~/.huggingface/token
fi

# Start Ollama service if available
if command -v ollama &> /dev/null; then
    echo "Starting Ollama service..."
    sudo mkdir -p /var/log
    sudo ollama serve > /var/log/ollama.log 2>&1 &
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
    "workspace": "/home/opencode/workspace"
}
EOF

# Parse CLI options from environment
OLLAMA_CLI_OPTS="${OLLAMA_CLI_OPTIONS:-}"
LITELLM_CLI_OPTS="${LITELLM_CLI_OPTIONS:-}"

# If starting an interactive shell, show available CLIs and options
if [ "$1" = "/bin/bash" ]; then
    if command -v ollama &> /dev/null; then
        echo "Ollama CLI available. Default options: $OLLAMA_CLI_OPTS"
        echo "Run: ollama $OLLAMA_CLI_OPTS [command]"
    fi
    if command -v litellm &> /dev/null; then
        echo "LiteLLM CLI available. Default options: $LITELLM_CLI_OPTS"
        echo "Run: litellm $LITELLM_CLI_OPTS [command]"
    fi
fi

# If the command is specifically 'ollama', add default options
if [ "$1" = "ollama" ]; then
    shift
    exec ollama $OLLAMA_CLI_OPTS "$@"
# If the command is specifically 'litellm', add default options
elif [ "$1" = "litellm" ]; then
    shift
    exec litellm $LITELLM_CLI_OPTS "$@"
else
    # Run the command passed to docker run
    exec "$@"
fi
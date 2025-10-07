#!/bin/bash

# OpenAI Codex entrypoint script
echo "Starting OpenAI Codex environment as user: $(whoami)"
echo "Home directory: $HOME"
echo "Working directory: $(pwd)"

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not set. OpenAI features will be limited."
fi

# Initialize git config for user if not exists
if [ ! -f ~/.gitconfig ]; then
    git config --global user.email "codex@llpm.local"
    git config --global user.name "Codex Assistant"
    git config --global init.defaultBranch main
fi

# Set up OpenAI configuration
mkdir -p ~/.openai
cat > ~/.openai/config.json <<EOF
{
    "api_key": "${OPENAI_API_KEY}",
    "model": "${OPENAI_MODEL:-gpt-4-turbo-preview}",
    "organization": "${OPENAI_ORG_ID}",
    "workspace": "/home/codex/workspace"
}
EOF

# Export for CLI tools
export OPENAI_API_KEY="${OPENAI_API_KEY}"

# Parse CLI options from environment
OPENAI_CLI_OPTS="${OPENAI_CLI_OPTIONS:-}"

# Add authentication helper alias to .bashrc
if [ ! -f ~/.bashrc ] || ! grep -q "signal-authenticated" ~/.bashrc; then
    cat >> ~/.bashrc << 'EOF'

# Helper command to signal authentication to REST broker
alias signal-authenticated='curl -X PATCH http://rest-broker:3010/agents/openai-codex/auth && echo "Authentication signaled successfully"'
EOF
fi

# If starting an interactive shell and Codex CLI exists, show options
if [ "$1" = "/bin/bash" ] && command -v codex &> /dev/null; then
    echo "OpenAI Codex CLI available. Default options: $OPENAI_CLI_OPTS"
    echo "Run: codex $OPENAI_CLI_OPTS [additional-args]"
    echo ""
    echo "After authenticating with OpenAI Codex, run: signal-authenticated"
fi

# If the command is specifically 'openai', add default options
if [ "$1" = "openai" ]; then
    shift
    exec openai $OPENAI_CLI_OPTS "$@"
else
    # Run the command passed to docker run
    exec "$@"
fi
#!/bin/bash

# OpenAI Codex entrypoint script
echo "Starting OpenAI Codex environment..."

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY not set. OpenAI features will be limited."
fi

# Set up OpenAI configuration
mkdir -p ~/.openai
cat > ~/.openai/config.json <<EOF
{
    "api_key": "${OPENAI_API_KEY}",
    "model": "${OPENAI_MODEL:-gpt-4-turbo-preview}",
    "organization": "${OPENAI_ORG_ID}",
    "workspace": "/codex-workspace"
}
EOF

# Export for CLI tools
export OPENAI_API_KEY="${OPENAI_API_KEY}"

# Parse CLI options from environment
OPENAI_CLI_OPTS="${OPENAI_CLI_OPTIONS:-}"

# If starting an interactive shell and OpenAI CLI exists, show options
if [ "$1" = "/bin/bash" ] && command -v openai &> /dev/null; then
    echo "OpenAI CLI available. Default options: $OPENAI_CLI_OPTS"
    echo "Run: openai $OPENAI_CLI_OPTS [additional-args]"
fi

# If the command is specifically 'openai', add default options
if [ "$1" = "openai" ]; then
    shift
    exec openai $OPENAI_CLI_OPTS "$@"
else
    # Run the command passed to docker run
    exec "$@"
fi
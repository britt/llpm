#!/bin/bash

# Aider entrypoint script
echo "Starting Aider environment..."

# Check for API keys
if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Warning: Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is set. Aider will not function properly."
fi

# Set up Aider configuration
mkdir -p ~/.aider

# Create Aider config
cat > ~/.aider/aider.conf.yml <<EOF
# Aider configuration
model: ${AIDER_MODEL:-gpt-4-turbo-preview}
auto-commits: ${AIDER_AUTO_COMMITS:-false}
dark-mode: ${AIDER_DARK_MODE:-true}
edit-format: diff
pretty: true
stream: true
EOF

# Export API keys for Aider
export OPENAI_API_KEY="${OPENAI_API_KEY}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Initialize git config if not exists
if [ ! -f ~/.gitconfig ]; then
    git config --global user.email "aider@docker.local"
    git config --global user.name "Aider Assistant"
    git config --global init.defaultBranch main
fi

# Parse CLI options from environment
AIDER_CLI_OPTS="${AIDER_CLI_OPTIONS:-}"

# If starting an interactive shell, show Aider options
if [ "$1" = "/bin/bash" ]; then
    echo "Aider CLI available. Default options: $AIDER_CLI_OPTS"
    echo "Run: aider $AIDER_CLI_OPTS [files...]"
fi

# If the command is specifically 'aider', add default options
if [ "$1" = "aider" ]; then
    shift
    exec aider $AIDER_CLI_OPTS "$@"
else
    # Run the command passed to docker run
    exec "$@"
fi
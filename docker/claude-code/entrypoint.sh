#!/bin/bash

# Claude Code entrypoint script
echo "Starting Claude Code environment..."

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Warning: ANTHROPIC_API_KEY not set. Claude Code features will be limited."
fi

# Set up Claude Code configuration
mkdir -p ~/.claude-code
cat > ~/.claude-code/config.json <<EOF
{
    "model": "${CLAUDE_MODEL:-claude-3-opus-20240229}",
    "api_key": "${ANTHROPIC_API_KEY}",
    "workspace": "/claude-workspace"
}
EOF

# Run the command passed to docker run
exec "$@"
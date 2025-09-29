#!/bin/bash

# Claude Code entrypoint script
echo "Starting Claude Code environment..."

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Warning: ANTHROPIC_API_KEY not set. Claude Code features will be limited."
fi

export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

# Parse CLI options from environment
CLAUDE_CLI_OPTS="${CLAUDE_CLI_OPTIONS:-}"

# If starting an interactive shell and Claude CLI exists, show options
if [ "$1" = "/bin/bash" ] && command -v claude-code &> /dev/null; then
    echo "Claude Code CLI available. Default options: $CLAUDE_CLI_OPTS"
    echo "Run: claude $CLAUDE_CLI_OPTS [additional-args]"
fi

# If the command is specifically 'claude-code', add default options
if [ "$1" = "claude" ]; then
    shift
    exec claude $CLAUDE_CLI_OPTS "$@"
else
    # Run the command passed to docker run
    exec "$@"
fi
#!/bin/bash

# Claude Code entrypoint script
echo "Starting Claude Code environment as user: $(whoami)"
echo "Home directory: $HOME"
echo "Working directory: $(pwd)"

# Copy agent rules file to workspace if it exists and isn't already there
if [ -f /tmp/rules/claude-code/CLAUDE.md ] && [ ! -f ~/workspace/CLAUDE.md ]; then
    cp /tmp/rules/claude-code/CLAUDE.md ~/workspace/CLAUDE.md
    echo "Copied agent rules to workspace"
fi

# Check for API key and handle based on auth mode
if [ "${AGENT_AUTH_TYPE:-api_key}" = "api_key" ]; then
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "Warning: ANTHROPIC_API_KEY not set. Claude Code features will be limited."
    fi
    export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
    echo "Running in api_key mode with ANTHROPIC_API_KEY"
else
    echo "Running in subscription mode - authenticate via 'claude login'"
    # Don't export ANTHROPIC_API_KEY in subscription mode
    # Create a wrapper script for claude that unsets the API key
    unset ANTHROPIC_API_KEY

    # Move the real claude binary and replace it with a wrapper
    if [ -f /home/claude/.npm-global/bin/claude ] && [ ! -f /home/claude/.npm-global/bin/claude-real ]; then
        sudo mv /home/claude/.npm-global/bin/claude /home/claude/.npm-global/bin/claude-real

        # Create wrapper that replaces the original claude command
        sudo tee /home/claude/.npm-global/bin/claude > /dev/null << 'CLAUDE_WRAPPER_EOF'
#!/bin/bash
# Wrapper to run claude without API key in subscription mode
unset ANTHROPIC_API_KEY
exec /home/claude/.npm-global/bin/claude-real "$@"
CLAUDE_WRAPPER_EOF
        sudo chmod +x /home/claude/.npm-global/bin/claude
        echo "Created claude wrapper to prevent API key usage"
    fi
fi

# Initialize git config for user if not exists
if [ ! -f ~/.gitconfig ]; then
    git config --global user.email "claude@llpm.local"
    git config --global user.name "Claude Assistant"
    git config --global init.defaultBranch main
fi

# Parse CLI options from environment
CLAUDE_CLI_OPTS="${CLAUDE_CLI_OPTIONS:-}"

# Add authentication helper alias to .bashrc
if [ ! -f ~/.bashrc ] || ! grep -q "signal-authenticated" ~/.bashrc; then
    cat >> ~/.bashrc << 'EOF'

# Helper command to signal authentication to REST broker
alias signal-authenticated='curl -X PATCH http://rest-broker:3010/agents/claude-code/auth && echo "Authentication signaled successfully"'
EOF
fi

# If starting an interactive shell and Claude CLI exists, show options
if [ "$1" = "/bin/bash" ] && command -v claude &> /dev/null; then
    echo "Claude Code CLI available. Default options: $CLAUDE_CLI_OPTS"
    echo "Run: claude $CLAUDE_CLI_OPTS [additional-args]"
    echo ""
    echo "After authenticating with Claude, run: signal-authenticated"
fi

# If the command is specifically 'claude', add default options
if [ "$1" = "claude" ]; then
    shift
    # In subscription mode, explicitly remove ANTHROPIC_API_KEY from environment
    if [ "${AGENT_AUTH_TYPE:-api_key}" = "subscription" ]; then
        exec env -u ANTHROPIC_API_KEY claude $CLAUDE_CLI_OPTS "$@"
    else
        exec claude $CLAUDE_CLI_OPTS "$@"
    fi
else
    # Run the command passed to docker run
    # In subscription mode, explicitly remove ANTHROPIC_API_KEY from environment
    if [ "${AGENT_AUTH_TYPE:-api_key}" = "subscription" ]; then
        exec env -u ANTHROPIC_API_KEY "$@"
    else
        exec "$@"
    fi
fi
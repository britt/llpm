#!/bin/bash

# Claude Code entrypoint script
echo "Starting Claude Code environment as user: $(whoami)"
echo "Home directory: $HOME"
echo "Working directory: $(pwd)"

# Initialize skills directories and repository
if [ -x /usr/local/bin/init-skills.sh ]; then
    /usr/local/bin/init-skills.sh
fi

# In subscription mode, remove ANTHROPIC_API_KEY and set base URL to /claude endpoint
# This must be done FIRST before any other commands that might use it
if [ "${AGENT_AUTH_TYPE:-api_key}" = "subscription" ]; then
    unset ANTHROPIC_API_KEY
    export ANTHROPIC_BASE_URL="http://litellm-proxy:4000/claude"
    # Write to /etc/environment so it persists for all shells
    echo "ANTHROPIC_BASE_URL=http://litellm-proxy:4000/claude" | sudo tee -a /etc/environment > /dev/null
    echo "Running in subscription mode - using OAuth credentials with ${ANTHROPIC_BASE_URL}"
fi

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
        # Use env -u to explicitly remove ANTHROPIC_API_KEY from the environment before exec
        sudo tee /home/claude/.npm-global/bin/claude > /dev/null << 'CLAUDE_WRAPPER_EOF'
#!/bin/bash
# Wrapper to run claude without API key in subscription mode
# Use env -u to remove ANTHROPIC_API_KEY from environment before executing
exec env -u ANTHROPIC_API_KEY /home/claude/.npm-global/bin/claude-real "$@"
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
    echo ""
    echo "🚀 Quick Start:"
    echo "  auth-and-setup.sh    - Authenticate with Claude & install plugins (recommended)"
    echo ""
    echo "Manual Setup:"
    echo "  claude login         - Authenticate with Claude"
    echo "  signal-authenticated - Signal REST broker after authentication"
    echo "  install-plugins.sh   - Install Superpowers plugin"
    echo ""
    echo "Skills directories:"
    echo "  - Public skills: /mnt/skills/public"
    echo "  - User skills: /mnt/skills/user"
fi

# Optional: Auto-install plugins if SKILLS_INSTALL_PLUGINS is enabled
# This requires prior authentication, so it's best done manually or via a post-auth hook
if [ "${SKILLS_INSTALL_PLUGINS:-false}" = "true" ]; then
    echo "Note: SKILLS_INSTALL_PLUGINS is enabled. Run 'install-plugins.sh' after authentication."
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
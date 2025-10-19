#!/bin/bash
set -e

# Interactive authentication and plugin setup script for Claude Code
# This script guides users through authentication and automatically installs plugins

echo "======================================"
echo "Claude Code Authentication & Setup"
echo "======================================"
echo ""

# Check if claude command is available
if ! command -v claude &> /dev/null; then
    echo "Error: 'claude' command not found. Is Claude Code installed?"
    exit 1
fi

# Function to check if Claude is authenticated
check_auth() {
    # Try a simple command that requires authentication
    # Using --dangerously-skip-permissions to avoid permission prompts
    if echo "/help" | timeout 5 claude --dangerously-skip-permissions &> /dev/null; then
        return 0  # Authenticated
    else
        return 1  # Not authenticated
    fi
}

# Check if already authenticated
if check_auth; then
    echo "✅ Already authenticated with Claude!"
    echo ""
    read -p "Do you want to re-authenticate? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping authentication..."
        SKIP_AUTH=true
    fi
fi

# Perform authentication unless skipped
if [ "${SKIP_AUTH:-false}" != "true" ]; then
    echo "Starting Claude Code authentication..."
    echo ""
    echo "Please follow the prompts to authenticate with Claude."
    echo "This will open a browser window or provide a link to authenticate."
    echo ""

    # Determine auth method based on mode
    if [ "${AGENT_AUTH_TYPE:-api_key}" = "subscription" ]; then
        echo "Running in SUBSCRIPTION mode - using OAuth authentication"
        echo ""

        # For subscription mode, use 'claude login'
        claude login

    else
        echo "Running in API KEY mode"
        echo "Using ANTHROPIC_API_KEY from environment"
        echo ""

        # In API key mode, the key should already be set
        if [ -z "$ANTHROPIC_API_KEY" ]; then
            echo "Error: ANTHROPIC_API_KEY not set in environment"
            exit 1
        fi
    fi

    echo ""
    echo "Verifying authentication..."
    sleep 2

    # Verify authentication succeeded
    MAX_ATTEMPTS=10
    ATTEMPT=0

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if check_auth; then
            echo "✅ Authentication successful!"
            break
        fi

        echo "Waiting for authentication to complete... (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
        sleep 3
        ((ATTEMPT++))
    done

    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "❌ Authentication verification failed"
        echo "Please try running 'claude login' manually"
        exit 1
    fi
fi

echo ""
echo "======================================"
echo "Installing Plugins"
echo "======================================"
echo ""

# Install marketplace plugin
echo "📦 Adding Superpowers marketplace..."
if echo "/plugin marketplace add obra/superpowers-marketplace" | claude --dangerously-skip-permissions 2>&1 | tee /tmp/plugin-add.log; then
    echo "✅ Marketplace added successfully"
else
    # Check if already exists
    if grep -q "already exists\|already added" /tmp/plugin-add.log; then
        echo "ℹ️  Marketplace already added"
    else
        echo "⚠️  Warning: Marketplace add may have failed (continuing anyway)"
    fi
fi

echo ""
echo "📦 Installing Superpowers plugin..."
if echo "/plugin install superpowers@superpowers-marketplace" | claude --dangerously-skip-permissions 2>&1 | tee /tmp/plugin-install.log; then
    echo "✅ Plugin installed successfully"
else
    # Check if already installed
    if grep -q "already installed" /tmp/plugin-install.log; then
        echo "ℹ️  Plugin already installed"
    else
        echo "⚠️  Warning: Plugin installation may have failed"
    fi
fi

echo ""
echo "Verifying plugin installation..."
echo "/plugin list" | claude --dangerously-skip-permissions

echo ""
echo "======================================"
echo "Signaling REST Broker"
echo "======================================"
echo ""

# Signal the REST broker that authentication is complete
if command -v signal-authenticated &> /dev/null; then
    echo "📡 Notifying REST broker of successful authentication..."
    if signal-authenticated; then
        echo "✅ REST broker notified"
    else
        echo "⚠️  Warning: Failed to notify REST broker (not critical)"
    fi
else
    echo "ℹ️  signal-authenticated command not available (skipping)"
fi

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Your Claude Code environment is ready to use."
echo ""
echo "Skills directories:"
echo "  - Public skills: /mnt/skills/public"
echo "  - User skills: /mnt/skills/user"
echo ""
echo "To start using Claude Code, run:"
echo "  claude"
echo ""
echo "Or with default options:"
echo "  claude ${CLAUDE_CLI_OPTIONS:-}"
echo ""

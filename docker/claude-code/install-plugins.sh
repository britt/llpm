#!/bin/bash
set -e

# Install Claude Code plugins (Superpowers marketplace)
# This script should be run after Claude authentication is complete

echo "Installing Claude Code plugins..."

# Check if claude command is available
if ! command -v claude &> /dev/null; then
    echo "Error: 'claude' command not found. Is Claude Code installed?"
    exit 1
fi

# Check if we're authenticated by trying to run a simple command
# Note: This is a basic check - actual auth validation may vary
echo "Checking Claude authentication..."

# Add marketplace and install plugin
# These commands are idempotent - they won't fail if already installed
echo "Adding Superpowers marketplace..."
if echo "/plugin marketplace add obra/superpowers-marketplace" | claude --print --dangerously-skip-permissions 2>&1 | grep -q "Error\|authentication"; then
    echo "Error: Not authenticated or command failed. Please authenticate with 'claude login' first."
    exit 1
fi

echo "Installing Superpowers plugin..."
echo "/plugin install superpowers@superpowers-marketplace" | claude --print --dangerously-skip-permissions 2>&1 || {
    echo "Warning: Plugin installation may have failed or plugin is already installed (continuing anyway)"
}

echo "Plugin installation complete!"
echo "You can verify by running: echo '/plugin list' | claude --print --dangerously-skip-permissions"

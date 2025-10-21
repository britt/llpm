#!/bin/bash

# Install Claude Code plugins (Superpowers marketplace)
#
# NOTE: Plugin installation cannot be automated because slash commands require
# an interactive terminal (TTY). The Ink UI framework used by Claude Code needs
# raw mode which is not available when input is piped.
#
# This script provides instructions for manual installation.

echo "======================================"
echo "Claude Code Plugin Installation"
echo "======================================"
echo ""
echo "⚠️  Plugin installation requires an interactive Claude session."
echo ""
echo "Slash commands like /plugin cannot be used with piped input because"
echo "they require the Ink terminal UI, which needs a TTY."
echo ""
echo "======================================"
echo "Installation Instructions"
echo "======================================"
echo ""
echo "1. Start an interactive Claude session:"
echo "   claude"
echo ""
echo "2. Run these slash commands in the Claude interface:"
echo "   /plugin marketplace add obra/superpowers-marketplace"
echo "   /plugin install superpowers@superpowers-marketplace"
echo ""
echo "3. Verify installation:"
echo "   /plugin list"
echo ""
echo "======================================"
echo ""

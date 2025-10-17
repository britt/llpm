#!/bin/bash

# Setup script for local embeddings dependencies

set -e

echo "Setting up local embeddings dependencies..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3."
    exit 1
fi

echo "✓ pip3 found"
echo

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r "$SCRIPT_DIR/requirements.txt"

echo
echo "✓ Dependencies installed successfully!"
echo
echo "The bge-base-en-v1.5 model will be downloaded automatically on first use."
echo "Model size: ~420MB"
echo
echo "To test the setup, run:"
echo "  echo '{\"input\": [\"test\"]}' | python3 $SCRIPT_DIR/generate.py"

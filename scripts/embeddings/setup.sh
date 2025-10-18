#!/bin/bash

# Setup script for local embeddings dependencies
# Creates a virtual environment and installs dependencies

set -e

echo "Setting up local embeddings dependencies..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

# Check if virtual environment already exists
if [ -d "$VENV_DIR" ]; then
    echo "⚠️  Virtual environment already exists at $VENV_DIR"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing virtual environment..."
        rm -rf "$VENV_DIR"
    else
        echo "Using existing virtual environment."
        echo "To reinstall dependencies, delete the venv directory and run this script again."
        exit 0
    fi
fi

# Create virtual environment
echo
echo "Creating virtual environment..."
python3 -m venv "$VENV_DIR"

echo "✓ Virtual environment created at $VENV_DIR"
echo

# Activate virtual environment and install dependencies
echo "Installing Python dependencies in virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r "$SCRIPT_DIR/requirements.txt"

deactivate

echo
echo "✓ Dependencies installed successfully in virtual environment!"
echo
echo "The bge-base-en-v1.5 model will be downloaded automatically on first use."
echo "Model size: ~420MB"
echo
echo "To test the setup, run:"
echo "  echo '{\"input\": [\"test\"]}' | $VENV_DIR/bin/python $SCRIPT_DIR/generate.py"
echo
echo "LLPM will automatically use the virtual environment when available."

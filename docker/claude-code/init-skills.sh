#!/bin/bash
set -e

# Initialize skills directories and clone Anthropic skills repository
# This script is called by entrypoint.sh during container startup

echo "Initializing skills directories..."

# Create main skills directory with sudo if needed
if [ ! -d /mnt/skills ]; then
    sudo mkdir -p /mnt/skills
    sudo chown claude:claude /mnt/skills
fi

# Clone or update public skills repository
SKILLS_REPO_PATH="/mnt/skills/public"
SKILLS_REPO_URL_SSH="git@github.com:anthropics/skills.git"
SKILLS_REPO_URL_HTTPS="https://github.com/anthropics/skills.git"

if [ ! -d "$SKILLS_REPO_PATH/.git" ]; then
    echo "Cloning Anthropic skills repository..."

    # Check if SSH key is provided
    if [ -n "$SKILLS_SSH_KEY" ]; then
        echo "Using SSH authentication for cloning..."

        # Set up SSH key
        mkdir -p ~/.ssh
        chmod 700 ~/.ssh
        echo "$SKILLS_SSH_KEY" > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa

        # Add GitHub to known hosts
        ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null

        # Clone via SSH
        if git clone "$SKILLS_REPO_URL_SSH" "$SKILLS_REPO_PATH"; then
            echo "Successfully cloned skills repository via SSH"
        else
            echo "Failed to clone via SSH, falling back to HTTPS..."
            rm -rf "$SKILLS_REPO_PATH"
            git clone "$SKILLS_REPO_URL_HTTPS" "$SKILLS_REPO_PATH"
        fi
    else
        echo "Using HTTPS authentication for cloning..."
        # HTTPS fallback (works for public repos)
        git clone "$SKILLS_REPO_URL_HTTPS" "$SKILLS_REPO_PATH"
    fi

    echo "Skills repository cloned to $SKILLS_REPO_PATH"
else
    echo "Skills repository already exists at $SKILLS_REPO_PATH"

    # Optional: update repository if SKILLS_AUTO_PULL is enabled
    if [ "${SKILLS_AUTO_PULL:-false}" = "true" ]; then
        echo "Auto-updating skills repository..."
        (cd "$SKILLS_REPO_PATH" && git pull --ff-only) || {
            echo "Warning: Failed to auto-update skills repository (continuing anyway)"
        }
    fi
fi

# Ensure user skills directory exists and is writable
USER_SKILLS_PATH="/mnt/skills/user"
if [ ! -d "$USER_SKILLS_PATH" ]; then
    echo "Creating user skills directory at $USER_SKILLS_PATH..."
    mkdir -p "$USER_SKILLS_PATH"
fi

# Set proper ownership for user skills directory
SKILLS_UID="${SKILLS_UID:-1000}"
SKILLS_GID="${SKILLS_GID:-1000}"

# Get current user's UID/GID if running as claude
if [ "$(whoami)" = "claude" ]; then
    SKILLS_UID=$(id -u)
    SKILLS_GID=$(id -g)
fi

# Apply permissions
chown -R "$SKILLS_UID:$SKILLS_GID" "$USER_SKILLS_PATH" 2>/dev/null || {
    sudo chown -R "$SKILLS_UID:$SKILLS_GID" "$USER_SKILLS_PATH"
}

echo "Skills directories initialized successfully"
echo "  - Public skills: $SKILLS_REPO_PATH"
echo "  - User skills: $USER_SKILLS_PATH"

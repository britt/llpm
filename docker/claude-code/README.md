# Claude Code Container - Skills & Setup Guide

This document provides comprehensive information about the Claude Code container's skills repository management and automated authentication setup.

## Table of Contents

- [Skills Repository Setup](#skills-repository-setup)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Authentication & Plugin Installation](#authentication--plugin-installation)
- [Environment Variables](#environment-variables)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)

## Skills Repository Setup

The Claude Code container automatically manages two skills directories:

### Public Skills (`/mnt/skills/public`)

**What it is:**

- Official skills repository from Anthropic
- Contains pre-built skills for common tasks
- Read-only for standard use

**How it works:**

- Automatically cloned from `https://github.com/anthropics/skills.git` on first startup
- Updated automatically on each container restart (configurable)
- Idempotent - won't re-clone if already exists

**Repository URL:**

- HTTPS: `https://github.com/anthropics/skills.git`
- SSH: `git@github.com:anthropics/skills.git` (requires `SKILLS_SSH_KEY`)

### User Skills (`/mnt/skills/user`)

**What it is:**

- Your custom skills directory
- Fully writable for creating and modifying skills
- Persisted on host system for durability

**Host Path:**

- Mounted from: `~/.llpm/skills/user` on your host system
- Container path: `/mnt/skills/user`

**Benefits:**

- ✅ Skills persist across container restarts and removals
- ✅ Easy to edit from host system with your favorite editor
- ✅ Version control your custom skills with git
- ✅ Share skills across multiple claude-code containers
- ✅ Backup-friendly - just copy the `~/.llpm/skills/user` directory

## Directory Structure

```
Host System:
~/.llpm/skills/user/           # Your custom skills (persisted)

Container:
/mnt/skills/
├── public/                    # Anthropic official skills (auto-cloned)
│   ├── algorithmic-art/
│   ├── artifacts-builder/
│   ├── canvas-design/
│   └── ... (many more)
└── user/                      # Your custom skills (mounted from host)
    └── (your skills here)
```

## Quick Start

### 1. Start the Container

```bash
docker-compose up -d claude-code
```

On first startup, the container will:

- Clone the Anthropic skills repository to `/mnt/skills/public`
- Create the user skills directory at `/mnt/skills/user`
- Create `~/.llpm/skills/user` on your host system if it doesn't exist

### 2. Authenticate & Install Plugins (Recommended)

Connect to the container and run the automated setup:

```bash
docker exec -it docker-claude-code-1 bash
auth-and-setup.sh
```

The `auth-and-setup.sh` script will:

1. Guide you through Claude authentication
2. Verify authentication is successful
3. Automatically install the Superpowers marketplace
4. Automatically install the Superpowers plugin
5. Signal the REST broker that authentication is complete
6. Display completion summary

### 3. Start Using Claude Code

After authentication completes, you can start using Claude Code:

```bash
claude
```

## Authentication & Plugin Installation

### Automated Setup (Recommended)

The **`auth-and-setup.sh`** script provides a guided, interactive setup experience:

**Features:**

- ✅ Interactive - walks you through each step
- ✅ Smart detection - checks if already authenticated
- ✅ Mode-aware - works in API key and subscription modes
- ✅ Automatic plugin installation after authentication
- ✅ REST broker notification
- ✅ Idempotent - safe to run multiple times

**Usage:**

```bash
docker exec -it docker-claude-code-1 bash
auth-and-setup.sh
```

**What happens:**

```
======================================
Claude Code Authentication & Setup
======================================

Starting Claude Code authentication...

Please follow the prompts to authenticate with Claude.
This will open a browser window or provide a link to authenticate.

Running in SUBSCRIPTION mode - using OAuth authentication
[Authentication prompt appears...]

✅ Authentication successful!

======================================
Installing Plugins
======================================

📦 Adding Superpowers marketplace...
✅ Marketplace added successfully

📦 Installing Superpowers plugin...
✅ Plugin installed successfully

======================================
Signaling REST Broker
======================================

📡 Notifying REST broker of successful authentication...
✅ REST broker notified

======================================
Setup Complete!
======================================

Your Claude Code environment is ready to use.

Skills directories:
  - Public skills: /mnt/skills/public
  - User skills: /mnt/skills/user

To start using Claude Code, run:
  claude
```

### Manual Setup (Alternative)

If you prefer manual control:

```bash
# 1. Connect to container
docker exec -it docker-claude-code-1 bash

# 2. Authenticate
claude login

# 3. Signal REST broker
signal-authenticated

# 4. Install plugins
install-plugins.sh
```

## Environment Variables

Configure these in `docker/.env` or via docker-compose:

### Skills Repository Configuration

| Variable           | Default  | Description                                                                             |
| ------------------ | -------- | --------------------------------------------------------------------------------------- |
| `SKILLS_SSH_KEY`   | _(none)_ | SSH private key for cloning private repos. Use for private Anthropic skills access.     |
| `SKILLS_AUTO_PULL` | `true`   | Automatically update skills repository on container restart. Set to `false` to disable. |
| `SKILLS_UID`       | `1000`   | User ID for skills directory ownership. Auto-detected for `claude` user.                |
| `SKILLS_GID`       | `1000`   | Group ID for skills directory ownership. Auto-detected for `claude` user.               |

### Authentication & Plugin Configuration

| Variable                 | Default                          | Description                                       |
| ------------------------ | -------------------------------- | ------------------------------------------------- |
| `SKILLS_INSTALL_PLUGINS` | `false`                          | Show plugin installation reminder on startup.     |
| `ANTHROPIC_API_KEY`      | _(required)_                     | Your Anthropic API key (API key mode only).       |
| `CLAUDE_CLI_OPTIONS`     | `--dangerously-skip-permissions` | Default CLI options for Claude Code.              |
| `AGENT_AUTH_TYPE`        | `subscription`                   | Authentication mode: `api_key` or `subscription`. |

## Advanced Configuration

### SSH Authentication for Private Repositories

If you need to clone a private version of the skills repository:

**Option 1: Environment Variable**

```bash
# In docker/.env
SKILLS_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
...your key here...
-----END OPENSSH PRIVATE KEY-----"
```

**Option 2: Mount SSH Directory**

```yaml
# In docker-compose.yml (already configured)
volumes:
  - ${HOME}/.ssh:/home/claude/.ssh:ro
```

**Security Note:** For production, use Docker secrets or secure secret management instead of environment variables.

### Disable Auto-Update

If you want to pin a specific version of the skills repository:

```bash
# In docker/.env
SKILLS_AUTO_PULL=false
```

Then manually update when desired:

```bash
docker exec docker-claude-code-1 bash -c "cd /mnt/skills/public && git pull"
```

### Use Custom Skills Repository URL

To use a fork or custom skills repository, modify `init-skills.sh`:

```bash
# Change these lines in docker/claude-code/init-skills.sh
SKILLS_REPO_URL_SSH="git@github.com:yourorg/your-skills.git"
SKILLS_REPO_URL_HTTPS="https://github.com/yourorg/your-skills.git"
```

### Mount Different Host Directory for User Skills

Override the default host path in `docker-compose.yml`:

```yaml
volumes:
  # Instead of default ~/.llpm/skills/user
  - /path/to/your/custom/skills:/mnt/skills/user
```

Or use `docker-compose.override.yml`:

```yaml
services:
  claude-code:
    volumes:
      - /path/to/your/custom/skills:/mnt/skills/user
```

## Creating Custom Skills

### 1. Create a Skill Directory

Skills are stored in `~/.llpm/skills/user/` on your host system:

```bash
# Create a new skill directory
mkdir -p ~/.llpm/skills/user/my-custom-skill

# Create the skill file
cat > ~/.llpm/skills/user/my-custom-skill/SKILL.md << 'EOF'
---
name: my-custom-skill
description: Does something awesome
---

# My Custom Skill

This skill does amazing things.

## Usage

...
EOF
```

### 2. Use the Skill

Inside the container, Claude Code can access your custom skills:

```bash
docker exec -it docker-claude-code-1 bash
claude
# Your custom skills are now available
```

### 3. Version Control Your Skills

```bash
cd ~/.llpm/skills/user
git init
git add .
git commit -m "Add my custom skills"
git remote add origin <your-repo-url>
git push
```

## Troubleshooting

### Skills Repository Not Cloning

**Problem:** Container starts but skills repository is not cloned.

**Solution:**

```bash
# Check container logs
docker logs docker-claude-code-1

# Manually trigger clone
docker exec docker-claude-code-1 bash -c "rm -rf /mnt/skills/public && /usr/local/bin/init-skills.sh"
```

### User Skills Directory Not Writable

**Problem:** Cannot create or modify skills in `/mnt/skills/user`.

**Solution:**

```bash
# Check permissions on host
ls -ld ~/.llpm/skills/user

# Fix permissions
chmod 755 ~/.llpm/skills/user
chown -R $USER ~/.llpm/skills/user

# Restart container
docker-compose restart claude-code
```

### Authentication Fails

**Problem:** `auth-and-setup.sh` times out or authentication doesn't complete.

**Solution:**

```bash
# Try manual authentication
docker exec -it docker-claude-code-1 bash
claude login

# Check authentication status
echo "/help" | claude --dangerously-skip-permissions

# If successful, signal manually
signal-authenticated
```

### Plugin Installation Fails

**Problem:** Plugins don't install even after authentication.

**Solution:**

```bash
# Verify authentication first
docker exec docker-claude-code-1 bash -c "echo '/help' | claude --dangerously-skip-permissions"

# Manually run plugin installation
docker exec -it docker-claude-code-1 bash
install-plugins.sh

# Check plugin list
echo "/plugin list" | claude --dangerously-skip-permissions
```

### Skills Not Updating

**Problem:** `SKILLS_AUTO_PULL=true` but repository doesn't update.

**Solution:**

```bash
# Check if git pull is working
docker exec docker-claude-code-1 bash -c "cd /mnt/skills/public && git pull --ff-only"

# Check for local changes blocking pull
docker exec docker-claude-code-1 bash -c "cd /mnt/skills/public && git status"

# If local changes exist, reset
docker exec docker-claude-code-1 bash -c "cd /mnt/skills/public && git reset --hard origin/main"
```

### Host Directory Not Created

**Problem:** `~/.llpm/skills/user` doesn't exist on host system.

**Solution:**

```bash
# Create directory manually
mkdir -p ~/.llpm/skills/user

# Restart container to mount it
docker-compose restart claude-code

# Verify mount
docker exec docker-claude-code-1 bash -c "ls -la /mnt/skills/user"
```

## Additional Resources

- **Anthropic Skills Repository**: https://github.com/anthropics/skills
- **Claude Code Documentation**: https://docs.anthropic.com/claude-code
- **LLPM Docker Documentation**: `../README.md`
- **Issue Tracker**: https://github.com/britt/llpm/issues

## Quick Reference

**Common Commands:**

```bash
# Start container
docker-compose up -d claude-code

# Connect to container
docker exec -it docker-claude-code-1 bash

# Authenticate and setup
auth-and-setup.sh

# Manual authentication
claude login
signal-authenticated

# Install plugins manually
install-plugins.sh

# View skills
ls /mnt/skills/public
ls /mnt/skills/user

# Update skills repository
cd /mnt/skills/public && git pull

# Start Claude Code
claude
```

**Important Paths:**

- Host user skills: `~/.llpm/skills/user`
- Container public skills: `/mnt/skills/public`
- Container user skills: `/mnt/skills/user`
- Auth script: `/usr/local/bin/auth-and-setup.sh`
- Plugin script: `/usr/local/bin/install-plugins.sh`
- Init script: `/usr/local/bin/init-skills.sh`

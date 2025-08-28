# LLPM Credential Profiles

LLPM supports named credential profiles to manage multiple sets of API keys and credentials. This is useful for separating work, personal, and project-specific credentials.

## Quick Start

```bash
# Start LLPM with a specific profile
llpm --profile work

# Or use the short flag
llpm -p personal
```

## Profile Management

### Create Profiles
```bash
/credentials profile create work
/credentials profile create personal
/credentials profile create client-project
```

### List Profiles
```bash
/credentials profile list
```
Output:
```
📋 Available Profiles

👉 default (active & current)
   work
   personal

💡 Profile Priority:
• Active: default 
• Current: default (stored)
```

### Switch Profiles
```bash
# Switch permanently (persisted across sessions)
/credentials profile switch work

# Override temporarily with CLI flag
llpm --profile personal
```

## Managing Credentials in Profiles

### Set Credentials
```bash
# Set in current active profile
/credentials set openai apiKey sk-your-work-key

# Set in specific profile
/credentials set openai apiKey sk-your-personal-key --profile personal
```

### View Credentials
```bash
# Show status for active profile
/credentials status

# Get specific credential (masked)
/credentials get openai apiKey
```

### Remove Credentials
```bash
# Remove from active profile
/credentials remove openai apiKey

# Remove from specific profile  
/credentials remove github token --profile work
```

## Credential Priority

LLPM follows this priority order when looking for credentials:

1. **Environment Variables** (highest priority)
2. **Active Profile** (CLI override or stored current)
3. **Default Profile** (fallback)

### Example Priority Flow

```bash
# 1. Environment variable (if set)
export OPENAI_API_KEY="env-key"

# 2. Active profile credential
/credentials set openai apiKey "profile-key" --profile work
llpm --profile work  # Uses "profile-key"

# 3. Default profile fallback
/credentials set openai apiKey "default-key"  # Fallback if not in active profile
```

## Profile Use Cases

### Work vs Personal
```bash
# Work profile
/credentials profile create work
/credentials set openai apiKey sk-work-key --profile work
/credentials set github token ghp_work_token --profile work

# Personal profile  
/credentials profile create personal
/credentials set openai apiKey sk-personal-key --profile personal
/credentials set github token ghp_personal_token --profile personal

# Start with work profile
llpm --profile work
```

### Project-Specific Credentials
```bash
# Client project with specific API limits
/credentials profile create client-acme
/credentials set openai apiKey sk-acme-limited-key --profile client-acme
/credentials set googleVertex projectId acme-vertex-project --profile client-acme

# Start with client profile
llpm --profile client-acme
```

### Development vs Production
```bash
# Development credentials
/credentials profile create dev
/credentials set openai apiKey sk-dev-key --profile dev
/credentials set github token ghp_dev_token --profile dev

# Production credentials (careful!)
/credentials profile create prod
/credentials set openai apiKey sk-prod-key --profile prod
/credentials set github token ghp_prod_token --profile prod
```

## Profile File Structure

Profiles are stored in `~/.llpm/credentials.json`:

```json
{
  "profiles": {
    "default": {
      "openai": { "apiKey": "sk-default-key" }
    },
    "work": {
      "openai": { "apiKey": "sk-work-key" },
      "github": { "token": "ghp_work_token" }
    },
    "personal": {
      "openai": { "apiKey": "sk-personal-key" }
    }
  },
  "currentProfile": "work",
  "metadata": {
    "version": "2.0.0", 
    "lastUpdated": "2025-08-28T21:00:00.000Z"
  }
}
```

## Migration from Old Format

LLPM automatically migrates old credential files to the new profile format:

**Old format:**
```json
{
  "openai": { "apiKey": "sk-key" },
  "github": { "token": "ghp_token" }
}
```

**Migrated to:**
```json
{
  "profiles": {
    "default": {
      "openai": { "apiKey": "sk-key" },
      "github": { "token": "ghp_token" }
    }
  },
  "currentProfile": "default",
  "metadata": { "version": "2.0.0" }
}
```

## Security Notes

- Credential files are created with secure permissions (0600 - readable only by owner)
- Environment variables always take priority for security
- Use environment variables in production/CI environments
- Use profiles for local development convenience

## Command Reference

| Command | Description |
|---------|-------------|
| `llpm --profile <name>` | Start with specific profile |
| `/credentials profile list` | List all profiles |
| `/credentials profile current` | Show current profile info |
| `/credentials profile create <name>` | Create new profile |
| `/credentials profile switch <name>` | Switch to profile (persistent) |
| `/credentials profile delete <name>` | Delete profile |
| `/credentials set <provider> <key> <value>` | Set credential in active profile |
| `/credentials set <provider> <key> <value> --profile <name>` | Set credential in specific profile |
| `/credentials status` | Show credential status for active profile |
| `/credentials clear` | Clear all credentials from active profile |
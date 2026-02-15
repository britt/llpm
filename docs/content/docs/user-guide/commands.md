---
title: Commands Reference
weight: 4
---

LLPM provides slash commands for quick access to features.

## Slash Commands Overview

| Command | Description |
|---------|-------------|
| `/help` | Display available commands |
| `/info` | Show application and project details |
| `/exit` | Exit LLPM |
| `/quit` | Exit LLPM |
| `/clear` | Clear the current chat session |
| `/project` | Project management |
| `/github` | GitHub operations |
| `/model` | AI model management |
| `/skills` | Skills system |
| `/notes` | Notes management |
| `/history` | Chat history actions |
| `/debug` | Debug logging information |
| `/delete` | Delete resources (notes, projects) |

Most commands support a `help` subcommand (for example, `/project help`).

## Core Commands

| Command | Description |
|---------|-------------|
| `/help` | List available commands |
| `/info` | Show version and current project information |
| `/clear` | Start a new chat session |
| `/history` | Show history help and export options |
| `/debug` | Show recent debug logs |
| `/exit` | Exit LLPM |
| `/quit` | Exit LLPM |

## Project Commands

| Command | Description |
|---------|-------------|
| `/project` | Show current project |
| `/project list` | List all projects |
| `/project add <name> <repo> <path> [description]` | Add a new project |
| `/project switch <id>` | Switch active project |
| `/project set <id>` | Alias for switching projects |
| `/project update <id> description "<description>"` | Update a project description |
| `/project scan` | Analyze the current project |
| `/project remove <id>` | Remove a project (no confirmation) |

## Notes Commands

| Command | Description |
|---------|-------------|
| `/notes` | List notes for the current project |
| `/notes add <title> [content]` | Add a note |
| `/notes show <id>` | Show a note |
| `/notes search <query>` | Search notes |
| `/notes update <id> <title> [content]` | Update a note |
| `/notes delete <id>` | Delete a note (no confirmation) |

## GitHub Commands

| Command | Description |
|---------|-------------|
| `/github list` | List your repositories |
| `/github search <query>` | Search GitHub repositories |

## Additional Commands

| Command | Description |
|---------|-------------|
| `/skills` | Skills management (use `/skills help` for subcommands) |
| `/notes` | Notes management (use `/notes help` for subcommands) |
| `/history` | Chat history display and export options |
| `/debug` | Debug logs and troubleshooting output |

## Model Commands

| Command | Description |
|---------|-------------|
| `/model` | Show current model and provider status |
| `/model list` | List available models |
| `/model switch <provider/model>` | Switch to a different model |
| `/model providers` | Show configured providers |

## Skills Commands

| Command | Description |
|---------|-------------|
| `/skills list` | List all discovered skills |
| `/skills test <name>` | Preview skill content |
| `/skills enable <name>` | Enable a skill |
| `/skills disable <name>` | Disable a skill |
| `/skills reload` | Rescan skill directories |
| `/skills reinstall` | Reinstall from repository |

## Delete Command

The `/delete` command provides a unified interface for deleting supported resources.

```bash
/delete <type> <id> [--force]
```

Supported types:

- `note` (current project)
- `project` (LLPM configuration)

By default, `/delete` prints a confirmation preview; pass `--force` (or `-f`) to delete immediately.

Examples:

```bash
/delete note note-123
/delete note note-123 --force

/delete project my-app-123
/delete project my-app-123 -f
```

## Argument Quoting

Slash command arguments are parsed with quote awareness, so quoted values are treated as a single argument.

- Use quotes for values that contain spaces (for example, project names).
- Use `""` (or `''`) to pass an empty string when a command supports an optional argument.

Examples:

```bash
/project add "My App" "owner/repo" "~/code/my-app" ""
/notes add "Meeting Notes" "Discussed architecture and milestones"
```

---
title: Commands Reference
weight: 4
---

LLPM provides slash commands for quick access to features.

## Slash Commands Overview

| Command | Description |
|---------|-------------|
| `/help` | Display available commands |
| `/quit` or `/exit` | Exit LLPM |
| `/clear` | Clear chat history |
| `/project` | Project management |
| `/github` | GitHub operations |
| `/issue` | Issue management |
| `/model` | AI model management |
| `/skills` | Skills system |
| `/notes` | Notes management |
| `/stakeholder` | Stakeholder management |
| `/history` | Chat history |
| `/debug` | Debug logs |

## Project Commands

| Command | Description |
|---------|-------------|
| `/project` | Show current project |
| `/project list` | List all projects |
| `/project add <name> <repo> <path> <desc>` | Add a new project |
| `/project switch <id>` | Switch active project |
| `/project remove <id>` | Remove a project |

## GitHub Commands

| Command | Description |
|---------|-------------|
| `/github list` | List your repositories |
| `/github search <query>` | Search GitHub repositories |

## Issue Commands

| Command | Description |
|---------|-------------|
| `/issue` | Analyze GitHub issues for the current project |
| `/issue <number>` | Analyze a specific issue for risks |
| `/issue risks <number>` | Analyze a specific issue for risks |
| `/issue help` | Show issue command help |

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

## Notes Commands

| Command | Description |
|---------|-------------|
| `/notes` | List notes for the current project |
| `/notes add <title> [content]` | Add a note |
| `/notes show <id>` | Show a note |
| `/notes search <query>` | Search notes |
| `/notes update <id> <title> [content]` | Update a note |
| `/notes delete <id>` | Delete a note |
| `/notes help` | Show notes command help |

## Stakeholder Commands

| Command | Description |
|---------|-------------|
| `/stakeholder` | List stakeholders |
| `/stakeholder add <name> <role> <description>` | Add a stakeholder |
| `/stakeholder show <name>` | Show stakeholder details |
| `/stakeholder remove <name>` | Remove a stakeholder |
| `/stakeholder link <issue#> <stakeholder> <goal>` | Link an issue to a stakeholder goal |
| `/stakeholder coverage` | Generate a coverage report |
| `/stakeholder help` | Show stakeholder command help |

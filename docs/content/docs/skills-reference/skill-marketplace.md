---
title: Skill Marketplace
description: Install and manage skills from marketplace repositories.
weight: 50
---

Use the skill marketplace to discover and install skills from GitHub-hosted marketplace repositories.

## Commands

Marketplace management is exposed through the `/skills` command.

### Register marketplace repositories

- `/skills marketplace add|remove|list`

### Sync indexes

- `/skills sync`

### Search and install skills

- `/skills search`
- `/skills install|remove`

## AI tools

Marketplace operations are also available as AI tools:

- `search_marketplace_skills`
- `install_skill`

## Input validation and path safety

Marketplace operations validate repository names and skill names against strict patterns before executing shell commands.

Install and remove operations also validate resolved paths to ensure they remain within expected directories.

## Related skills documentation

- [Skills Reference](./_index.md)

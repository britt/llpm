---
title: Skills System
weight: 3
---

Skills are reusable instruction sets that enhance AI capabilities for specific tasks.

## How Skills Work

1. **Discovery**: LLPM scans skill directories for `SKILL.md` files
2. **Loading**: Skills are parsed and registered in the system
3. **Activation**: Enabled skills are injected into the AI's system prompt
4. **Execution**: The AI follows skill instructions when relevant

## Managing Skills

### List Skills

View all discovered skills:

```bash
/skills list
```

### Test a Skill

Preview skill content without enabling:

```bash
/skills test <skill-name>
```

### Enable a Skill

Activate a skill for the current session:

```bash
/skills enable <skill-name>
```

### Disable a Skill

Deactivate a skill:

```bash
/skills disable <skill-name>
```

### Reload Skills

Rescan directories for new or modified skills:

```bash
/skills reload
```

### Reinstall Skills

Reinstall skills from the skills repository:

```bash
/skills reinstall
```

## Skill Locations

LLPM discovers skills from multiple locations:

| Location | Purpose | Priority |
|----------|---------|----------|
| `~/.llpm/skills/` | User-installed skills | Highest |
| `.skills/` | Project-specific skills | Medium |
| Built-in | Default LLPM skills | Lowest |

Skills with the same name are loaded based on priority (higher priority wins).

## Learn More

See the [Skills Reference](/docs/skills/) for:
- Creating custom skills
- Skill file format
- Best practices

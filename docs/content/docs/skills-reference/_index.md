---
title: Skills Reference
weight: 3
---

LLPM implements the [Agent Skills](https://agentskills.io/home) standard for reusable AI instruction sets. This means skills you create for LLPM can be used with other compatible systems like Claude Code.

LLPM includes **19 core skills** organized into 6 categories:

| Category | Skills | Purpose |
|----------|--------|---------|
| [Planning](planning-skills) | 5 | Project planning, requirements, timelines |
| [Visualization](visualization-skills) | 3 | Architecture diagrams, dependency maps |
| [Communication](communication-skills) | 2 | Stakeholder updates, meeting agendas |
| [Documentation](documentation-skills) | 3 | Markdown formatting, user stories, FAQs |
| [Analysis](analysis-skills) | 3 | Risk detection, triage, gap analysis |
| [Research](research-skills) | 3 | Web research, summaries, note synthesis |

## How Skills Work

1. **Discovery**: LLPM scans skill directories for `SKILL.md` files
2. **Loading**: Skills are parsed and registered in the system
3. **Activation**: Enabled skills are injected into the AI's system prompt
4. **Execution**: The AI follows skill instructions when relevant

## Managing Skills

Use the `/skills` command to manage skills:

```bash
# List all discovered skills
/skills list

# Preview a skill without enabling
/skills test <skill-name>

# Enable a skill for the current session
/skills enable <skill-name>

# Disable a skill
/skills disable <skill-name>

# Rescan directories for new/modified skills
/skills reload

# Reinstall skills from the repository
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

- [Creating Skills](creating-skills) - How to create custom skills
- [Planning Skills](planning-skills) - Project planning and decomposition
- [Visualization Skills](visualization-skills) - Diagrams and visual representations
- [Communication Skills](communication-skills) - Stakeholder updates and meetings
- [Documentation Skills](documentation-skills) - Formatting and templates
- [Analysis Skills](analysis-skills) - Risk detection and triage
- [Research Skills](research-skills) - Web research and summarization

## Documentation writer reference

- [Datasource Recording Rules Summary (DEMO-4) - internal reference](https://sandgarden-dev.atlassian.net/wiki/spaces/~71202059337e6ab0e0426dac5b484c6672f753/pages/26935297/A+doc+to+be+read+by+doc)

---
title: Creating Skills
weight: 2
---

Skills are markdown files with YAML frontmatter that provide reusable instructions for the AI. This guide covers how to create custom skills for LLPM.

## Skill Structure

Each skill is a markdown file named `SKILL.md` inside a directory named after the skill:

```
~/.llpm/skills/
  my-skill/
    SKILL.md
```

The `SKILL.md` file has two parts:

1. **YAML Frontmatter** - Metadata about the skill
2. **Markdown Body** - Instructions for the AI

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier for the skill (kebab-case) |
| `description` | Yes | Brief summary of what the skill does |
| `instructions` | No | When to activate this skill (trigger phrases) |
| `tags` | No | Array of tags for categorization and discovery |
| `allowed_tools` | No | Array of AI tools this skill can use |
| `vars` | No | Variables that can be customized per-project |
| `resources` | No | External files or URLs the skill references |

### Example Frontmatter

```yaml
---
name: code-review
description: "Review code changes for quality, security, and best practices"
instructions: "When reviewing PRs, diffs, or code changes"
tags:
  - review
  - code-quality
  - security
allowed_tools:
  - list_github_issues
  - get_github_issue_with_comments
  - add_note
vars:
  severity_threshold: "medium"
  focus_areas: ["security", "performance"]
resources:
  - style-guide.md
  - security-checklist.md
---
```

## Markdown Body

The body contains instructions the AI follows when the skill is active. Structure your instructions clearly:

```markdown
# Skill Name

Brief description of what this skill does.

## When to Use

List the triggers or situations when this skill should activate:
- "Review this PR"
- "Check this code for issues"
- When analyzing code changes

## Available Tools

| Tool | Purpose |
|------|---------|
| `tool_name` | What it does |

## Workflow

Step-by-step instructions for the AI:

### Step 1: Gather Context
...

### Step 2: Analyze
...

### Step 3: Report
...

## Output Format

[Template or example of expected output]

## Best Practices

- Guideline 1
- Guideline 2
```

## Skill Locations

LLPM discovers skills from three locations (in priority order):

| Location | Purpose | Example |
|----------|---------|---------|
| `~/.llpm/skills/` | User-installed skills shared across projects | Global utilities |
| `.skills/` | Project-specific skills | Project conventions |
| Built-in | Default LLPM skills | Core functionality |

When skills have the same name, higher-priority locations win.

## Complete Example

Here is a complete skill for generating release notes:

```markdown
---
name: release-notes
description: "Generate release notes from merged PRs and closed issues"
instructions: "When preparing a release, generating changelog, or summarizing changes"
tags:
  - release
  - changelog
  - documentation
allowed_tools:
  - list_github_issues
  - search_github_issues
  - add_note
---

# Release Notes Skill

Generate release notes by analyzing merged PRs and closed issues since the last release.

## When to Use

Activate when:
- Preparing a new release
- Generating changelog entries
- Summarizing changes between versions

## Available Tools

| Tool | Purpose |
|------|---------|
| `list_github_issues` | Get closed issues |
| `search_github_issues` | Find PRs by label |
| `add_note` | Save release notes |

## Workflow

### Step 1: Identify Scope

Ask the user:
- What is the new version number?
- Since which tag/release should we include changes?

### Step 2: Gather Changes

Search for:
- Merged PRs since last release
- Closed issues with `changelog` label
- Breaking changes labeled `breaking`

### Step 3: Categorize

Group changes into:
- **Features** - New functionality
- **Fixes** - Bug fixes
- **Breaking** - Breaking changes
- **Docs** - Documentation updates
- **Other** - Maintenance, dependencies

### Step 4: Generate Notes

## Output Format

```markdown
# Release [version] - [date]

## Features
- [Feature description] (#PR)

## Fixes
- [Fix description] (#PR)

## Breaking Changes
- [Change description] - Migration: [steps]

## Documentation
- [Doc update] (#PR)
```

## Best Practices

- Lead with breaking changes so users see them first
- Include PR/issue numbers for traceability
- Write user-focused descriptions, not commit messages
- Add migration steps for breaking changes
```

## Best Practices

### Clear Triggers

Be explicit about when the skill should activate:

```markdown
## When to Use

Activate when:
- User says "generate release notes"
- User asks "what changed since [version]"
- Preparing for a release
```

### Focused Scope

Keep skills focused on one task. Instead of one large "project management" skill, create separate skills for:
- Issue triage
- Sprint planning
- Stakeholder updates
- Risk detection

### Practical Examples

Include example inputs and outputs so the AI understands the expected format:

```markdown
## Example

**User**: "Generate release notes for v2.0"

**Output**:
# Release 2.0.0 - 2025-01-15

## Features
- Added dark mode support (#142)
- New export to PDF feature (#156)
...
```

### Tool Documentation

If the skill uses tools, document what each tool does and when to use it:

```markdown
## Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list_github_issues` | Get issues | Finding closed issues for changelog |
| `add_note` | Save content | Storing generated release notes |
```

## Testing Skills

Before deploying a skill, test it:

```bash
# Preview skill content
/skills test my-skill

# Enable and try it
/skills enable my-skill

# Ask the AI to use it
"Use the my-skill skill to..."
```

Verify:
- The skill activates on expected triggers
- The AI follows the workflow correctly
- Output matches the expected format
- Tools are used appropriately

## Sharing Skills

Skills can be shared by:
1. Copying the skill directory to another user's `~/.llpm/skills/`
2. Adding to a project's `.skills/` directory for team sharing
3. Publishing to a skills repository

Because LLPM uses the [Agent Skills](https://agentskills.io/home) standard, skills are compatible with other systems that support this format.

---
title: Project Management
weight: 1
---

LLPM helps you manage multiple projects with AI-powered assistance.

## Adding Projects

### Using Slash Commands

```bash
/project add "My Project" "owner/repo" "/path/to/project" "Project description"
```

Parameters:
- **Name**: Display name for your project
- **GitHub Repository**: Format `owner/repo`
- **Local Path**: Absolute path to project directory
- **Description**: Brief project description

### Using Natural Language

You can also add projects conversationally:

```
Add a project called "My API" linked to github.com/myorg/my-api at ~/projects/my-api
```

The AI will understand your intent and create the project.

## Listing Projects

View all configured projects:

```bash
/project list
```

This displays:
- Project ID
- Name
- GitHub repository
- Local path
- Description
- Active status

## Switching Projects

Change the active project context:

```bash
/project switch <project-id>
```

The active project affects:
- Which repository AI tools interact with
- Default context for GitHub operations
- Project-specific skill loading

## Removing Projects

Remove a project from LLPM (does not delete files):

```bash
/project remove <project-id>
```

## Current Project

View details of the active project:

```bash
/project
```

This shows:
- Project name and description
- Linked GitHub repository
- Local directory path
- Project-specific settings

## Documentation reference

- [A doc to be read by doc](https://sandgarden-dev.atlassian.net/wiki/spaces/~71202059337e6ab0e0426dac5b484c6672f753/pages/26935297/A+doc+to+be+read+by+doc)

---
title: Project Management
weight: 1
---

LLPM helps manage multiple projects with AI-powered assistance.

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

Projects can also be added conversationally:

```
Add a project called "My API" linked to github.com/myorg/my-api at ~/projects/my-api
```

The AI interprets the request and creates the project.

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

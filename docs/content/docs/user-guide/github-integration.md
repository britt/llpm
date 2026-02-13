---
title: GitHub Integration
weight: 2
---

LLPM integrates deeply with GitHub for repository management, issues, and pull requests.

## Prerequisites

Set up GitHub authentication using one of the following options.

### Option 1: Environment variable

Add a token to `.env`:

```bash
GITHUB_TOKEN=your-github-token
```

`GH_TOKEN` is also supported:

```bash
GH_TOKEN=your-github-token
```

### Option 2: GitHub CLI authentication

Authenticate with GitHub CLI:

```bash
gh auth login
```

Generate a token at [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) with these scopes:
- `repo` - Full repository access
- `read:org` - Read organization membership (optional)

## Slash Commands

### List Repositories

View your GitHub repositories:

```bash
/github list
```

### Search Repositories

Search across GitHub:

```bash
/github search "language:typescript stars:>100"
```

Supports GitHub's [search syntax](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories).

## AI Tools

The AI can use these GitHub tools when you ask naturally:

| Tool | Description |
|------|-------------|
| `list_github_repos` | List your repositories |
| `search_github_repos` | Search GitHub repositories |
| `get_github_repo` | Get repository details |
| `create_github_issue` | Create an issue with optional file attachments |
| `comment_on_github_issue` | Add comments to issues with optional attachments |

## Examples

### Creating Issues

Ask the AI to create issues naturally:

```
Create an issue in myorg/myrepo titled "Add dark mode" describing the need for theme switching
```

With file attachments:

```
Create a bug report in myorg/myrepo with the screenshot at ~/Desktop/error.png
```

### Searching Repositories

Find repositories with natural language:

```
Find TypeScript repositories with more than 1000 stars related to CLI tools
```

### Getting Repository Information

```
What's the latest activity on facebook/react?
```

The AI will fetch repository details including recent commits, issues, and pull requests.

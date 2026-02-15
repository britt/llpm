---
title: LLPM
type: docs
---

LLPM is a terminal-native, AI-powered product management workspace for software teams, designed to keep planning, tracking, and communication close to the code in your Git repositories so product decisions stay attached to the repositories that implement them.

LLPM connects your Git repositories, GitHub issues and pull requests, Markdown notes, and reusable AI workflows ("skills") into a single, searchable workspace so product discussions and decisions stay tied to the codebase instead of getting lost across tools.

## What you can do with LLPM

LLPM helps product managers, tech leads, and engineers manage product work around codebases by enabling them to:

- Track multiple Git-based projects from a single terminal workspace.
- Bring issue discussions, planning notes, and code history into one shared, project-scoped place.
- Run structured AI "skills" for planning, requirements, research, stakeholder communication, and other product workflows using the context from the active project.
- Experiment with and switch between multiple LLM providers and models without changing existing Git workflows.
- Capture and revisit the context behind decisions—notes, timelines, and commands—as each project evolves.

## Core concepts in LLPM

The LLPM workspace is organized around a few core concepts:

- **Projects** – A project in LLPM is a Git repository on disk (optionally connected to GitHub). LLPM can scan directories you choose for repositories and lets you switch between projects quickly from the terminal.
- **Notes** – Lightweight Markdown notes stored per project so design ideas, meeting notes, and decisions stay tied to the codebase they affect.
- **Skills** – Reusable, guided workflows that combine your project context with LLMs for specific product tasks (for example, writing user stories, triaging issues, or preparing stakeholder updates).
- **Models & providers** – LLPM supports multiple LLM providers (OpenAI, Anthropic, Groq, Cerebras, and Google Vertex AI). You can list available models and switch between them at runtime without restarting LLPM.
- **Integrations** – Optional integrations for GitHub (via `GITHUB_TOKEN`) and web search (via `ARCADE_API_KEY`) extend what the assistant can see and do from the terminal.
- **History & context** – LLPM keeps the conversation and command history for each project so the assistant can build on prior work instead of starting from scratch.

## How LLPM fits with your existing tools

LLPM is **not** a replacement for Git, GitHub, or your issue tracker. It sits on top of them and focuses on product work around code: planning, coordination, and communication anchored to real repositories.

- Compared to traditional Git CLIs, LLPM is organized around product workflows (planning, prioritization, requirements, communication) instead of only version-control commands.
- Compared to issue trackers (such as GitHub- or board-based tools), LLPM lives in the terminal next to the repository, giving the assistant direct access to the code, notes, and Git history for richer context.
- Compared to generic AI chat tools, LLPM keeps a long-lived, project-scoped workspace that remembers repositories, notes, and prior commands, and offers repeatable "skills" instead of one-off prompts.
- Compared to standalone note-taking tools, LLPM stores notes by project and ties them directly to the code and workflows they support.

---

## Installation

LLPM is distributed as a Node.js application. You can install it globally via npm or Bun, or run it from source.

### Global install (recommended)

From npm:

```bash
npm install -g @britt/llpm
```

With Bun:

1. Add `@britt/llpm` to `trustedDependencies` in `~/.bunfig.toml`:

   ```toml
   [install]
   trustedDependencies = ["@britt/llpm"]
   ```

2. Install:

   ```bash
   bun install -g @britt/llpm
   ```

After installation, start LLPM from any directory:

```bash
llpm
```

---

## Examples: Using LLPM from the terminal
This section shows short, concrete examples of how to use LLPM interactively from the terminal.

The examples below assume:

- LLPM is installed (globally or from source).
- At least one Git repository exists on your machine.
- At least one LLM provider is configured in `.env`.

When LLPM starts, you see a prompt like:

```text
>
```

The `>` prompt is where LLPM commands and skills are entered. Commands start with `/`.

### Example 1: Scan for and switch between Git projects

Scan for Git repositories and switch to one of them:

```text
> /project scan
> /project list
> /project switch my-product
```

- `/project scan` searches the directories you have configured for Git repositories.
- `/project list` shows the projects LLPM knows about.
- `/project switch my-product` makes `my-product` the active project for subsequent commands and skills.

### Example 2: Capture and review project notes

With a project selected, capture notes that stay attached to that repository:

```text
> /notes add
```

LLPM opens an editor flow for adding a note scoped to the active project.

Later, list notes for that project:

```text
> /notes list
```

This keeps meeting notes, decisions, and design ideas close to the code they affect.

### Example 3: Use a skill for structured product work

Skills are reusable workflows for common product tasks. To explore the user-story template skill:

```text
> /skills list
> /skills show user-story-template
```

LLPM displays details for the `user-story-template` skill and guides the assistant in using it to generate or refine user stories based on the active project’s context.

### Example 4: Inspect and change the active model
LLPM can work with multiple LLM providers and models. From the LLPM prompt:
LLPM can work with multiple model providers and models. From the prompt:

```text
> /model providers
> /model list
> /model switch
```

- `/model providers` shows which LLM providers are available based on configured environment variables.
- `/model list` lists the models LLPM can use.
- `/model switch` changes the active model for subsequent AI-assisted commands and skills.
From here, explore additional useful commands such as:
From here, explore additional commands such as:

```text
> /project list
> /project switch
> /skills reinstall
```

Use these to organize projects, keep skills up to date, and refine how LLPM supports day-to-day product workflows.

<!-- homepage: keep this page pure Markdown (no Hugo shortcodes) -->


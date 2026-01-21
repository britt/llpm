---
title: LLPM Documentation
layout: hextra-home
---

{{< hextra/hero-badge >}}
  <span>AI-Powered CLI</span>
{{< /hextra/hero-badge >}}

<div class="hx-mt-6 hx-mb-6">
{{< hextra/hero-headline >}}
  Large Language Model&nbsp;<br class="sm:hx-block hx-hidden" />Product Manager
{{< /hextra/hero-headline >}}
</div>

<div class="hx-mb-12">
{{< hextra/hero-subtitle >}}
  AI-powered product management CLI for GitHub issues, codebases, stakeholders, and requirements.
{{< /hextra/hero-subtitle >}}

<div class="hx-mt-6">

## Install

LLPM is a Bun-based CLI.

```bash
git clone https://github.com/britt/llpm.git
cd llpm
bun install
cp .env.example .env
bun start
```

Next:

- Configure at least one model provider (environment variables)
- Run `/model providers` to confirm LLPM sees your credentials

For prerequisites, provider setup, and other install options, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

</div>
</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Connect one or more model providers, then switch models per session.

- Check provider configuration with `/model providers`.
- Switch models with `/model switch` (interactive selector).
- List available models with `/model list`.
- Refresh the cached model catalog with `/model update`.

Supported provider IDs: `openai`, `anthropic`, `groq`, `google-vertex`, `cerebras`.

LLPM caches the provider-fetched model catalog in `~/.llpm/models.json` so discovery stays fast and consistent between sessions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects, Scans, and GitHub"
    subtitle="Attach work to the right repository, then run a project scan when you need deeper context.

- Manage projects with `/project` (add, list, switch, remove).
- Analyze a codebase with `/project scan` (active project or current working directory).
- Use `/github` to browse and search repositories, then connect one to a project.

A scan summarizes codebase structure, dependencies, and documentation so follow-on workflows start with concrete inputs."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills and Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- Discover skills with `/skills list`.
- Preview a skill with `/skills test <name>`.
- Reload after edits with `/skills reload`.
- Restore bundled skills with `/skills reinstall`.

The built-in catalog covers stakeholder tracking, requirement elicitation, project planning, risk checks, documentation formatting, note consolidation, FAQ generation, meeting preparation, and research summaries."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Notes, Shell, and Search"
    subtitle="Capture project knowledge in Markdown notes, search it quickly, and run carefully scoped shell commands when needed.

- Notes are stored as Markdown files with YAML frontmatter.
- Search uses ripgrep-based text search for fast local lookup.
- Shell execution is configured in `~/.llpm/config.json`.

LLPM can require confirmation before executing shell commands and keeps an audit trail of executions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

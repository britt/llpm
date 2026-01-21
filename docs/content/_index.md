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
    subtitle="Configure one or more model providers, then switch models per session.

- Use `/model providers` to see which providers are configured.
- Use `/model switch` for an interactive selector (configured providers only).
- Use `/model list` to list available models.
- Use `/model update` to refresh the cached model catalog from provider APIs.

Supported provider IDs: `openai`, `anthropic`, `groq`, `google-vertex`, `cerebras`.

LLPM stores the provider-fetched catalog in `~/.llpm/models.json` so model discovery is fast and consistent between sessions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects, Scans, and GitHub"
    subtitle="Keep work attached to the right repository, then generate a project scan when deeper context is needed.

- Manage projects with `/project` (add, list, switch, remove).
- Run `/project scan` to analyze the active project (or the current working directory).
- Use `/github` to browse and search repositories, then connect one to a project.

A scan summarizes codebase structure, dependencies, and documentation so follow-on workflows (like context-aware questions and at-risk detection) start with concrete inputs."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills and Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- Use `/skills list` to see discovered skills.
- Use `/skills test <name>` to preview a skill.
- Use `/skills reload` after editing or adding skills.
- Use `/skills reinstall` to restore the bundled skill catalog.

Skills cover stakeholder tracking, requirement elicitation, project planning, risk checks, documentation formatting, note consolidation, FAQ generation, meeting preparation, and research summaries."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Notes, Shell, and Search"
    subtitle="Capture project knowledge in markdown notes, search it quickly, and run carefully scoped shell commands when needed.

- Notes are stored as Markdown files with YAML frontmatter.
- Search uses ripgrep-based text search for fast local lookup.
- Shell execution is configured in `~/.llpm/config.json`.

LLPM can require confirmation before executing shell commands and keeps an audit trail of executions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[560px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

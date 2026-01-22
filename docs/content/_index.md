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
- Use `/model switch` to pick a model

For prerequisites, provider setup, and other install options, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

</div>
</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Connect one or more providers, then switch models as your work changes.

- `/model providers` shows which providers are configured.
- `/model switch` picks a model (interactive), or `/model switch <provider>/<model>` switches directly.
- `/model list` shows all available models for configured providers.
- `/model update` refreshes the cached catalog from provider APIs.

Supported provider IDs:

- `openai`
- `anthropic`
- `groq`
- `google-vertex`
- `cerebras`

Example model IDs (from the built-in defaults):

- OpenAI: `gpt-5.2`, `gpt-5.2-mini`, `gpt-5.2-turbo`, `gpt-4o`, `gpt-4o-mini`, `o4-mini`
- Anthropic: `claude-sonnet-4-5`, `claude-opus-4-1`
- Google Vertex: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-ultra`
- Groq: `llama-3.3-70b-versatile`, `meta-llama/llama-4-maverick-17b-128e-instruct`, `deepseek-r1-distill-llama-70b`
- Cerebras: `qwen-3-235b-a22b-instruct-2507`, `llama-3.3-70b`, `llama3.1-8b`, `llama3.1-70b`

LLPM caches the provider-fetched catalog in `~/.llpm/models.json` so model discovery stays fast and consistent between sessions.

If a provider is not configured, its models stay hidden from the selector, and the footer only shows models from configured providers."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[800px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects, Scans, and GitHub"
    subtitle="Tie work to the right repo, then generate project context on demand.

- Use `/project` to add, list, switch, and remove projects.
- Run `/project scan` to analyze a codebase (active project or current working directory).
- Use `/github` to browse/search repositories, then connect one to a project.

A scan summarizes structure, dependencies, and documentation. LLPM persists scan results so repeat scans stay fast.

If LLPM starts inside a repo, it can auto-detect the matching project from your current working directory."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[720px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills and Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation.

- Find skills with `/skills list`.
- Preview a skill with `/skills test <name>`.
- Reload after edits with `/skills reload`.
- Restore bundled skills with `/skills reinstall`.

Use skills to drive repeatable workflows like requirement elicitation, stakeholder tracking, project planning, risk checks, and context-aware question generation."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[660px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Notes, Search, and Shell"
    subtitle="Capture project knowledge in Markdown notes, search it locally, and run carefully scoped shell commands when needed.

- Notes are stored as Markdown files with YAML frontmatter under `~/.llpm/projects/{projectId}/notes/`.
- Search uses ripgrep-based text search for fast local lookup.
- Shell execution is configured in `~/.llpm/config.json`.

Use shell execution for short, auditable commands. Keep longer workflows in normal terminal sessions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[680px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

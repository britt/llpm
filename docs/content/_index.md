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

**Install from source (Bun):**

```bash
git clone https://github.com/britt/llpm.git
cd llpm
bun install
cp .env.example .env
bun start
```

For prerequisites, provider setup, and other install options, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

</div>

{{< hextra/hero-button text="User Guide" link="docs/user-guide/" type="secondary" >}}
{{< /hextra/hero-button >}}
</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Configure one or more AI providers, then pick a model per session.

- Check provider setup and the current model with `/model`.
- See which providers are configured with `/model providers`.
- Choose a recommended model with `/model switch`.
- List models with `/model list`.
- Refresh the cached model catalog from provider APIs with `/model update`.

Provider IDs: `openai`, `anthropic`, `groq`, `google-vertex`, `cerebras`.

LLPM caches provider-fetched models in `~/.llpm/models.json` and hides unconfigured providers in the interactive selector so the list matches what can run in the current environment."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[520px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects, Scans, and GitHub"
    subtitle="Keep work attached to the right repository, then generate a project scan when deeper context is needed.

- Add, list, and switch projects with `/project`.
- Scan the active project (or the current working directory) with `/project scan`.
- Browse and connect GitHub repos with `/github`.

A scan summarizes codebase structure, dependencies, and documentation so follow-on workflows (like context-aware questions, requirement elicitation, and at-risk detection) start with concrete inputs."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[520px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills and Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- List discovered skills with `/skills list`.
- Preview a skill with `/skills test <name>`.
- Rescan after edits with `/skills reload`.
- Restore the bundled skill catalog with `/skills reinstall`.

Skills cover stakeholder tracking, requirement elicitation, project planning, risk checks, documentation formatting, note consolidation, FAQ generation, meeting preparation, and research summaries."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[520px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Notes, Shell, and Search"
    subtitle="Capture project knowledge in markdown notes, search it quickly, and run carefully scoped shell commands when needed.

- Create, update, and search markdown notes with YAML frontmatter.
- Use ripgrep-based text search for fast local lookup.
- Configure shell execution and permissions in `~/.llpm/config.json`.

LLPM can require confirmation before executing shell commands and keeps an audit trail of executions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[520px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}


3. **(Optional) Add the binary to your PATH**

   ```bash
   # Example: add llpm to ~/.local/bin
   mkdir -p ~/.local/bin
   ln -sf "$(pwd)/bin/llpm" ~/.local/bin/llpm
   llpm
   ```

**Supported model providers:** OpenAI (`openai`), Anthropic (`anthropic`), Groq (`groq`), Google Vertex AI (`google-vertex`), and Cerebras (`cerebras`).

Or jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Connect one or more providers and switch models without leaving the terminal.

- Check provider setup and current model with `/model`.
- See which providers are configured with `/model providers`.
- Choose a recommended model with `/model switch`.
- List models with `/model list` (use `--all` to include unconfigured providers).
- Refresh the cached model catalog from provider APIs with `/model update`.

Provider IDs: `openai`, `anthropic`, `groq`, `google-vertex`, `cerebras`.

LLPM stores the provider-fetched model list in `~/.llpm/models.json`. Unconfigured providers are hidden from the interactive selector so the list reflects models that can run in the current environment."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects, Scans, and GitHub"
    subtitle="Keep work attached to the right repository, then generate a snapshot when deeper context is needed.

- Add, list, and switch projects with `/project`.
- Scan the active project or the current working directory with `/project scan`.
- Connect a GitHub repo to a project using `/github`.

A project scan analyzes the codebase, dependencies, documentation, and file structure. Use the results as input for workflows like context-aware questions, requirement elicitation, stakeholder updates, and at-risk detection."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills and Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- List installed skills with `/skills list`.
- Preview a skill with `/skills test <name>`.
- Rescan after edits with `/skills reload`.
- Reinstall the bundled skill catalog with `/skills reinstall`.

Skills cover planning and orchestration, stakeholder tracking, risk checks, requirement elicitation, documentation formatting, note consolidation, FAQ generation, meeting preparation, and research summaries."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Notes, Shell, and Search"
    subtitle="Capture project knowledge in markdown notes, search it quickly, and run carefully scoped shell commands when needed.

- Use notes commands to create, browse, and update markdown notes with YAML frontmatter.
- Search notes and project files with ripgrep-based search.
- Configure shell execution and permissions in `~/.llpm/config.json`.

LLPM can require confirmation before executing shell commands and keeps an audit trail of executions."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

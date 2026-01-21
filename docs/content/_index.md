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
  AI-powered project management CLI that brings intelligent assistance directly to your terminal.
{{< /hextra/hero-subtitle >}}
</div>

<div class="hx-mb-6">

## Install

1. **Clone the repository**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Create your environment file**

   ```bash
   cp .env.example .env
   ```

4. **Start LLPM**

   ```bash
   bun start
   ```

5. **Install globally (optional)**

   ```bash
   bun link
   llpm
   ```

**Supported model providers:** OpenAI, Anthropic, Groq, Google Vertex AI (`google-vertex`), and Cerebras.

Continue with [Installation]({{< relref "docs/getting-started/installation.md" >}}) for more details.

Or jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Configure one or more providers and keep a local, cached list of available models.

- Confirm provider setup with `/model providers`.
- List models with `/model list` (use `--all` to include unconfigured providers).
- Switch models with `/model switch` (interactive or direct).
- Refresh the cached list from provider APIs with `/model update`.

Use this when adding a provider (for example, Cerebras), rotating API keys, or troubleshooting why a model is not available."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[360px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects + Project Scans"
    subtitle="Keep work attached to the right repository, and scan the codebase when you need a structured overview.

- Use `/project` to add a repository as a project and switch context.
- Use `/project scan` to analyze the current project (or your current working directory).
- Use `/github` to browse repositories, issues, and pull requests.

Project scans help LLPM summarize structure, dependencies, documentation coverage, and architecture (with Mermaid diagrams when LLM analysis is enabled)."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[360px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills + Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- Use `/skills list` to see what is installed.
- Use `/skills test <name>` to preview a skill.
- Use `/skills reload` after editing or adding skills.
- Use `/skills reinstall` after upgrading LLPM to refresh the bundled skill catalog.

Skills help keep output consistent for repeatable tasks (for example, requirement elicitation, stakeholder tracking, at-risk detection, and project planning)."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[360px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

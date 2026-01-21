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
    subtitle="Configure one or more model providers and select a model from the providers you have credentials for.

- Check which providers are configured with `/model providers`.
- List available models with `/model list` (use `--all` to include unconfigured providers).
- Switch models with `/model switch` (interactive or direct).
- Refresh the local cached model list from provider APIs with `/model update`.

Use this workflow after adding a new provider (for example, Cerebras), rotating API keys, or troubleshooting why a model is missing."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[360px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects + Project Scans"
    subtitle="Keep work attached to the right repository and generate a structured snapshot of the codebase when you need it.

- Add or switch projects with `/project`.
- Scan the current project (or your current working directory) with `/project scan`.
- Use `/github` to browse repositories, issues, and pull requests.

A project scan captures file structure, detected languages, dependencies, documentation signals, and (optionally) an architecture overview."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[360px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills + Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- See what is installed with `/skills list`.
- Preview a skill with `/skills test <name>`.
- Rescan after changes with `/skills reload`.
- Refresh the bundled skill catalog with `/skills reinstall`.

Skills help keep output consistent for repeatable work like requirement elicitation, stakeholder tracking, at-risk detection, and project planning."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[360px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

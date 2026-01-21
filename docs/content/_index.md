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

### Option 1: Build and run from source

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

### Option 2: Install a global `llpm` command

1. **Build the compiled binary**

   ```bash
   bun run build
   ```

2. **Run the binary**

   ```bash
   ./bin/llpm
   ```

3. **(Optional) Add the binary to your PATH**

   ```bash
   # Example: add llpm to ~/.local/bin
   mkdir -p ~/.local/bin
   ln -sf "$(pwd)/bin/llpm" ~/.local/bin/llpm
   llpm
   ```

**Supported model providers:** OpenAI, Anthropic, Groq, Google Vertex AI (`google-vertex`), and Cerebras.

Continue with [Installation]({{< relref "docs/getting-started/installation.md" >}}) for prerequisites and configuration.

Or jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Connect one or more model providers, then switch between models based on the providers you have configured.

- Validate provider configuration with `/model providers`.
- Choose a model interactively with `/model switch`.
- Review available models with `/model list` (use `--all` to include unconfigured providers).
- Refresh the locally cached model list from provider APIs with `/model update`.

LLPM supports these providers: `openai`, `anthropic`, `groq`, `google-vertex`, and `cerebras`."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[420px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects + Project Scans"
    subtitle="Keep work attached to the right repository, then create a structured snapshot of a codebase when you need shared context.

- Add, list, and switch projects with `/project`.
- Scan the current project (or your current working directory) with `/project scan`.
- Use `/github` to browse repositories and connect a repo to a project.

A project scan is designed for quick orientation: it captures file structure, detected languages, parsed dependencies, documentation signals, and (optionally) an architecture overview. Use scans when starting work on a new repo, writing docs, or reviewing risk in an unfamiliar codebase."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[420px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills + Guided Workflows"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- List installed skills with `/skills list`.
- Preview a skill with `/skills test <name>`.
- Rescan after changes with `/skills reload`.
- Refresh the bundled skill catalog with `/skills reinstall`.

Skills provide structure for repeatable work like requirement elicitation, stakeholder tracking, at-risk detection, project planning, and documentation formatting."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[420px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

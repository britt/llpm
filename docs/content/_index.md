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

1. **Clone and install**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   bun install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

3. **Start LLPM**

   ```bash
   bun start
   ```

4. **Install globally (optional)**

   ```bash
   bun link
   llpm
   ```

**Supported model providers:** OpenAI, Anthropic, Groq, Google Vertex AI (`google-vertex`), and Cerebras.

Continue with [Installation]({{< relref "docs/getting-started/installation.md" >}}) for more details.

You can also jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider AI"
    subtitle="Switch between multiple LLM providers without leaving the terminal. Supported providers are OpenAI, Anthropic, Groq, Google Vertex AI (`google-vertex`), and Cerebras. Use `/model providers` to confirm which providers are configured, `/model list` to view models that are available to you, and `/model switch` to change the active model. If provider APIs are available, use `/model update` to refresh the locally cached model list."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="GitHub Integration"
    subtitle="Connect a GitHub repository to a project and work with issues, pull requests, and repositories from the CLI. Use `/github` to browse or search repositories, then use `/project` to add the repo as a project and switch contexts. Once a repo is connected, keep conversations and actions tied to the right codebase while you plan and track work."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills System"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work. Run `/skills list` to see what is installed, `/skills test <name>` to preview a skill, and `/skills reload` to rescan skill directories after changes. After upgrading LLPM, use `/skills reinstall` to refresh the bundled skill catalog."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

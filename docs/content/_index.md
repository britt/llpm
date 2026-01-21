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

1. **Install dependencies**

   ```bash
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

Continue with [Getting Started]({{< relref "docs/getting-started/installation.md" >}}) for a step-by-step walkthrough.

You can also jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider AI"
    subtitle="Choose from multiple model providers and switch models without leaving the terminal. Supported providers include OpenAI, Anthropic, Groq, Google Vertex AI, and Cerebras. Use /model providers to check which providers are configured, /model list to see available models, /model switch to change the active model, and /model update to refresh the locally cached model list from provider APIs."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="GitHub Integration"
    subtitle="Connect a GitHub repository to a project and work with issues, pull requests, and repositories directly from the CLI. Use /github to browse and search repositories, then use /project to add the repo as a project, switch contexts, and keep work tied to the right codebase."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills System"
    subtitle="Use reusable workflows packaged as Agent Skills (SKILL.md) to guide planning, analysis, and documentation work. Explore and manage skills with /skills list and /skills reload, and refresh the bundled catalog after an upgrade with /skills reinstall."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

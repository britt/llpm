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

3. **Run LLPM**

   ```bash
   bun start
   ```

4. **Install globally (optional)**

   ```bash
   bun link
   llpm
   ```

Then follow the full installation and configuration guide in [Getting Started]({{< relref "docs/getting-started/installation.md" >}}).

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider AI"
    subtitle="Connect to OpenAI, Anthropic, Groq, Google Vertex AI, and Cerebras. Use /model providers to confirm configuration, /model list to see available models, /model switch to change models, and /model update to refresh the locally cached model list from provider APIs."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="GitHub Integration"
    subtitle="Connect a GitHub repository to a project, then work with issues, pull requests, and project boards from the CLI. Use /github to browse and search repositories, and /project to manage your project list and switch contexts."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills System"
    subtitle="Use reusable workflows packaged as Agent Skills (SKILL.md) to guide planning, analysis, stakeholder tracking, and documentation tasks. Use /skills list to discover skills, /skills reload to rescan skill directories, and /skills reinstall to refresh the bundled skill set."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

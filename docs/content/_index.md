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

3. **Configure your API keys**

   Copy the example environment file and add at least one provider key:

   ```bash
   cp .env.example .env
   ```

Then follow the full installation and configuration guide in [Getting Started]({{< relref "docs/getting-started/installation.md" >}}).

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider AI"
    subtitle="Connect to multiple model providers: OpenAI, Anthropic, Groq, Google Vertex AI, and Cerebras. Use /model to list and switch models, and /model update to refresh the locally cached model list from provider APIs."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="GitHub Integration"
    subtitle="Connect a GitHub repository to a project, then work with issues, pull requests, and project boards from the CLI. Keep planning and execution close to the code, with project context available in every session."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills System"
    subtitle="Use reusable workflows packaged as Agent Skills (SKILL.md) to guide planning, analysis, stakeholder tracking, and documentation tasks. Use /skills to list available skills, and /skills reinstall to refresh the bundled skill set."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

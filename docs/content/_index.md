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

2. **Create your environment file**

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

Or jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider AI"
    subtitle="Configure one or more model providers and switch models without leaving the terminal. LLPM supports OpenAI, Anthropic, Groq, Google Vertex AI (`google-vertex`), and Cerebras.

Start by setting at least one provider credential (for example `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`), then use `/model providers` to confirm what is configured. Use `/model list` to see what is available (add `--all` to include unconfigured providers), and `/model switch` to change the active model.

If provider APIs are available, run `/model update` to refresh the local cached model list so the selector stays in sync with upstream providers."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="GitHub Integration"
    subtitle="Work with GitHub repositories, issues, and pull requests from the CLI, while keeping conversations tied to the right project context.

Use `/github` to browse or search repositories, then use `/project` to add a repository as a project and switch contexts. With a connected repo, LLPM can help you review work status, surface missing details, and generate follow-up questions based on issues and project context."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills System"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

Run `/skills list` to see what is installed, `/skills test <name>` to preview a skill, and `/skills reload` to rescan skill directories after changes. After upgrading LLPM, use `/skills reinstall` to refresh the bundled skill catalog."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

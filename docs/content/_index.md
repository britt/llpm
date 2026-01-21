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
    title="Multi-Provider AI"
    subtitle="Configure one or more model providers and switch models without leaving the terminal.

- Confirm provider setup with `/model providers`.
- List available models with `/model list` (use `--all` to include unconfigured providers).
- Switch models with `/model switch`.
- Refresh the local cached model list from provider APIs with `/model update`."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Project Context + GitHub"
    subtitle="Work with GitHub repositories, issues, and pull requests from the CLI, while keeping conversations tied to the right project.

- Use `/github` to browse or search repositories.
- Use `/project` to add a repository as a project and switch context.

With a connected repo, LLPM can help review work status and generate follow-up questions based on issues and project context."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills (Agent Skills spec)"
    subtitle="Use reusable workflows packaged as Agent Skills (`SKILL.md`) to guide planning, analysis, and documentation work.

- Run `/skills list` to see what is installed.
- Run `/skills test <name>` to preview a skill.
- Run `/skills reload` after editing or adding skills.
- Run `/skills reinstall` after upgrading LLPM to refresh the bundled skill catalog."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

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
</div>

<div class="hx-mb-6">

## Install

 For runtime requirements (Bun, Node.js, Git) and configuration, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

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

1. **Link the package**

   ```bash
   bun link
   ```

2. **Run LLPM**

   ```bash
   llpm
   ```

### Option 3: Install a compiled `llpm` binary

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

**Supported model providers:** OpenAI (`openai`), Anthropic (`anthropic`), Groq (`groq`), Google Vertex AI (`google-vertex`), and Cerebras (`cerebras`).

Or jump to the [User Guide]({{< relref "docs/user-guide/" >}}) for commands, projects, skills, and GitHub integration.

</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider Models"
    subtitle="Connect one or more providers and switch models without leaving the terminal.

- Configure providers and see which are ready with `/model providers`.
- Pick a recommended model interactively with `/model switch`.
- Review available models per provider with `/model list` (use `--all` to include unconfigured providers).
- Refresh the cached model catalog from provider APIs with `/model update`.

Providers are identified by these IDs: `openai`, `anthropic`, `groq`, `google-vertex`, and `cerebras`.

LLPM keeps the provider-fetched model list in `~/.llpm/models.json` and hides unconfigured providers from the interactive selector so the list reflects models that can run in the current environment."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Projects, Scans, and GitHub"
    subtitle="Keep work attached to the right repository, then create a repeatable snapshot when deeper context is needed.

- Add, list, and switch projects with `/project`.
- Scan the active project or current working directory with `/project scan`.
- Connect a GitHub repo to a project using `/github`.
- Let LLPM auto-detect a project for the current directory when possible.

A project scan parses the codebase, dependencies, documentation, and file structure. When LLM analysis is enabled, it can surface architecture overviews, gaps, risks, and context for downstream skills such as context-aware questions, requirement elicitation, stakeholder updates, and at-risk detection."
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

Core skills help with requirement elicitation, context-aware question generation, project planning and orchestration (issue decomposition, architecture diagramming, dependency mapping, timeline planning), stakeholder tracking and updates, risk and at-risk detection, documentation and markdown formatting, note consolidation, FAQ generation, meeting preparation, and research summaries."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Notes, Shell, and Search"
    subtitle="Capture project knowledge in markdown notes, search across it quickly, and run carefully audited shell commands when needed.

- Use notes commands to create, browse, and update markdown notes with YAML frontmatter.
- Search notes and project files with ripgrep-based search, with a helpful warning if `rg` is not installed.
- Configure the `run_shell_command` tool globally in `~/.llpm/shell.json` with explicit permissions and timeouts.
- Require confirmation for each command or enable `skipConfirmation` for trusted setups, with every execution written to a JSONL audit log.

These capabilities make LLPM a central cockpit for product work that touches code, GitHub, documentation, and local tooling."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[500px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}

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

  Install with Bun and configure a provider API key, then start LLPM and begin working with slash commands.
{{< /hextra/hero-subtitle >}}

<div class="hx-mt-6">

## Install

LLPM is a Bun-based CLI.

1. Clone the repository.
2. Install dependencies.
3. Create a `.env` with at least one provider API key.
4. Start LLPM.

```bash
git clone https://github.com/britt/llpm.git
cd llpm
bun install
# Create .env with at least one provider key
bun start
```

Next:

- Run `/model providers` to confirm LLPM sees your credentials.
- Use `/model switch` to pick a model.

For prerequisites, optional global install, and provider setup, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

</div>
</div>

<!--
Homepage feature boxes

Use plain HTML instead of shortcode-based feature cards to avoid
shortcode parameter quoting issues during Hugo builds.
-->

<div class="hx-mt-10 hx-grid hx-grid-cols-1 md:hx-grid-cols-2 hx-gap-6">
  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Multi-provider models</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Configure one or more providers, then switch models when the task changes. LLPM can refresh the model catalog from provider APIs and stores the result on disk for fast startup.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Run <code>/model providers</code> to see which providers are configured and which credentials are missing.</li>
      <li>Use <code>/model switch &lt;provider&gt;/&lt;model&gt;</code> to switch directly, or run <code>/model switch</code> for the interactive picker.</li>
      <li>Run <code>/model list</code> to inspect models per provider.</li>
      <li>Use <code>/model update</code> to refresh the cached catalog from provider APIs.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      <strong>Supported provider IDs:</strong> <code>openai</code>, <code>anthropic</code>, <code>groq</code>, <code>google-vertex</code>, <code>cerebras</code>.
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Example model IDs:
      <br>
      OpenAI: <code>gpt-5.2</code>, <code>gpt-4o</code>, <code>o4-mini</code>
      <br>
      Anthropic: <code>claude-sonnet-4-5</code>, <code>claude-opus-4-1</code>
      <br>
      Groq: <code>meta-llama/llama-4-maverick-17b-128e-instruct</code>, <code>llama-3.3-70b-versatile</code>, <code>deepseek-r1-distill-llama-70b</code>
      <br>
      Google Vertex AI: <code>gemini-2.5-pro</code>, <code>gemini-2.5-flash</code>, <code>gemini-2.5-ultra</code>
      <br>
      Cerebras: <code>qwen-3-235b-a22b-instruct-2507</code>, <code>llama-3.3-70b</code>, <code>llama3.1-70b</code>
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code>. If live discovery fails, LLPM falls back to curated defaults.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(59,130,246,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Project context + scans</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Scan a repo to capture languages, frameworks, dependencies, documentation coverage, and (optionally) an LLM-generated architecture summary. LLPM saves scan results to your local LLPM project directory.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Run <code>/project scan</code> to analyze the current project (or your current working directory if no project is set).</li>
      <li>Use <code>--no-llm</code> for faster scans without architecture analysis.</li>
      <li>Use <code>--force</code> to rescan even when cached results exist.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      LLPM persists scan results in <code>~/.llpm/projects/{projectId}/project.json</code>.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(16,185,129,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">GitHub workflows</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Work with issues, pull requests, and planning workflows from the CLI. Combine GitHub tools with skills like issue decomposition, risk detection, and context-aware questions.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/github</code> to browse and connect repositories.</li>
      <li>Use <code>/issue</code> and <code>/project</code> commands to inspect and manage work.</li>
    </ul>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(245,158,11,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Notes, requirements, stakeholders</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Keep lightweight project knowledge in notes, run a requirement-elicitation flow to produce a markdown requirements document, and track stakeholders + goals.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/notes</code> to add, list, and search notes (search uses ripgrep).</li>
      <li>Use <code>/stakeholder</code> to manage stakeholders and goals.</li>
    </ul>
  </div>
</div>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Connect work to the right repo, then generate project context on demand.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/project</code> to add, list, switch, and remove projects.</li>
      <li>Run <code>/project scan</code> to analyze a codebase (active project or current working directory).</li>
      <li>Use <code>/github</code> to browse/search repositories, then connect one to a project so issues, pull requests, and notes share the same context.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      A scan summarizes project files (gitignore-aware), languages/frameworks, dependencies, documentation, and high-level architecture descriptions.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM persists scan results in <code>~/.llpm/projects/{projectId}/project.json</code>.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Use flags like <code>--force</code> to refresh cached scans or <code>--no-llm</code> for a fast static pass without calling model APIs.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Skills and guided workflows</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Use reusable workflows packaged as Agent Skills (<code>SKILL.md</code>) to guide planning, analysis, and documentation.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Find skills with <code>/skills list</code> to see bundled and user-defined workflows.</li>
      <li>Preview a skill with <code>/skills test &lt;name&gt;</code> before using it.</li>
      <li>Reload after edits with <code>/skills reload</code> so changes to skill files are picked up immediately.</li>
      <li>Restore bundled skills with <code>/skills reinstall</code> if local experiments break the core collection.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Skills follow the Agent Skills specification and are discovered from <code>~/.llpm/skills/</code> and project-specific skill folders.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Notes, search, and shell</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Capture project knowledge in Markdown notes, search it locally, and run carefully scoped shell commands when needed.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Capture and browse notes with <code>/notes</code>, backed by Markdown files under <code>~/.llpm/projects/{projectId}/notes/</code>.</li>
      <li>Search notes with <code>/notes search</code> (full-text via <code>rg</code>).</li>
      <li>Configure shell execution (allow/deny lists, timeouts, audit logging) in <code>~/.llpm/config.json</code> under the <code>shell</code> section.</li>
      <li>Run shell commands through the AI tool <code>run_shell_command</code> (explicit confirmation by default).</li>
    </ul>
  </div>
</div>
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code>. If live discovery fails, LLPM falls back to curated defaults.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Projects, scans, and GitHub</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Connect work to the right repo, then generate project context on demand.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/project</code> to add, list, switch, and remove projects.</li>
      <li>Run <code>/project scan</code> to analyze a codebase (active project or current working directory).</li>
      <li>Use <code>/github</code> to browse/search repositories, then connect one to a project so issues, pull requests, and notes share the same context.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      A scan summarizes project files (gitignore-aware), languages/frameworks, dependencies, documentation, and high-level architecture descriptions.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM persists scan results in <code>~/.llpm/projects/{projectId}/project.json</code>.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Use flags like <code>--force</code> to refresh cached scans or <code>--no-llm</code> for a fast static pass without calling model APIs.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Skills and guided workflows</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Use reusable workflows packaged as Agent Skills (<code>SKILL.md</code>) to guide planning, analysis, and documentation.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Find skills with <code>/skills list</code> to see bundled and user-defined workflows.</li>
      <li>Preview a skill with <code>/skills test &lt;name&gt;</code> before using it.</li>
      <li>Reload after edits with <code>/skills reload</code> so changes to skill files are picked up immediately.</li>
      <li>Restore bundled skills with <code>/skills reinstall</code> if local experiments break the core collection.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Skills follow the Agent Skills specification and are discovered from <code>~/.llpm/skills/</code> and project-specific skill folders.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Notes, search, and shell</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Capture project knowledge in Markdown notes, search it locally, and run carefully scoped shell commands when needed.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Capture and browse notes with <code>/notes</code>, backed by Markdown files under <code>~/.llpm/projects/{projectId}/notes/</code>.</li>
      <li>Search notes with <code>/notes search</code> (full-text via <code>rg</code>).</li>
      <li>Configure shell execution (allow/deny lists, timeouts, audit logging) in <code>~/.llpm/config.json</code> under the <code>shell</code> section.</li>
      <li>Run shell commands through the AI tool <code>run_shell_command</code> (explicit confirmation by default).</li>
    </ul>
  </div>
</div>

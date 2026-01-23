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

  Install with Bun, configure a provider, then start LLPM and work with slash commands.
{{< /hextra/hero-subtitle >}}

<div class="hx-mt-6 hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6">

```bash
bun install llpm
llpm
```

</div>
</div>

<!--
Homepage note

Avoid shortcode-based feature cards here.
A previous version used a shortcode with quoted parameters and failed Hugo builds with:
"unterminated quoted string in shortcode parameter-argument".

This page uses plain HTML divs to create highlighted sections.
-->

<div class="hx-mt-8 hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6">

## Install

LLPM is a Bun-based CLI.

1. Clone the repository.
2. Install dependencies.
3. Create a `.env` file.
4. Configure at least one provider.
5. Start LLPM.

```bash
git clone https://github.com/britt/llpm.git
cd llpm
bun install
cp .env.example .env
# Edit .env and set at least one provider key
bun start
```

Next:

- Run `/model providers` to confirm LLPM sees your credentials.
- Use `/model switch` to pick a model.

Optional: install globally from the repo root.

```bash
bun link
llpm
```

For prerequisites and provider setup, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

</div>

<div class="hx-mt-10 hx-grid hx-grid-cols-1 md:hx-grid-cols-2 hx-gap-6">
  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%, rgba(194,97,254,0.15), hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Multi-provider models</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Configure one or more providers, then switch models when the task changes. Use live model discovery to fetch each providers current catalog, then rely on the local cache for fast switching.
      This makes it practical to keep multiple provider keys configured and choose the right model per task without leaving the CLI.
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
      Example model IDs:<br>
      OpenAI: <code>gpt-5.2</code>, <code>gpt-4o</code>, <code>o4-mini</code><br>
      Anthropic: <code>claude-sonnet-4-5</code>, <code>claude-opus-4-1</code><br>
      Groq: <code>meta-llama/llama-4-maverick-17b-128e-instruct</code>, <code>llama-3.3-70b-versatile</code>, <code>deepseek-r1-distill-llama-70b</code><br>
      Google Vertex: <code>gemini-2.5-pro</code>, <code>gemini-2.5-flash</code>, <code>gemini-2.5-ultra</code><br>
      Cerebras: <code>qwen-3-235b-a22b-instruct-2507</code>, <code>llama-3.3-70b</code>
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code>. If live discovery fails, LLPM falls back to curated defaults.
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      For environment variables and provider setup steps, see the <a href="{{< relref "docs/getting-started/configuration.md" >}}">Configuration</a> guide.
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.15), hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Project context + scans</h3>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Scan a repo to summarize languages, frameworks, dependencies, and documentation coverage. Optionally include an LLM-generated architecture summary.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Run <code>/project</code> to view the current project.</li>
      <li>Run <code>/project scan</code> to generate a scan (use <code>--force</code> to rescan, or <code>--no-llm</code> to skip LLM architecture analysis).</li>
      <li>Use <code>/github</code> to connect issues and pull requests to project work.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Scan results are saved under <code>~/.llpm/projects/{projectId}/project.json</code>.
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM also auto-detects the current project from your working directory when possible, so you can run commands in a repo without manually switching projects first.
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      For details, see [Projects]({{< relref "docs/user-guide/projects.md" >}}).
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%, rgba(16,185,129,0.15), hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Skills + workflows</h3>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      LLPM skills follow the Agent Skills <code>SKILL.md</code> format. Skills describe repeatable workflows (planning, analysis, documentation, research) that guide the assistants behavior.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Run <code>/skills list</code> to see available skills.</li>
      <li>Use <code>/skills show &lt;skill-name&gt;</code> to inspect a skill definition.</li>
      <li>Use <code>/skills reinstall</code> to refresh the bundled core skills.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Core skills include requirement elicitation, stakeholder tracking, project planning, architecture diagrams, dependency mapping, risk detection, and more.
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      For details, see [Skills]({{< relref "docs/user-guide/skills.md" >}}) and the [Skills Reference]({{< relref "docs/skills-reference/_index.md" >}}).
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%, rgba(249,115,22,0.15), hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Notes + requirements</h3>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Keep lightweight notes per project, then generate requirements docs when you need a structured handoff.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/notes</code> to add, update, list, and search notes.</li>
      <li>Use requirement elicitation tools to guide a structured requirements conversation and generate a markdown document.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Notes are stored as markdown files under <code>~/.llpm/projects/{projectId}/notes/</code> and searched via <code>rg</code> (ripgrep).
    </p>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      For details, see [Commands]({{< relref "docs/user-guide/commands.md" >}}).
    </p>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%, rgba(16,185,129,0.15), hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">GitHub workflows</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Work with issues and pull requests from the CLI. Combine GitHub tools with skills like issue decomposition, risk detection, and context-aware questions.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/github</code> to browse and connect repositories.</li>
      <li>Use <code>/issue</code> and <code>/project</code> commands to inspect and manage work.</li>
    </ul>
  </div>

  <div class="hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6" style="background: radial-gradient(ellipse at 50% 80%, rgba(245,158,11,0.15), hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Stakeholders + goals</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Track stakeholders and goals in a markdown-backed store so project context stays close to your work.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/stakeholder</code> to list and manage stakeholders.</li>
      <li>Use <code>/stakeholder goal</code> to add, list, and update goals.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Next: read the <a href="{{< relref "docs/user-guide/_index.md" >}}">User Guide</a>.
    </p>
  </div>
</div>

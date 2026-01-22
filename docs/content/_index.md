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

## Install

LLPM is a Bun-based CLI.

1. Install prerequisites first: Bun and Git available on your `PATH`.
2. Install LLPM globally.
3. Start LLPM.

```bash
bun add -g llpm
llpm
```

Next:

- Configure at least one model provider (environment variables).
- Run `/model providers` to confirm LLPM sees your credentials.
- Use `/model switch` to pick a model.

For prerequisites, provider setup, and other install options, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

Next steps:

- Follow [Quickstart]({{< relref "docs/getting-started/quickstart.md" >}}) for a first session and common slash commands.
- Review [Configuration]({{< relref "docs/getting-started/configuration.md" >}}) for environment variables and setup.

<!--
NOTE:
The docs build previously failed with:
  unterminated quoted string in shortcode parameter-argument
This homepage uses HTML-based cards (instead of feature-card shortcodes) to avoid fragile quoting in shortcode params.
-->

<div class="hx-mt-12 hx-grid hx-gap-6 md:hx-grid-cols-2">
  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Multi-Provider Models</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Connect one or more providers and switch models per project or task, with a cached catalog that stays aligned with provider APIs.
    </p>

    <p>Connect and manage providers:</p>

    <ul>
      <li>Run <code>/model providers</code> to see which providers are configured and which credentials are missing.</li>
      <li>
        Use <code>/model switch</code> to pick a model (interactive), or
        <code>/model switch &lt;provider&gt;/&lt;model&gt;</code> to switch directly.
      </li>
      <li>Run <code>/model list</code> to inspect models per provider.</li>
      <li>Use <code>/model update</code> to refresh the cached catalog from provider APIs.</li>
    </ul>

    <p>Supported provider IDs: <code>openai</code>, <code>anthropic</code>, <code>groq</code>, <code>google-vertex</code>, <code>cerebras</code>.</p>

    <p>Example model IDs (see <a href="https://github.com/britt/llpm/blob/main/MODELS.md">MODELS.md</a> for the full list):</p>

    <ul>
      <li>
        OpenAI: <code>gpt-5.2</code>, <code>gpt-5.2-mini</code>, <code>gpt-5.2-turbo</code>, <code>gpt-5.1</code>,
        <code>gpt-5.1-mini</code>, <code>gpt-5.1-turbo</code>, <code>gpt-4o</code>, <code>gpt-4o-mini</code>,
        <code>o4-mini</code>, <code>o3-mini</code>
      </li>
      <li>
        Anthropic: <code>claude-sonnet-4-5</code>, <code>claude-opus-4-1</code>, <code>claude-sonnet-4</code>,
        <code>claude-opus-4</code>, <code>claude-3-7-sonnet-latest</code>, <code>claude-3-5-haiku-latest</code>,
        <code>claude-3-haiku</code>
      </li>
      <li>Google Vertex: <code>gemini-2.5-pro</code>, <code>gemini-2.5-flash</code>, <code>gemini-2.5-ultra</code></li>
      <li>
        Groq: <code>meta-llama/llama-4-maverick-17b-128e-instruct</code>, <code>llama-3.3-70b-versatile</code>,
        <code>llama-3.1-70b-versatile</code>, <code>llama-3.1-8b-instant</code>, <code>deepseek-r1-distill-llama-70b</code>,
        <code>moonshotai/kimi-k2-instruct</code>, <code>openai/gpt-oss-120b</code>, <code>openai/gpt-oss-20b</code>,
        <code>qwen/qwen3-32b</code>
      </li>
      <li>Cerebras: <code>qwen-3-235b-a22b-instruct-2507</code>, <code>llama-3.3-70b</code>, <code>llama3.1-8b</code>, <code>llama3.1-70b</code></li>
    </ul>

    <p>LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code>.</p>
  </div>

  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Projects, Scans, and GitHub</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Keep work anchored to the right repository, then generate reusable project context with a structured scan of files, dependencies, documentation, and architecture.
    </p>

    <p>Work with projects and GitHub:</p>

    <ul>
      <li>Use <code>/project</code> to add, list, switch, and remove projects.</li>
      <li>Run <code>/project scan</code> to analyze a codebase (active project or current working directory).</li>
      <li>Use <code>/github</code> to browse/search repositories, then connect one to a project.</li>
    </ul>

    <p>Project scan output includes:</p>

    <ul>
      <li>Detected languages, frameworks, and project type</li>
      <li>Documentation overview</li>
      <li>Dependencies (by package manager)</li>
      <li>Optional architecture analysis (LLM-powered)</li>
    </ul>
  </div>
</div>

<div class="hx-mt-6 hx-grid hx-gap-6 md:hx-grid-cols-2">
  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(61,132,255,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Notes (Markdown)</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Capture decisions, plans, and research as Markdown notes and search them with ripgrep.
    </p>

    <ul>
      <li>Use <code>/notes</code> to create, list, view, update, and search notes.</li>
      <li>Install <code>rg</code> (ripgrep) for fast full-text search.</li>
    </ul>
  </div>

  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(87,204,116,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Skills and Workflows</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Use a catalog of skills (Agent Skills spec) to guide workflows like requirement elicitation, stakeholder tracking, risk detection, and project planning.
    </p>

    <ul>
      <li>Run <code>/skills</code> to list installed skills.</li>
      <li>Use <code>/skills reinstall</code> to refresh bundled core skills.</li>
      <li>Review the <a href="{{< relref "docs/skills-reference/" >}}">Skills Reference</a> for what’s included.</li>
    </ul>
  </div>
</div>

<!-- homepage-stamp: 2026-01-22 -->

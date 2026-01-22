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

<div class="hx-mt-6">

## Install

LLPM is a Bun-based CLI. Install prerequisites first: Bun and Git available on your `PATH`.

```bash
# Install the LLPM CLI globally with Bun
bun add -g llpm

# Then start LLPM
llpm
```

Next:

- Configure at least one model provider (environment variables)
- Run `/model providers` to confirm LLPM sees your credentials
- Use `/model switch` to pick a model

For prerequisites, provider setup, and other install options, see [Installation]({{< relref "docs/getting-started/installation.md" >}}).

</div>
</div>

<div class="hx-grid hx-grid-cols-1 md:hx-grid-cols-2 hx-gap-6">
  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Multi-Provider Models</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Connect one or more providers, then switch models per project or task while LLPM keeps the catalog in sync with provider APIs.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Run <code>/model providers</code> to see which providers are configured and which credentials are missing.</li>
      <li>Use <code>/model switch</code> to pick a model (interactive), or <code>/model switch &lt;provider&gt;/&lt;model&gt;</code> to switch directly.</li>
      <li>Run <code>/model list</code> to inspect the most relevant models per provider, grouped by generation.</li>
      <li>Use <code>/model update</code> to refresh the cached catalog from provider APIs and pull in newly released models.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      <strong>Supported provider IDs:</strong> <code>openai</code>, <code>anthropic</code>, <code>groq</code>, <code>google-vertex</code>, <code>cerebras</code>.
    </p>

    <div class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      <p class="hx-mb-2"><strong>Example model IDs (from <code>MODELS.md</code>):</strong></p>
      <p class="hx-mb-2">OpenAI: <code>gpt-5.2</code>, <code>gpt-5.2-mini</code>, <code>gpt-5.2-turbo</code>, <code>gpt-5.1</code>, <code>gpt-5.1-mini</code>, <code>gpt-5.1-turbo</code>, <code>gpt-4o</code>, <code>gpt-4o-mini</code>, <code>o4-mini</code>, <code>o3-mini</code></p>
      <p class="hx-mb-2">Anthropic: <code>claude-sonnet-4-5</code>, <code>claude-opus-4-1</code>, <code>claude-sonnet-4</code>, <code>claude-opus-4</code>, <code>claude-3-7-sonnet-latest</code>, <code>claude-3-5-haiku-latest</code>, <code>claude-3-haiku</code></p>
      <p class="hx-mb-2">Google Vertex: <code>gemini-2.5-pro</code>, <code>gemini-2.5-flash</code>, <code>gemini-2.5-ultra</code></p>
      <p class="hx-mb-2">Groq: <code>meta-llama/llama-4-maverick-17b-128e-instruct</code>, <code>llama-3.3-70b-versatile</code>, <code>llama-3.1-70b-versatile</code>, <code>llama-3.1-8b-instant</code>, <code>deepseek-r1-distill-llama-70b</code>, <code>moonshotai/kimi-k2-instruct</code>, <code>openai/gpt-oss-120b</code>, <code>openai/gpt-oss-20b</code>, <code>qwen/qwen3-32b</code></p>
      <p>Cerebras: <code>qwen-3-235b-a22b-instruct-2507</code>, <code>llama-3.3-70b</code>, <code>llama3.1-8b</code>, <code>llama3.1-70b</code></p>
    </div>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code> so model discovery stays fast and consistent between sessions and across restarts.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      If live discovery fails, LLPM falls back to a curated default catalog defined in <code>MODELS.md</code> so core models stay available even when provider APIs are unavailable.
      If a provider is not configured, its models stay hidden from the selector, and the footer only shows models from configured providers so the interface always reflects usable models.
    </p>
  </div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Projects, Scans, and GitHub</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Tie work to the right repo, then generate rich project context on demand.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/project</code> to add, list, switch, and remove projects, or to point LLPM at mono-repos and subdirectories.</li>
      <li>Run <code>/project scan</code> to analyze a codebase (active project or current working directory) using the ProjectScanOrchestrator.</li>
      <li>Use <code>/github</code> to browse/search repositories, then connect one to a project so issues, pull requests, and notes share the same context.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      The scan orchestration parses architecture, dependencies, documentation, and Git history to build a structured project profile for downstream tools. A scan summarizes project files (gitignore-aware), languages/frameworks, dependencies, documentation, and high-level architecture descriptions.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM persists scan results in <code>~/.llpm/projects/{projectId}/project.json</code> so repeat scans and follow-up commands stay fast.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Use flags like <code>--force</code> to refresh stale scans or <code>--no-llm</code> for a fast static pass without calling model APIs.
      Scan results feed into skills such as project-analysis, context-aware-questions, at-risk-detection, project-planning, and requirement-elicitation so follow-up questions and risk reports stay grounded in the actual codebase and GitHub issues.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      If LLPM starts inside a repo, it can auto-detect the matching project from the current working directory and will fall back to scanning the current directory when no project is configured.
    </p>
  </div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Skills and Guided Workflows</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Use reusable workflows packaged as Agent Skills (<code>SKILL.md</code>) to guide planning, analysis, and documentation without rebuilding prompts for every task.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Find skills with <code>/skills list</code> to see bundled and user-defined workflows.</li>
      <li>Preview a skill with <code>/skills test &lt;name&gt;</code> to inspect its goal, inputs, tools, and sample runs before using it on real work.</li>
      <li>Reload after edits with <code>/skills reload</code> so changes to skill files are picked up immediately.</li>
      <li>Restore bundled skills with <code>/skills reinstall</code> if local experiments break the core collection.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Skills follow the Agent Skills specification and are discovered from <code>~/.llpm/skills/</code> and project-specific skill folders, so repositories can ship their own guided workflows alongside code.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      The core collection includes skills for requirement elicitation, project planning, issue decomposition and dependency mapping, architecture diagramming, context-aware question generation, at-risk detection, stakeholder tracking, FAQ building from issues, note consolidation, meeting preparation, research summarization, and thread discussion summarization.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Each skill documents its flow, inputs, and expected outputs in its <code>SKILL.md</code> file, making it easy to audit behavior, adapt prompts to a team’s process, and create new skills tailored to a repository.
    </p>
  </div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Notes, Search, and Shell</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Capture project knowledge in Markdown notes, search it locally, and run carefully scoped shell commands when needed.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>
        Notes are stored as Markdown files with YAML frontmatter under <code>~/.llpm/projects/{projectId}/notes/</code>.
        Notes use YAML frontmatter to store titles, tags, and other metadata, making them easy to organize, grep, and feed into higher-level skills like <code>consolidate-notes-summary</code>, <code>build-faq-from-issues</code>, and <code>prepare-meeting-agenda</code>.
      </li>
      <li>
        Search uses ripgrep-based text search for fast local lookup and does not rely on embeddings or external vector indexes.
        The Markdown-based NotesBackend keeps everything on disk, while ripgrep-powered search stays fast even for large workspaces and multi-project setups.
      </li>
      <li>
        Shell execution is configured in <code>~/.llpm/config.json</code> (the <code>shell</code> section) as a global allowlist/denylist with timeouts and defaults.
        Every shell command goes through permission validation, explicit user confirmation (with optional skip-confirmation modes), and audit logging via the <code>run_shell_command</code> tool, so LLPM can suggest commands while still keeping execution controlled and traceable.
      </li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Shell execution is designed for short, auditable commands that complement LLPM’s analysis and planning tools; longer workflows stay in normal terminal sessions.
    </p>
  </div>
</div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Multi-Provider Models</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Connect one or more providers, then switch models per project or task while LLPM keeps the catalog in sync with provider APIs.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Run <code>/model providers</code> to see which providers are configured and which credentials are missing.</li>
      <li>Use <code>/model switch</code> to pick a model (interactive), or <code>/model switch &lt;provider&gt;/&lt;model&gt;</code> to switch directly.</li>
      <li>Run <code>/model list</code> to inspect the most relevant models per provider, grouped by generation.</li>
      <li>Use <code>/model update</code> to refresh the cached catalog from provider APIs and pull in newly released models.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      <strong>Supported provider IDs:</strong> <code>openai</code>, <code>anthropic</code>, <code>groq</code>, <code>google-vertex</code>, <code>cerebras</code>.
    </p>

    <div class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      <p class="hx-mb-2"><strong>Example model IDs (from <code>MODELS.md</code>):</strong></p>
      <p class="hx-mb-2">OpenAI: <code>gpt-5.2</code>, <code>gpt-5.2-mini</code>, <code>gpt-5.2-turbo</code>, <code>gpt-5.1</code>, <code>gpt-5.1-mini</code>, <code>gpt-5.1-turbo</code>, <code>gpt-4o</code>, <code>gpt-4o-mini</code>, <code>o4-mini</code>, <code>o3-mini</code></p>
      <p class="hx-mb-2">Anthropic: <code>claude-sonnet-4-5</code>, <code>claude-opus-4-1</code>, <code>claude-sonnet-4</code>, <code>claude-opus-4</code>, <code>claude-3-7-sonnet-latest</code>, <code>claude-3-5-haiku-latest</code>, <code>claude-3-haiku</code></p>
      <p class="hx-mb-2">Google Vertex: <code>gemini-2.5-pro</code>, <code>gemini-2.5-flash</code>, <code>gemini-2.5-ultra</code></p>
      <p class="hx-mb-2">Groq: <code>meta-llama/llama-4-maverick-17b-128e-instruct</code>, <code>llama-3.3-70b-versatile</code>, <code>llama-3.1-70b-versatile</code>, <code>llama-3.1-8b-instant</code>, <code>deepseek-r1-distill-llama-70b</code>, <code>moonshotai/kimi-k2-instruct</code>, <code>openai/gpt-oss-120b</code>, <code>openai/gpt-oss-20b</code>, <code>qwen/qwen3-32b</code></p>
      <p>Cerebras: <code>qwen-3-235b-instruct-2507</code>, <code>llama-3.3-70b</code>, <code>llama3.1-8b</code>, <code>llama3.1-70b</code></p>
    </div>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code> so model discovery stays fast and consistent between sessions and across restarts.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      If live discovery fails, LLPM falls back to a curated default catalog defined in <code>MODELS.md</code> so core models stay available even when provider APIs are unavailable.
      If a provider is not configured, its models stay hidden from the selector, and the footer only shows models from configured providers so the interface always reflects usable models.
    </p>
  </div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Projects, Scans, and GitHub</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Tie work to the right repo, then generate rich project context on demand.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Use <code>/project</code> to add, list, switch, and remove projects, or to point LLPM at mono-repos and subdirectories.</li>
      <li>Run <code>/project scan</code> to analyze a codebase (active project or current working directory) using the ProjectScanOrchestrator.</li>
      <li>Use <code>/github</code> to browse/search repositories, then connect one to a project so issues, pull requests, and notes share the same context.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      The scan orchestration parses architecture, dependencies, documentation, and Git history to build a structured project profile for downstream tools. A scan summarizes project files (gitignore-aware), languages/frameworks, dependencies, documentation, and high-level architecture descriptions.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      LLPM persists scan results in <code>~/.llpm/projects/{projectId}/project.json</code> so repeat scans and follow-up commands stay fast.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Use flags like <code>--force</code> to refresh stale scans or <code>--no-llm</code> for a fast static pass without calling model APIs.
      Scan results feed into skills such as project-analysis, context-aware-questions, at-risk-detection, project-planning, and requirement-elicitation so follow-up questions and risk reports stay grounded in the actual codebase and GitHub issues.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      If LLPM starts inside a repo, it can auto-detect the matching project from the current working directory and will fall back to scanning the current directory when no project is configured.
    </p>
  </div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Skills and Guided Workflows</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Use reusable workflows packaged as Agent Skills (<code>SKILL.md</code>) to guide planning, analysis, and documentation without rebuilding prompts for every task.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>Find skills with <code>/skills list</code> to see bundled and user-defined workflows.</li>
      <li>Preview a skill with <code>/skills test &lt;name&gt;</code> to inspect its goal, inputs, tools, and sample runs before using it on real work.</li>
      <li>Reload after edits with <code>/skills reload</code> so changes to skill files are picked up immediately.</li>
      <li>Restore bundled skills with <code>/skills reinstall</code> if local experiments break the core collection.</li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Skills follow the Agent Skills specification and are discovered from <code>~/.llpm/skills/</code> and project-specific skill folders, so repositories can ship their own guided workflows alongside code.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      The core collection includes skills for requirement elicitation, project planning, issue decomposition and dependency mapping, architecture diagramming, context-aware question generation, at-risk detection, stakeholder tracking, FAQ building from issues, note consolidation, meeting preparation, research summarization, and thread discussion summarization.
    </p>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-2">
      Each skill documents its flow, inputs, and expected outputs in its <code>SKILL.md</code> file, making it easy to audit behavior, adapt prompts to a team’s process, and create new skills tailored to a repository.
    </p>
  </div>

  <div class="hx-relative hx-rounded-xl hx-border hx-border-gray-200 dark:hx-border-neutral-800 hx-bg-white dark:hx-bg-neutral-900 hx-p-6 hx-shadow-sm"
       style="background: radial-gradient(ellipse at 50% 80%,rgba(80,120,200,0.15),hsla(0,0%,100%,0));">
    <h3 class="hx-text-xl hx-font-semibold hx-mb-2">Notes, Search, and Shell</h3>
    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mb-4">
      Capture project knowledge in Markdown notes, search it locally, and run carefully scoped shell commands when needed.
    </p>

    <ul class="hx-list-disc hx-pl-6 hx-space-y-2 hx-text-gray-600 dark:hx-text-gray-300">
      <li>
        Notes are stored as Markdown files with YAML frontmatter under <code>~/.llpm/projects/{projectId}/notes/</code>.
        Notes use YAML frontmatter to store titles, tags, and other metadata, making them easy to organize, grep, and feed into higher-level skills like <code>consolidate-notes-summary</code>, <code>build-faq-from-issues</code>, and <code>prepare-meeting-agenda</code>.
      </li>
      <li>
        Search uses ripgrep-based text search for fast local lookup and does not rely on embeddings or external vector indexes.
        The Markdown-based NotesBackend keeps everything on disk, while ripgrep-powered search stays fast even for large workspaces and multi-project setups.
      </li>
      <li>
        Shell execution is configured in <code>~/.llpm/config.json</code> (the <code>shell</code> section) as a global allowlist/denylist with timeouts and defaults.
        Every shell command goes through permission validation, explicit user confirmation (with optional skip-confirmation modes), and audit logging via the <code>run_shell_command</code> tool, so LLPM can suggest commands while still keeping execution controlled and traceable.
      </li>
    </ul>

    <p class="hx-text-gray-600 dark:hx-text-gray-300 hx-mt-4">
      Shell execution is designed for short, auditable commands that complement LLPM’s analysis and planning tools; longer workflows stay in normal terminal sessions.
    </p>
  </div>
</div>

---
---

# LLPM

AI-powered product management CLI for GitHub issues, codebases, stakeholders, and requirements.

## Install

LLPM is a Bun-based CLI.

1. Install [Bun](https://bun.sh/) and ensure `bun` is on your `PATH`.
2. Install LLPM:

   ```bash
   bun add -g llpm
   ```

3. Start LLPM:

   ```bash
   llpm
   ```

Next:

- Configure at least one model provider (via environment variables).
- Run `/model providers` to confirm credentials are detected.
- Use `/model switch` to select a model.

See: [Installation]({{< relref "docs/getting-started/installation.md" >}})

## Features

<div class="hx-mt-8 hx-grid hx-gap-6 md:hx-grid-cols-2">
  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Multi-Provider Models</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Connect one or more providers, then switch models per project or task while LLPM keeps a cached catalog in sync with provider APIs.
    </p>

    <p class="hx-mt-4">Connect and manage providers:</p>

    <ul class="hx-mt-2">
      <li><code>/model providers</code> to see which providers are configured and which credentials are missing.</li>
      <li>
        <code>/model switch</code> to pick a model (interactive), or
        <code>/model switch &lt;provider&gt;/&lt;model&gt;</code> to switch directly.
      </li>
      <li><code>/model list</code> to inspect models per provider.</li>
      <li><code>/model update</code> to refresh the cached catalog from provider APIs.</li>
    </ul>

    <p class="hx-mt-4">Supported provider IDs: <code>openai</code>, <code>anthropic</code>, <code>groq</code>, <code>google-vertex</code>, <code>cerebras</code>.</p>

    <p class="hx-mt-4">
      LLPM caches the provider-fetched catalog in <code>~/.llpm/models.json</code>.
    </p>
  </div>

  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Projects, Scans, and GitHub</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Keep work anchored to the right repository, then generate reusable project context with a structured scan of files, dependencies, documentation, and architecture.
    </p>

    <p class="hx-mt-4">Work with projects and GitHub:</p>

    <ul class="hx-mt-2">
      <li><code>/project</code> to add, list, switch, and remove projects.</li>
      <li><code>/project scan</code> to analyze a codebase (active project or current working directory).</li>
      <li><code>/github</code> to browse/search repositories, then connect one to a project.</li>
    </ul>

    <p class="hx-mt-4">Scan results are stored per project under <code>~/.llpm/projects/&lt;projectId&gt;/project.json</code>.</p>

    <p class="hx-mt-4"><a href="{{< relref "docs/user-guide/projects.md" >}}">Projects</a> and <a href="{{< relref "docs/user-guide/github-integration.md" >}}">GitHub Integration</a> show a typical setup.</p>
  </div>

  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(69,101,255,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Skills and Guided Workflows</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Use reusable workflows packaged as Agent Skills (<code>SKILL.md</code>) to guide planning, analysis, and documentation.
    </p>

    <ul class="hx-mt-4">
      <li><code>/skills list</code> to review available skills.</li>
      <li><code>/skills reload</code> to reload skills after edits.</li>
      <li><code>/skills reinstall</code> to restore bundled skills.</li>
    </ul>

    <p class="hx-mt-4">See the <a href="{{< relref "docs/skills-reference/_index.md" >}}">Skills Reference</a> for the full catalog.</p>
  </div>

  <div
    class="hx-rounded-2xl hx-border hx-border-gray-200/50 dark:hx-border-gray-800/50 hx-bg-white/60 dark:hx-bg-neutral-900/40 hx-p-6"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(16,185,129,0.15),hsla(0,0%,100%,0));"
  >
    <h3 class="hx-text-xl hx-font-semibold">Notes and Search</h3>
    <p class="hx-mt-2 hx-text-gray-600 dark:hx-text-gray-300">
      Capture project knowledge in Markdown notes, then search it locally.
    </p>

    <ul class="hx-mt-4">
      <li>Notes are stored under <code>~/.llpm/projects/&lt;projectId&gt;/notes/</code>.</li>
      <li>Search uses <code>ripgrep</code>-based full-text search.</li>
    </ul>

    <p class="hx-mt-4"><a href="{{< relref "docs/user-guide/projects.md" >}}">Project setup</a> and <a href="{{< relref "docs/user-guide/commands.md" >}}">commands</a> show how these features fit into a daily workflow.</p>
  </div>
</div>

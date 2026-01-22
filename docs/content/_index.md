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

<!--
Homepage note

Avoid shortcode-based feature cards here.
A previous version used a shortcode with quoted parameters and failed Hugo builds with:
"unterminated quoted string in shortcode parameter-argument".

This page uses plain HTML divs to create card-like sections.
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

</div>
</div>

<!--
Note: Avoid shortcode-based feature cards here.
A previous version used a shortcode with quoted parameters and failed Hugo builds with:
"unterminated quoted string in shortcode parameter-argument".
-->

"unterminated quoted string in shortcode parameter-argument".
-->

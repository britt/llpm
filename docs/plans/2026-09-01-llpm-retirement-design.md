# Retiring the LLPM CLI and Publishing Its Skills as an `llpm` Bundle

**Date:** 2026-09-01
**Status:** Implemented, except the personal-site update and the archive itself
**Amended:** 2026-09-01 — decisions 2 and 4 were superseded during implementation; see
"Amendment" below
**Supersedes:** the approach described in issue #322

## Summary

Archive the `britt/llpm` repository. Add an `llpm` bundle to `britt/agent-skills`, so
the LLPM name survives as the skills bundle it became. Update the personal site to point
at the successor.

No code moves between repositories. No installer, adapter, or MCP server gets built.

## Why this differs from issue #322

Issue #322 planned to extract LLPM's skill-install engine and build adapters for six
coding agents. Investigation showed most of that work is either unnecessary or already
finished elsewhere.

**`llpm/skills/` holds no unique content.** It is a five-month-stale ancestor of
`britt/agent-skills`:

| | `britt/llpm` | `britt/agent-skills` |
|---|---|---|
| Skills last modified | 2026-03-11 | 2026-08-13 |
| Skill count | 21 | 27 |

All 21 LLPM skills exist in agent-skills. The two apparent exceptions do not survive
scrutiny: `user-story-template` is superseded by `writing-user-stories`, which covers
the same As-a/I-want/So-that format, Given-When-Then criteria, and INVEST checklist in
half the lines; `skills/user/` is a scaffolding README for the CLI's `~/.llpm/skills/`
directory, not a skill.

**agent-skills already did the de-LLPM-ification.** Its copies strip the
`allowed-tools: "create_github_issue list_github_issues add_note"` frontmatter, replace
LLPM tool calls with `gh issue create`, rewrite descriptions into the "Use when…"
trigger style, and split long content into `reference.md` files.

**agent-skills already ships multi-host packaging.** The repository contains
`.claude-plugin/`, `.codex-plugin/`, and `.cursor-plugin/` manifests, and single-sources
bundles through symlinks into `skills/`. This covers issues #325, #326, and #327 without
further work.

Nothing worth preserving remains in `britt/llpm` except the name.

## Decisions

1. **Retire `britt/llpm`.** Archive it read-only on GitHub. Do not delete it; git history
   is the archive.
2. ~~**Rename the plugin only.** The `agent-skills` plugin becomes `llpm`.~~
   **Superseded — see Amendment.** A new `llpm` bundle was added instead. The repository
   stays `britt/agent-skills` and the marketplace stays `britt`. Install is
   `/plugin install llpm@britt`.
3. **Do not rename the repository.** Its content is skills, and "Agent Skills" is the
   ecosystem's term for them. "Plugin" names the packaging, not the substance. A rename
   would also break `britt.github.io/agent-skills/`, because GitHub Pages URLs do not
   redirect. Revisit when the repository ships non-skill plugins — MCP servers, slash
   commands, or hooks.
4. ~~**Leave the other plugins alone.** Only the catch-all is renamed.~~
   **Superseded — see Amendment.** Nothing was renamed. The catch-all `agent-skills`,
   `project-foundations`, and the 21 per-skill plugins are all untouched.

## Amendment (2026-09-01)

Decisions 2 and 4 assumed the `llpm` bundle would be made by *renaming* the catch-all
`agent-skills` plugin. Implementation took a better route: `britt/agent-skills` added a
**new** bundle at `bundles/llpm/`, following the existing `bundles/project-foundations/`
pattern, with skills single-sourced through symlinks into `skills/`.

This is strictly better than the design, for three reasons:

- **Nothing breaks.** No rename means existing `agent-skills@britt` installs keep
  resolving, which retires the alias-versus-hard-break question entirely.
- **The bundle means something.** A rename would have made `llpm` a synonym for "all 27
  skills," including general utilities like `markdown-formatting` and `mermaid-diagrams`.
  The new bundle holds only the project- and product-management skills that actually
  trace back to the CLI, which is what the name should denote.
- **It matches an established pattern** in that repository rather than introducing a
  one-off.

Shipped as marketplace v4.3.0 with `llpm` v1.0.0. See britt/agent-skills#71.

## Non-goals

- Extracting `SkillRegistry`, `MarketplaceService`, or `skillParser`. They die with the CLI.
- Building adapters for OpenCode, Aider, or Pi.
- Porting any `src/tools/` capability to a skill.
- A final LLPM feature release.

## Work

### `britt/llpm`

- Delete `skills/` and note in the commit that agent-skills supersedes it.
- Replace `README.md` with a deprecation notice pointing to
  `/plugin marketplace add britt/agent-skills` and `/plugin install llpm@britt`.
- Close or rewrite the 11 open issues (see disposition below).
- Archive the repository on GitHub.

### npm

```
npm deprecate @britt/llpm "LLPM is now a skills bundle: /plugin install llpm@britt"
```

`@britt/llpm@1.11.1` was last published 2026-03-20. Deprecate rather than unpublish, so
existing lockfiles keep resolving.

### `britt/agent-skills`

**Done** — shipped as marketplace v4.3.0, `llpm` v1.0.0. Per the Amendment, a new
bundle was added rather than renaming the catch-all:

- `bundles/llpm/` created following the `bundles/project-foundations/` pattern, with
  `.claude-plugin/`, `.cursor-plugin/`, and `.codex-plugin/` manifests and skills
  symlinked into `../../../skills/`
- `llpm` entries added to `.claude-plugin/marketplace.json` and
  `.cursor-plugin/marketplace.json` with `"source": "./bundles/llpm"`, alongside the
  untouched `agent-skills` and `project-foundations` entries

No version bump was needed on the catch-all, because nothing about it changed.

### `britt/britt.github.com`

`content/_index.md` lists LLPM and Agent Skills as separate entries:

```
line 11: * [Agent Skills](https://britt.github.io/agent-skills/) - some skills for working with coding agents.
line 13: * [LLPM](https://github.com/britt/llpm) - Imagine Claude Code was a PM.
```

Because LLPM becomes a bundle inside agent-skills, these collapse into one. Delete line
13 and extend line 11 to mention the LLPM product-management bundle.

## Sequence

1. Rename the plugin in `agent-skills` and release 5.0.0. The successor must exist before
   anything points at it.
2. Update the personal site.
3. Rewrite the LLPM README, deprecate on npm, then archive the repository. Archiving
   makes the repository read-only, so all commits land first.

## Issue disposition

| Issue | Action |
|---|---|
| #322 Convert LLPM into a cross-agent skills plugin | Rewrite as the retirement epic |
| #323 Archive the LLPM CLI runtime | Rewrite: archive the whole repository, not just the runtime |
| #324 Extract the skill-install engine | Close — no engine survives |
| #325 Claude Code plugin support | Close — `.claude-plugin/` already ships |
| #326 OpenAI Codex support | Close — `.codex-plugin/` already ships |
| #327 Cursor support | Close — `.cursor-plugin/` already ships |
| #328 OpenCode support | Close — no installer is being built |
| #329 Aider support | Close — same |
| #330 Pi (pi.dev) support | Close — same |
| #331 Rewrite README, package.json, CLAUDE.md | Rewrite: README deprecation notice only |
| #332 Publish CLI deprecation notice | Keep, narrowed to README plus `npm deprecate` |
| #333 Update remaining project documentation | Close — archived repositories need no current docs |

Each closure should say why, and link here.

## Risks

~~**Renaming breaks existing installs.**~~ Resolved by the Amendment: nothing was
renamed, so no install stops resolving.

**GitHub redirects apply to the repository, not GitHub Pages.** This design renames no
repository, so nothing breaks. It is the reason decision 3 stands.

**Archiving is reversible but noisy.** Unarchiving is one click if something surfaces
later.

## Resolved decision

**Hard break, or a deprecated alias?** Moot. The Amendment removed the rename, so no
existing install breaks and no alias is needed.

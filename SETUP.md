# Setup wizard

LLPM includes an interactive setup wizard to configure AI providers, select a default model, and create your first project.

## Run the wizard

After installing:

```bash
llpm setup
```

From source:

```bash
bun run setup
```

### Flags

- `--force`: Reconfigure providers/tokens even if credentials already exist.
- `--profile <name>` (or `-p <name>`): Store credentials under a named profile.
- `--verbose` (or `-v`): Enable verbose logging.

## What the wizard configures

The wizard walks through these steps:

1. Configure at least one AI provider credential (required).
2. Select a default model from the configured providers (required).
3. Configure a GitHub token (recommended; can be skipped).
4. Configure an Arcade API key for web search tools (recommended; can be skipped).
5. Create a first project (required).

## Where configuration is stored

LLPM stores configuration under `~/.llpm/` by default:

- `~/.llpm/credentials.json`: Provider credentials (supports multiple profiles).
- `~/.llpm/config.json`: Project configuration (projects and the active project).
- `~/.llpm/system_prompt.txt`: The active system prompt (created on first run).
- `~/.llpm/skills/`: Installed skills (created on first run).

If you set `LLPM_CONFIG_DIR`, LLPM uses that directory instead of `~/.llpm/`.

## Environment variables

Environment variables take precedence over values stored in `~/.llpm/credentials.json`.

Common variables:

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
CEREBRAS_API_KEY=...

# Google Vertex AI
GOOGLE_VERTEX_PROJECT_ID=...
GOOGLE_VERTEX_REGION=us-central1

# Optional integrations
GITHUB_TOKEN=...
ARCADE_API_KEY=...
```

## Notes

- The wizard validates provider credentials by fetching available models.
- The “Create First Project” step links a project name, a GitHub repository (for example `owner/repo`), and an existing local directory; it does not clone repositories.
- `llpm setup` exits when setup completes; run `llpm` to start the interactive chat UI.
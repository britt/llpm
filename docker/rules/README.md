# Agent Rules Template System

This directory contains the template-based system for generating agent-specific rules files.

## Structure

```
rules/
├── AGENT_RULES.base.md        # Base template for all agents
├── generate-rules.js           # Template processor script
├── package.json                # Node.js dependencies (Handlebars)
├── claude-code/
│   └── specific-rules.md       # Optional Claude Code-specific rules
├── aider/
│   └── specific-rules.md       # Optional Aider-specific rules
├── openai-codex/
│   └── specific-rules.md       # Optional OpenAI Codex-specific rules
└── opencode/
    └── specific-rules.md       # Optional OpenCode-specific rules
```

## How It Works

1. **Base Template** (`AGENT_RULES.base.md`):
   - Contains all common rules shared by all agents
   - Uses Handlebars template syntax: `{{agent_name}}`, `{{#if}}`
   - Single source of truth for shared guidelines

2. **Agent-Specific Rules** (optional):
   - Each agent can have a `specific-rules.md` file in their subdirectory
   - Contents are automatically appended to the generated file
   - Useful for agent-specific features or limitations

3. **Generation Script** (`generate-rules.js`):
   - Processes the base template for each agent
   - Injects agent-specific variables (name, output filename)
   - Appends agent-specific rules if they exist
   - Outputs to the appropriate agent directory

## Usage

### Generate All Rules Files

```bash
cd docker/rules
npm install
npm run generate
```

This generates:

- `docker/claude-code/CLAUDE.md`
- `docker/aider/CONVENTIONS.md`
- `docker/openai-codex/AGENT.md`
- `docker/opencode/AGENT.md`

### Adding Agent-Specific Rules

Create a file at `rules/<agent-id>/specific-rules.md`:

```markdown
### Claude Code CLI Options

- Always use `--dangerously-skip-permissions` flag when running in containers
- Use `--verbose` flag for debugging
```

Then regenerate the files with `npm run generate`.

## Docker Integration

The generation happens during Docker build:

```dockerfile
# Copy rules generation system
COPY rules /tmp/rules
WORKDIR /tmp/rules

# Generate rules file
RUN npm install --production && npm run generate

# Copy generated rules to agent workspace
COPY --from=builder /tmp/rules/../<agent>/RULES.md /home/<user>/workspace/
```

## Modifying Rules

To update rules shared by all agents:

1. Edit `AGENT_RULES.base.md`
2. Run `npm run generate`
3. Commit all generated files

To add agent-specific rules:

1. Create/edit `rules/<agent-id>/specific-rules.md`
2. Run `npm run generate`
3. Commit the specific rules file and generated output

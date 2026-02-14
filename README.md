# LLPM

A modern, AI-powered project management CLI that brings intelligent assistance directly to your terminal. Built with Ink for a polished terminal UI, LLPM combines natural language interaction with structured project management, offering seamless GitHub integration and persistent workspace configuration.

Perfect for developers who want to organize multiple projects, interact with GitHub repositories, and leverage AI assistance without leaving the command line.

## Installation

### From NPM (recommended)

```bash
npm install -g @britt/llpm
```

After installation, run `llpm` to start the CLI.

### With Bun

Bun blocks postinstall scripts from packages not in its trusted list. To install with Bun, first add `@britt/llpm` to your global `~/.bunfig.toml`:

```toml
[install]
trustedDependencies = ["@britt/llpm"]
```

Then install:

```bash
bun install -g @britt/llpm
```

### From Source

```bash
git clone https://github.com/britt/llpm.git
cd llpm
bun install
bun run start
```

### Requirements

- Node.js 18+ or [Bun](https://bun.sh) runtime
- API key for at least one AI provider (OpenAI, Anthropic, Groq, or Google Vertex AI)
- GitHub token (optional, for GitHub integration features)

## Documentation

Full documentation available at: **https://britt.github.io/llpm/**

- First-time setup wizard: [SETUP.md](SETUP.md)

## Features

### Core Features

- 🤖 Chat with AI assistant (GPT-5.2 by default) with multi-provider support
- 🔄 Dynamic model switching between OpenAI, Anthropic, Groq, Google Vertex AI, and Cerebras
- 💬 Interactive terminal chat interface with real-time input handling
- 🎨 Clean, styled terminal UI built with Ink
- 📝 Persistent chat history per session
- ⚙️ Configurable system prompts stored in user config directory

### Project Management

- 📁 Multi-project support with automatic configuration persistence
- 🔄 Easy project switching and management
- 📂 GitHub repository integration for project setup
- 🛠️ LLM tools for natural language project management
- 💾 Configuration stored in `~/.llpm/`

### GitHub Integration

- 🔍 Browse and search your GitHub repositories
- 📋 List repositories with filtering and sorting options
- 🎯 Repository selection for new projects
- 🔗 Direct integration with project management

### Skills System

- 🎓 **Dynamic skill loading** with automatic system prompt injection
- 📚 **20 core skills included**: Mermaid diagrams, stakeholder tracking, user story templates, and more
- 🔧 **Custom skills support** - Create your own reusable instruction sets
- 🤖 **AI-aware**: Skills are automatically listed in the system prompt with usage guidance
- 🔄 **Hot reloading** - Changes take effect immediately with `/skills reload`

### Slash Commands

- `/info` - Show application and current project information
- `/help` - Display all available commands
- `/quit` or `/exit` - Exit the application
- `/clear` - Start a new chat session
- `/project` - Manage projects (add, list, switch, remove)
- `/project-scan` - Scan and analyze project structure
- `/github` - Browse and search GitHub repositories
- `/issue` - Manage GitHub issues
- `/model` - Switch between AI models and view provider status
- `/skills` - Manage skills (list, test, enable, disable, reload)
- `/notes` - Manage project notes
- `/stakeholder` - Manage stakeholders and goals
- `/history` - View chat history
- `/registry` - View model registry information
- `/debug` - Show recent debug logs for troubleshooting

## Configuration

Configure API keys as environment variables. If running from source, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

```bash
# AI Providers (configure at least one)
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GROQ_API_KEY=your-groq-api-key-here
CEREBRAS_API_KEY=your-cerebras-api-key-here
GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
GOOGLE_VERTEX_REGION=us-central1  # Optional, defaults to us-central1

# Optional integrations
GITHUB_TOKEN=your-github-token-here  # For GitHub features
```

**📖 For detailed provider configuration instructions, see [Model Providers Documentation](MODELS.md)**

### Running from Source

```bash
bun run start              # Start the CLI
bun run start:verbose      # Start with debug logging
```

## Usage

### First-time setup

Run the interactive setup wizard to configure providers, select a default model, and create your first project:

```bash
llpm setup
```

For details, see [SETUP.md](SETUP.md).

### Basic Usage

1. Start the application with `llpm` (or `bun run start` if running from source)
2. Type your message and press Enter to chat with the AI
3. Use slash commands (e.g., `/help`) for specific functions
4. Use Ctrl+C to exit

### Project Management Workflow

1. **Set up your first project:**

   ```
   /project add "My App" "https://github.com/user/my-app" "/path/to/project"
   ```

2. **Or browse GitHub repositories:**

   ```
   /github list
   # Then use the AI: "Add this repository as a new project"
   ```

3. **Switch between projects:**

   ```
   /project switch project-id
   # or
   /project switch  # to see available projects to switch to
   /project list    # to list all available projects with details
   ```

4. **Natural language project management:**
   - "What's my current project?"
   - "List all my projects"
   - "Switch to my web app project"
   - "Add my latest GitHub repo as a new project"
   - "Remove the old project"

5. **Switch between AI models:**

   ```
   /model switch           # Interactive model selector
   /model switch openai/gpt-4o         # Direct model switch
   /model list             # Show available models
   /model providers        # Check provider configuration
   ```

### Chat Commands vs Natural Language

You can use either approach:

**Slash commands** (direct, immediate):

- `/info` - Quick system information
- `/project list` - List all projects
- `/project switch` - Switch between projects
- `/github search typescript` - Search repositories

**Natural language** (AI-powered, flexible):

- "Show me information about the current setup"
- "What projects do I have available?"
- "Find TypeScript repositories on GitHub"
- "Add my latest repository as a new project called 'Web Dashboard'"

## Development

### Run tests:

```bash
bun run test
```

### Available scripts:

- `bun start` - Start the CLI application
- `bun start:verbose` - Start with debug logging enabled
- `bun run dev` - Same as start (development mode)
- `bun run dev:verbose` - Development mode with debug logging
- `bun run test` - Run test suite
- `bun run test:watch` - Run tests in watch mode
- `bun run test:ui` - Run tests with UI
- `bun run test:coverage` - Run tests with coverage report
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier

### Debug Mode

Enable verbose debug logging to troubleshoot issues:

```bash
# Using npm scripts
bun start:verbose

# Using flags directly
bun run index.ts --verbose
./index.ts -v
```

Debug logs include:

- Environment validation steps
- Chat message flow
- API call details and responses
- Loading state changes
- Error details

### Distributed Tracing

LLPM includes OpenTelemetry support for distributed tracing with Jaeger. This enables comprehensive visibility into:

- User request flows with hierarchical flame graphs
- LLM interactions with token usage and tool calls
- File system operations (config loading, chat history, system prompts)
- Network operations (GitHub API calls)
- Individual tool executions

**Quick Start:**

```bash
# Start Jaeger
cd docker
docker-compose up -d jaeger

# Enable telemetry (enabled by default)
export LLPM_TELEMETRY_ENABLED=1

# Run LLPM with verbose logging to see trace initialization
bun run index.ts --verbose

# View traces at http://localhost:16686
```

**📖 For detailed telemetry setup and usage, see [TELEMETRY.md](TELEMETRY.md)**

## Configuration

LLPM stores configuration in `~/.llpm/`:

- `config.json` - Project configurations and current project
- `chat-sessions/` - Persistent chat history by session
- `system_prompt.txt` - Custom system prompt (automatically created on first run)
- `skills/` - Core skills and custom skills (automatically installed on first run)

### Custom System Prompt

LLPM automatically creates a default system prompt file on first run. You can customize the AI assistant's behavior by editing this file:

```bash
# View the current system prompt
cat ~/.llpm/system_prompt.txt

# Edit the system prompt with your preferred editor
nano ~/.llpm/system_prompt.txt
# or
code ~/.llpm/system_prompt.txt
```

**Key features:**
- **Automatic creation**: Default prompt is copied to `~/.llpm/system_prompt.txt` on first install/run
- **Idempotent**: Existing customizations are preserved during updates
- **Real-time loading**: Changes take effect on next chat session start
- **Fallback**: If the file is corrupted or missing, LLPM falls back to the built-in default

The default system prompt focuses on project management, GitHub integration, and provides access to all available tools and commands.

## Skills System

LLPM implements the [Agent Skills](https://agentskills.io/home) standard, allowing you to create reusable instruction sets that work across multiple AI coding assistants including Claude Code, Cursor, and other compatible tools.

Skills are automatically injected into the system prompt, making the AI aware of when and how to use them. Because LLPM uses the Agent Skills standard, you can share skills between tools or use community skill packs like [Superpowers](https://github.com/anthropics/claude-code/tree/main/.claude/plugins/superpowers-marketplace) which provides battle-tested workflows for TDD, debugging, code review, and more.

### Core Skills

LLPM comes with 20 core skills installed by default in `~/.llpm/skills/`:

| Skill | Description |
|-------|-------------|
| **architecture-diagramming** | Create architecture diagrams for projects |
| **at-risk-detection** | Detect at-risk items in projects and issues |
| **build-faq-from-issues** | Generate FAQ documents from GitHub issues |
| **consolidate-notes-summary** | Consolidate and summarize project notes |
| **context-aware-questions** | Generate context-aware clarifying questions |
| **dependency-mapping** | Map project dependencies and relationships |
| **issue-decomposition** | Decompose large issues into smaller tasks |
| **markdown-formatting** | Best practices for markdown document formatting |
| **mermaid-diagrams** | Create syntactically correct Mermaid diagrams for GitHub |
| **prepare-meeting-agenda** | Structure effective meeting agendas |
| **project-planning** | Guide project planning and milestone creation |
| **requirement-elicitation** | Elicit and refine project requirements |
| **research-topic-summarize** | Summarize research on technical topics |
| **stakeholder-tracking** | Track stakeholders and their goals |
| **stakeholder-updates** | Craft clear stakeholder communications |
| **summarize-conversation-thread** | Summarize long conversation threads |
| **timeline-planning** | Plan project timelines and schedules |
| **triage-new-issues** | Triage and categorize new GitHub issues |
| **user** | General user interaction skill |
| **user-story-template** | Write well-formed user stories with acceptance criteria |

### Using Skills

Skills are automatically listed in the system prompt, showing the AI when to load them:

```
You: "I need to create a sequence diagram for the authentication flow"
AI: I'll load the mermaid-diagrams skill to help create a syntactically correct diagram.
    [Uses load_skills tool]
```

**AI Tools for Skills:**
- `load_skills` - Load one or more skills to augment context
- `list_available_skills` - Discover available skills with optional tag filtering

**Slash Commands:**
```bash
/skills list              # List all discovered skills and their status
/skills test <name>       # Preview a skill's content and settings
/skills enable <name>     # Enable a skill
/skills disable <name>    # Disable a skill
/skills reload            # Rescan skill directories and reload all skills
/skills reinstall         # Reinstall core skills from bundled directory
```

### Creating Custom Skills

Create your own skills in `~/.llpm/skills/` (personal) or `.skills/` (project-specific):

```markdown
# ~/.llpm/skills/my-skill/SKILL.md
---
name: my-skill
description: "Brief description of what this skill does"
instructions: "When [condition], [action]"
tags:
  - tag1
  - tag2
allowed_tools:
  - tool1
  - tool2
---

# My Skill Instructions

Your markdown instructions here...
```

**Frontmatter Fields:**
- `name` (required): Unique skill identifier (lowercase, hyphens only)
- `description` (required): What the skill does (max 1024 chars)
- `instructions` (optional): Single-line guidance on when to use this skill
- `tags` (optional): Array of tags for filtering and discovery
- `allowed_tools` (optional): Restrict tool usage when skill is active
- `vars` (optional): Variables for content substitution
- `resources` (optional): Additional files to load

**Skill Locations:**
- `~/.llpm/skills/` - Personal skills (shared across all projects)
- `.skills/` or `skills/` - Project-specific skills (not shared)

**How Skills Work:**
1. Skills are scanned on startup and when `/skills reload` is called
2. All enabled skills with instructions are injected into the system prompt
3. The AI sees when to load each skill based on the `instructions` field
4. When loaded via `load_skills` tool, the skill's full content is added to context
5. Loaded skills can optionally restrict tool usage to an allowed list

**Example Custom Skill:**

```markdown
# ~/.llpm/skills/api-design/SKILL.md
---
name: api-design
description: "Guide for designing RESTful API endpoints following best practices"
instructions: "When designing APIs, creating endpoints, or reviewing API specifications"
tags:
  - api
  - rest
  - design
allowed_tools:
  - github
  - notes
---

# API Design Skill

## RESTful Principles
- Use nouns for resources (not verbs)
- HTTP methods: GET (read), POST (create), PUT/PATCH (update), DELETE (remove)
...
```

## Architecture

### Core Components

- **Components**: Terminal UI components built with Ink (`src/components/`)
- **Hooks**: React hooks for state management (`src/hooks/useChat.ts`)
- **Services**: LLM integration using Vercel AI SDK (`src/services/llm.ts`)
- **Commands**: Slash command system (`src/commands/`)
- **Tools**: LLM function calling tools (`src/tools/`)
- **Utils**: Configuration and utility functions (`src/utils/`)

### Project Management System

- **Project Config**: Persistent storage in `~/.llpm/config.json`
- **Multi-project Support**: Each project has ID, name, repository, and path
- **GitHub Integration**: Repository browsing and search capabilities
- **LLM Tools**: Function calling for natural language project operations

### Tool System

The AI assistant has access to 59 tools across these categories:

**Project Management:**
- `get_current_project`, `list_projects`, `add_project`, `set_current_project`, `remove_project`, `update_project`

**GitHub Integration:**
- `list_github_repos`, `search_github_repos`, `get_github_repo`
- `create_github_issue`, `list_github_issues`, `update_github_issue`, `comment_on_github_issue`, `search_github_issues`, `get_github_issue_with_comments`
- `list_github_pull_requests`, `create_github_pull_request`

**Notes:**
- `add_note`, `update_note`, `search_notes`, `list_notes`, `get_note`, `delete_note`

**Stakeholder Management:**
- `add_stakeholder`, `list_stakeholders`, `get_stakeholder`, `update_stakeholder`, `remove_stakeholder`
- `link_issue_to_goal`, `unlink_issue_from_goal`, `generate_coverage_report`, `resolve_conflict`

**Project Analysis:**
- `scan_project`, `get_project_scan`, `list_project_scans`, `analyze_project_full`
- `get_project_architecture`, `get_project_key_files`, `get_project_dependencies`
- `analyze_project_risks`, `analyze_issue_risks`, `get_at_risk_items`
- `generate_project_questions`, `generate_issue_questions`, `suggest_clarifications`, `identify_information_gaps`

**Filesystem:**
- `read_project_file`, `list_project_directory`, `get_project_file_info`, `find_project_files`

**Web & Screenshots:**
- `web_search`, `read_web_page`, `summarize_web_page`
- `take_screenshot`, `check_screenshot_setup`

**Shell & System:**
- `run_shell_command`, `get_system_prompt`, `ask_user`

**Skills:**
- `load_skills`, `list_available_skills`

## Contributing

This project uses:

- [Bun](https://bun.com) - JavaScript runtime and package manager
- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Vercel AI SDK](https://sdk.vercel.ai) - LLM integration
- [Vitest](https://vitest.dev) - Testing framework

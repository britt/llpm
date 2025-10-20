# LLPM

A modern, AI-powered project management CLI that brings intelligent assistance directly to your terminal. Built with Ink for a polished terminal UI, LLPM combines natural language interaction with structured project management, offering seamless GitHub integration and persistent workspace configuration.

Perfect for developers who want to organize multiple projects, interact with GitHub repositories, and leverage AI assistance without leaving the command line.

## Features

### Core Features

- 🤖 Chat with AI assistant (GPT-4.1 Mini by default) with multi-provider support
- 🔄 Dynamic model switching between OpenAI, Anthropic, Groq, and Google Vertex AI
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

### Slash Commands

- `/info` - Show application and current project information
- `/help` - Display all available commands
- `/quit` - Exit the application
- `/clear` - Start a new chat session
- `/project` - Manage projects (add, list, switch, remove)
- `/github` - Browse and search GitHub repositories
- `/model` - Switch between AI models and view provider status
- `/debug` - Show recent debug logs for troubleshooting

## Prerequisites

### Required
- [Bun](https://bun.com) runtime
- At least one AI provider API key (see configuration below)

### Optional (for local embeddings)
- **Python 3.8+** - For local text embeddings using bge-base-en-v1.5
- **Python packages**: `torch`, `transformers` (install via `./scripts/embeddings/setup.sh`)
- Without Python, LLPM will use OpenAI embeddings API (requires `OPENAI_API_KEY`)

> **Note**: Local embeddings provide better privacy and cost savings but require ~420MB model download on first use. See [Local Embeddings Guide](scripts/embeddings/README.md) for details.

## Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **[Optional] Set up local embeddings:**

   If you want to use local embeddings (better privacy, cost savings):

   ```bash
   ./scripts/embeddings/setup.sh
   ```

   This installs Python dependencies for local text embeddings. Without this, LLPM will use OpenAI embeddings (requires `OPENAI_API_KEY`).

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and configure at least one AI provider:

   ```bash
   # AI Providers (configure at least one)
   OPENAI_API_KEY=your-openai-api-key-here
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   GROQ_API_KEY=your-groq-api-key-here
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_VERTEX_REGION=us-central1  # Optional, defaults to us-central1

   # Optional integrations
   GITHUB_TOKEN=your-github-token-here  # For GitHub features
   ```

   **📖 For detailed provider configuration instructions, see [Model Providers Documentation](MODELS.md)**

### Using a local LLM proxy (litellm)

If you're running a local litellm or other OpenAI-compatible HTTP proxy, point LLPM at it by setting the OpenAI-compatible environment variables. Example (bash):

```bash
# Example litellm proxy URL (update to your proxy)
export OPENAI_API_BASE="http://localhost:8080/v1"
# If your proxy expects a token, set OPENAI_API_KEY (some local proxies accept any string)
export OPENAI_API_KEY="local-test-key"

# Start llpm in the same shell so it picks up these env vars
llpm
```

**Quick curl test**

Run a quick POST to verify the proxy responds using the OpenAI-compatible API:

```bash
curl -s -X POST "$OPENAI_API_BASE/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}' | jq
```

**Notes and troubleshooting**

- **API path**: include "/v1" in OPENAI_API_BASE if your proxy exposes the OpenAI-compatible path there (e.g. http://localhost:8080/v1). Adjust if your proxy uses a different route.
- **Streaming**: if you need streaming completions, confirm your proxy supports the streaming semantics (SSE vs. chunked transfer) that LLPM expects.
- **TLS / certs**: for HTTPS proxies with self-signed certs, either use a valid cert or configure Node to trust the CA (NODE_EXTRA_CA_CERTS) when running LLPM.
- **Provider selection**: ensure LLPM is configured to use the OpenAI-compatible client path (some LLPM configs expose a provider setting). If needed, set provider=openai in LLPM config so it respects OPENAI_API_BASE.
- **Persisting env vars**: to avoid re-exporting, add these to ~/.profile, your service unit, or a project .env file (.env.example can be added to the repo).

## Running the CLI

### Development mode:

```bash
bun start
# or
bun run index.ts
```

### With verbose debug logging:

```bash
bun start:verbose
# or
bun run index.ts --verbose
# or (short flag)
bun run index.ts -v
```

### Make it executable and run directly:

```bash
chmod +x index.ts
./index.ts
# With verbose mode
./index.ts --verbose
```

### Install globally (optional):

```bash
bun link
llpm
```

## Usage

### Basic Usage

1. Start the application with `bun start`
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
- Database operations (notes insertion, semantic search)
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

The AI assistant has access to these tools:

- `get_current_project` - Get active project information
- `list_projects` - List all configured projects
- `add_project` - Add new projects
- `set_current_project` - Switch current project
- `remove_project` - Remove projects
- `list_github_repos` - Browse user's GitHub repositories
- `search_github_repos` - Search GitHub repositories
- `get_github_repo` - Get specific repository details

## Contributing

This project uses:

- [Bun](https://bun.com) - JavaScript runtime and package manager
- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Vercel AI SDK](https://sdk.vercel.ai) - LLM integration
- [Vitest](https://vitest.dev) - Testing framework

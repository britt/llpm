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

- [Bun](https://bun.com) runtime
- At least one AI provider API key (see configuration below)

## Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configure environment variables:**

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

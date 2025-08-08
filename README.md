# Claude PM

AI-powered CLI project manager similar to Claude Code. Chat with an LLM assistant directly in your terminal using a clean, interactive interface built with Ink.

## Features

- 🤖 Chat with AI assistant (OpenAI GPT-4o-mini by default)
- 💬 Interactive terminal chat interface
- ⌨️ Real-time input handling
- 🎨 Clean, styled terminal UI with Ink
- 🔧 Extensible architecture for adding more AI providers

## Prerequisites

- [Bun](https://bun.com) runtime
- OpenAI API key

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your API keys:
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   GITHUB_TOKEN=your-github-token-here  # Optional, for GitHub features
   ```

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
claude-pm
```

## Usage

1. Start the application with `bun start`
2. Type your message and press Enter to chat with the AI
3. Use Ctrl+C to exit

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

## Architecture

- **Components**: Terminal UI components built with Ink
- **Hooks**: React hooks for state management (`useChat`)
- **Services**: LLM integration using Vercel AI SDK
- **Types**: TypeScript type definitions

## Contributing

This project uses:
- [Bun](https://bun.com) - JavaScript runtime and package manager
- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Vercel AI SDK](https://sdk.vercel.ai) - LLM integration
- [Vitest](https://vitest.dev) - Testing framework

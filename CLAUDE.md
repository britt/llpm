---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: '*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json'
alwaysApply: true
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- **ALWAYS use `bun test` for running tests, NOT `bun run test` or `npm test`**
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

**CRITICAL: Use `bun test` to run tests - NOT `bun run test` or any other command.**

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Project-Specific Instructions

**IMPORTANT**: When you discover new useful practices or install new tools during development, add instructions to this CLAUDE.md file so that you remember to use them in future sessions.

**NOTE**: This project has been renamed from Claude PM to LLPM (Large Language Model Product Manager). All references to "Claude PM" should be replaced with "LLPM".

**IMPORTANT**: Always answer questions and fulfill requests honestly. Do not just be compliant. If you cannot do something or don't know an answer say so.

### Testing

- Use `bun run test` to run Vitest tests (installed in this project)
- Tests use React Testing Library with jsdom environment
- Test files should use `.test.tsx` or `.spec.tsx` extensions
- **Always add unit tests for new behaviors**: When implementing new features, validation logic, or significant changes, write corresponding unit tests
- Mock external dependencies (APIs, services) in tests to ensure reliability
- Use Vitest's `vi.mock()` for mocking modules and `vi.spyOn()` for spying on functions
- Test both success and error cases for robust coverage

### AI/LLM Integration

- Use Vercel AI SDK (`ai` package) for LLM integrations
- OpenAI provider: `@ai-sdk/openai`
- Import model: `import { openai } from '@ai-sdk/openai'`
- Use `generateText()` for single responses, `streamText()` for streaming
- Environment variables: Store API keys in `.env` (Bun loads automatically)

### CLI Development with Ink

- Use Ink for terminal UI components: `import { Box, Text, useInput } from 'ink'`
- Use React patterns with `React.createElement()` for JSX compatibility
- Input handling: `useInput()` hook for keyboard interactions
- Terminal styling: Use `color` prop for text colors, `bold` for emphasis
- **Input handling gotchas**:
  - Avoid parameter name conflicts in `useInput((inputChar, key) => ...)` - don't use `input` as parameter name if you have an `input` state variable
  - Check for `!key.return` when handling regular character input to avoid conflicts
  - Use `inputChar` parameter for actual character input, not the conflicting variable name
  - Always remove `borderColor` if borders disappear - stick to default border styling

### Slash Command System

- Commands start with `/` and are processed locally (not sent to LLM)
- Command structure: `/command [args]`
- Built-in commands: `/info`, `/help`, `/quit`, `/model`
- Create new commands in `src/commands/` directory
- Register commands in `src/commands/registry.ts`
- Command interface:
  ```typescript
  export interface Command {
    name: string;
    description: string;
    execute: (args: string[]) => Promise<CommandResult> | CommandResult;
  }
  ```
- System messages use 'system' role with magenta color
- Commands are parsed before being sent to chat hook

### Model Switching System

- **Multi-provider support**: OpenAI, Anthropic, Groq, Google Vertex AI
- **Dynamic switching**: Change models during conversation without restart
- **Persistent selection**: Model choice saved to `~/.llpm/model-config.json`
- **Environment-based config**: Uses API keys from environment variables
- **Command interface**: `/model` command with multiple subcommands

#### Model Commands

- `/model` - Show current model and available providers
- `/model list` - List available models from configured providers only
- `/model list --all` - List all models regardless of configuration status
- `/model current` - Show detailed current model information
- `/model providers` - Show provider configuration status
- `/model switch <provider>/<model-id>` - Switch to specific model
- `/model <model-spec>` - Quick switch (shorthand)

#### Model Status Indicators

- 🟢 = Model is usable (provider configured)
- 🔴 = Model needs configuration (API key missing)
- ✅ = Provider is properly configured
- ❌ = Provider needs configuration
- 👉 = Currently selected model

#### Model Configuration

Environment variables (configure at least one):
```env
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GROQ_API_KEY=your-groq-key
GOOGLE_VERTEX_PROJECT_ID=your-project-id
GOOGLE_VERTEX_REGION=us-central1  # optional
```

#### Architecture

- **ModelRegistry**: Central service managing model providers and configurations
- **Model persistence**: Automatic saving/loading of selected model
- **Provider factory**: Creates appropriate AI SDK instances based on provider
- **Type-safe configuration**: Full TypeScript support for model configurations

### GitHub Integration

- Use `@octokit/rest` for GitHub API interactions
- Create repositories: `gh repo create` command
- Environment variable: `GITHUB_TOKEN` for authentication

#### GitHub Projects v2 (Recommended)
- **New Projects Experience**: Uses GraphQL API exclusively - no REST endpoints available
- **Authentication**: Requires `GITHUB_TOKEN` with `project` scope (`gh auth login --scopes "project"`)
- **Commands**: Use `/project-board` command for new Projects v2 management
- **API Structure**: Projects → Items (issues/PRs/drafts) with custom Fields and Views
- **Node IDs**: Uses GraphQL Global Node IDs (e.g., `gid://Project/123`) instead of numeric IDs
- **Features**: More flexible than Classic with custom fields, multiple views, better integration

#### GitHub Projects Classic (Deprecated)
- **Legacy API**: GitHub is deprecating Projects Classic in favor of Projects v2
- **REST API**: Due to API deprecation, newer Octokit versions don't include Projects endpoints
- **Implementation**: We use `octokit.request()` for direct API calls to deprecated endpoints
- **Commands**: `/project-board` command marked as deprecated
- **Migration**: Users should migrate to Projects v2 (`/board`)

#### Project Board Integration
- **Automatic Linking**: Link LLPM projects with GitHub Project Boards for seamless integration
- **Auto-Assignment**: Newly created issues/PRs are automatically added to the linked project board
- **AI Tools**: Comprehensive AI tools for setting, viewing, and managing project board configurations
- **Commands**: Use `/board` command for direct project board management
- **Configuration**: Project board settings are stored in project metadata and persist across sessions

AI Tools for Project Board Management:
- `set_project_board`: Link a GitHub Project Board to current LLPM project
- `get_project_board_info`: View current project board configuration with optional validation
- `remove_project_board`: Remove project board link from current project
- `list_available_project_boards`: List all available project boards for an owner
- `update_github_project_item_field`: Update field values for items in GitHub Project v2 boards (supports text, number, date, and single select fields)

Example AI Usage:
```
User: Link this project to GitHub project board #8 for user 'myorg'
Assistant: I'll link your current project to the GitHub project board using the set_project_board tool.

User: Update the priority field to "High" for item ABC123 in project XYZ789
Assistant: I'll update the project item's priority field using the update_github_project_item_field tool.
```

### TypeScript Best Practices

- **Always use `import type` for type-only imports**: Use `import type { MyType } from './types'` instead of `import { MyType } from './types'` when importing interfaces, types, or other TypeScript-only constructs
- This improves build performance and makes the distinction between runtime and compile-time imports clear
- Examples:

  ```typescript
  // ✅ Good - type-only import
  import type { Message } from '../types';

  // ❌ Bad - regular import for types
  import { Message } from '../types';
  ```

### Type System Rules

**Rule 1: Never Create Custom Types When Library Types Exist**
- **ALWAYS use the library's built-in types** instead of creating your own
- **Check the library documentation first** before defining any custom interfaces  
- **Import and use official types** from the library's type definitions

Examples:
- ✅ `import { Message } from 'ai'`
- ❌ `interface Message { role: string; content: string; }`
- ✅ `import { ChatCompletionTool } from 'openai/resources/chat/completions'`
- ❌ `interface ToolDefinition { name: string; description: string; }`

**Rule 2: Library Types Take Precedence**
- When integrating with external libraries, **their type system is the source of truth**
- **Don't fight the library's type system** - work with it, not against it
- If you need to extend a library type, use intersection types or inheritance
- ✅ `type CustomMessage = Message & { id: string }`
- ❌ Completely redefining what a Message should look like

**Rule 3: Read the Documentation First**
- **Always check the library's TypeScript definitions** before writing code
- **Look at official examples** to understand the expected data structures
- **Don't assume** - verify the correct types and formats

**Rule 4: Use Library Utilities and Helpers**
- **Use the library's own utility functions** for creating objects
- **Don't manually construct complex objects** that the library provides helpers for
- **Follow the library's patterns and conventions**

Example of proper AI SDK usage:
```typescript
// WRONG - Custom types fighting the library
interface CustomTool {
  name: string;
  description: string;
  parameters: any;
}

// RIGHT - Using library types and helpers
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'Does something useful',
  parameters: z.object({ ... }),
  execute: async (params) => { ... }
});
```

**Why These Rules Matter:**
1. **Prevents Integration Issues**: Using library types ensures compatibility
2. **Reduces Bugs**: Library types are tested and validated  
3. **Improves Maintainability**: Changes in library versions are automatically handled
4. **Follows Best Practices**: Library authors know their system best
5. **Saves Time**: No need to reverse-engineer or guess at type structures

### Debug Logging

- Use `debug()` function from `src/utils/logger` for debug output
- Enable with `--verbose` or `-v` command line flag
- Debug logs are written to stderr with timestamp and [DEBUG] prefix
- Add debug logging to new features for better troubleshooting
- Examples:

  ```typescript
  import { debug } from '../utils/logger';

  debug('Function called with:', parameter);
  debug('API response received:', response.data);
  ```

### Version Management (Semantic Versioning)

This project follows semantic versioning (MAJOR.MINOR.PATCH):

**Version Bump Rules:**
- **PATCH (0.0.x)**: Bug fixes, documentation updates, small improvements, test fixes
- **MINOR (0.x.0)**: New features, new commands, new tools, API additions that maintain backward compatibility
- **MAJOR (x.0.0)**: Breaking changes, API removals, significant architecture changes

**When to Bump:**
- **Always bump MINOR** for new features like:
  - New slash commands (e.g., `/project-board`)
  - New AI tools for LLM integration
  - New service integrations (GitHub, APIs)
  - New CLI functionality
- **Always bump PATCH** for:
  - Bug fixes and error handling
  - Test fixes and CI improvements
  - Documentation updates
  - Performance improvements
- **Consider MAJOR** for:
  - Breaking command interfaces
  - Removing features/commands
  - Major refactoring that affects user workflows

**Example**: Adding GitHub Projects integration with `/project-board` command and 15 new AI tools = MINOR version bump

### Development Workflow

- Always run lint/typecheck commands if available before committing
- Use TodoWrite tool for complex multi-step tasks to track progress
- Mark todos as completed immediately after finishing tasks
- **Commit changes regularly**: After completing 2-3 related tasks or making significant progress, commit changes to maintain good version history
- **Bump version appropriately**: Use semantic versioning rules above to determine version bumps
- Commit with descriptive messages including Claude Code attribution
- Push to GitHub repository after commits to keep remote updated

---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: '*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json'
alwaysApply: true
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
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

Use `bun test` to run tests.

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
- Built-in commands: `/info`, `/help`, `/quit`
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

### GitHub Integration

- Use `@octokit/rest` for GitHub API interactions
- Create repositories: `gh repo create` command
- Environment variable: `GITHUB_TOKEN` for authentication

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

### Development Workflow

- Always run lint/typecheck commands if available before committing
- Use TodoWrite tool for complex multi-step tasks to track progress
- Mark todos as completed immediately after finishing tasks
- **Commit changes regularly**: After completing 2-3 related tasks or making significant progress, commit changes to maintain good version history
- Commit with descriptive messages including Claude Code attribution
- Push to GitHub repository after commits to keep remote updated

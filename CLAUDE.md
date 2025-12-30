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

- **CRITICAL: Use `bun test` to run tests - NOT `bun run test` or any other command.**
- `bun run test` executes the npm script which runs Vitest properly
- Test files should use `.test.tsx` or `.spec.tsx` extensions
- Mock external dependencies (APIs, services) in tests to ensure reliability
- Use Vitest's `vi.mock()` for mocking modules and `vi.spyOn()` for spying on functions
- Test both success and error cases for robust coverage
- **Always add unit tests for new behaviors**: When implementing new features, validation logic, or significant changes, write corresponding unit tests


```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Project-Specific Instructions

**IMPORTANT**: When you discover new useful practices or install new tools during development, add instructions to this CLAUDE.md file so that you remember to use them in future sessions.

**NOTE**: This project has been renamed from Claude PM to LLPM (Large Language Model Product Manager). All references to "Claude PM" should be replaced with "LLPM".

**IMPORTANT**: Always answer questions and fulfill requests honestly. Do not just be compliant. If you cannot do something or don't know an answer say so.

### AI/LLM Integration

- Use Vercel AI SDK (`ai` package) for LLM integrations
- OpenAI provider: `@ai-sdk/openai`
- Import model: `import { openai } from '@ai-sdk/openai'`
- Use `generateText()` for single responses, `streamText()` for streaming
- Environment variables: Store API keys in `.env` (Bun loads automatically)

### Screenshot Tools

LLPM uses ONLY shot-scraper for screenshots. NEVER use JINA screenshot tools!

**AI Tools for Screenshots (shot-scraper ONLY):**
- `take_screenshot`: Take a screenshot of any web page with customizable options
- `check_screenshot_setup`: Check if shot-scraper is properly installed and configured

**IMPORTANT: Use only the shot-scraper tools for screenshots!**

**Key Features:**
- **URL Screenshots**: Capture any web page by URL
- **Custom Dimensions**: Specify browser width/height (default: 1280x720)
- **Element Selection**: Screenshot specific CSS selectors instead of full page
- **Wait Delays**: Add delays before capture for dynamic content
- **Custom Filenames**: Specify screenshot filename (auto-generates if not provided)
- **Temporary Storage**: Screenshots saved to system temp directory

**Setup Requirements:**
1. Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`
2. Install shot-scraper: `uv pip install shot-scraper`
3. Verify: `uvx shot-scraper --version`

**AI Tool Usage Examples:**
```
User: "Take a screenshot of https://example.com"
Assistant: I'll take a screenshot using shot-scraper.
[Uses take_screenshot tool (shot-scraper) with URL parameter]

User: "Screenshot just the main content area of the page"
Assistant: I'll take a screenshot of the specific content area using shot-scraper with a CSS selector.
[Uses take_screenshot tool (shot-scraper) with selector parameter]
```

**CRITICAL RULE: ONLY use shot-scraper for screenshots!**
The AI automatically uses shot-scraper when requested and provides the file path for viewing.

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

### File Attachments for GitHub Issues and PRs

LLPM can upload and attach files when creating or commenting on GitHub issues and pull requests:

**AI Tools with File Attachment Support:**
- `create_github_issue`: Create issues with optional file attachments
- `comment_on_github_issue`: Add comments with optional file attachments  
- `create_github_pull_request`: Create PRs with optional file attachments

**Key Features:**
- **Automatic Upload**: Files are uploaded to GitHub gists for reliable hosting
- **Smart Detection**: Images get image markdown syntax, other files get download links
- **Multiple Files**: Support for attaching multiple files at once
- **Error Handling**: Graceful handling of upload failures with user feedback
- **File Size Info**: Shows file sizes in attachment links

**Supported File Types:**
- **Images**: PNG, JPG, JPEG, GIF, BMP, WEBP (displayed inline)
- **Text Files**: TXT, MD, JSON, JS, TS, HTML, CSS, LOG, YAML, XML, CSV
- **Binary Files**: Any other file type (linked for download)

**AI Tool Usage Examples:**
```
User: "Create an issue about the login bug and attach the error screenshot"
Assistant: I'll create the issue and upload your screenshot.
[Uses create_github_issue tool with attachments parameter]

User: "Comment on issue #123 and attach the debug logs"
Assistant: I'll add a comment with the log file attached.
[Uses comment_on_github_issue tool with attachments parameter]
```

**Implementation Details:**
- Files are uploaded as private GitHub gists for secure, permanent hosting
- Attachment markdown is appended to issue/PR/comment body automatically
- Upload failures are handled gracefully without blocking issue/PR creation
- GitHub token is required for file uploads

### GitHub Integration

- Use `@octokit/rest` for GitHub API interactions
- Create repositories: `gh repo create` command
- Environment variable: `GITHUB_TOKEN` for authentication

#### Project Board Integration
- **Automatic Linking**: Link LLPM projects with GitHub Project Boards for seamless integration
- **Auto-Assignment**: Newly created issues/PRs are automatically added to the linked project board
- **AI Tools**: Comprehensive AI tools for setting, viewing, and managing project board configurations
- **Configuration**: Project board settings are stored in project metadata and persist across sessions

AI Tools for Project Board Management:
- `set_project_board`: Link a GitHub Project Board to current LLPM project
- `get_project_board_info`: View current project board configuration with optional validation
- `remove_project_board`: Remove project board link from current project
- `list_available_project_boards`: List all available project boards for an owner

Example AI Usage:
```
User: Link this project to GitHub project board #8 for user 'myorg'
Assistant: I'll link your current project to the GitHub project board using the set_project_board tool.
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

### AI Tool Creation Rules

**CRITICAL: Always Use `inputSchema` for AI Tools**
- **ALWAYS use `inputSchema`** when defining tools with our custom `tool()` wrapper
- **NEVER use `parameters`** - AI SDK v5 expects `inputSchema` directly
- Check existing tools in the codebase before creating new ones to follow the same pattern
- Our instrumentedTool wrapper does NOT transform anything - it passes `inputSchema` directly to AI SDK

```typescript
// ✅ CORRECT - Use inputSchema directly
export const myTool = tool({
  description: 'Description of the tool',
  inputSchema: z.object({
    param: z.string().describe('Parameter description')
  }),
  execute: async ({ param }) => { ... }
});

// ❌ WRONG - Never use parameters
export const myTool = tool({
  description: 'Description of the tool',
  parameters: z.object({ ... }), // Don't use this!
  execute: async ({ param }) => { ... }
});

// For tools with NO parameters, use empty z.object({})
export const noParamTool = tool({
  description: 'Tool with no parameters',
  inputSchema: z.object({}), // Empty schema
  execute: async () => { ... }
});
```

**How It Works:**
1. You define tools with `inputSchema` (what AI SDK expects)
2. Our wrapper (`src/tools/instrumentedTool.ts`) adds logging but passes config through unchanged
3. The AI SDK receives `inputSchema` directly
4. Returned tool objects have `.inputSchema` property (use this in tests)

**Why This Matters:**
- AI SDK v5 expects `inputSchema` - using anything else causes JSON Schema conversion errors
- OpenAI/Anthropic APIs require valid JSON Schema with `type: "object"`
- Empty schemas `z.object({})` work correctly when passed as `inputSchema`

**CRITICAL RULE: NEVER MODIFY EXISTING TOOL SCHEMAS ACROSS THE CODEBASE**
- **ONLY modify the specific tools you are asked to work on**
- **NEVER change `inputSchema` to `parameters` (or vice versa) across existing tool files**
- **NEVER make sweeping changes to tool definitions across multiple files**
- When adding NEW tools to a file, ONLY add the new tools
- Do NOT modify any existing tools in the same file or other tool files
- If there's a schema conversion bug, fix the WRAPPER (`instrumentedTool.ts`), NOT individual tools
- When debugging tool issues, isolate the problem to specific tools - don't touch everything

**Why This Matters:**
- Changing tool schemas across the board breaks existing functionality
- OpenAI/Anthropic APIs are sensitive to schema format changes
- You've made this mistake MULTIPLE TIMES - learn from it
- Most tool issues are in the conversion layer, NOT individual tool definitions

**Examples:**
```typescript
// ✅ CORRECT - Adding new tools to existing file
export const existingTool = tool({ ... }); // DON'T TOUCH THIS

// Add your NEW tools at the end:
export const newTool1 = tool({ ... });
export const newTool2 = tool({ ... });

// ❌ WRONG - Modifying existing tools while adding new ones
export const existingTool = tool({
  parameters: z.object({}) // Changed inputSchema → parameters WRONG!
});

export const newTool1 = tool({ ... }); // Your new tool
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

### Project Analysis Tools

LLPM includes AI tools that allow the model to analyze and understand project structure:

**AI Tools for Project Analysis:**
- `scan_project`: Analyze current project codebase and store results in memory
- `get_project_scan`: Retrieve previously cached project analysis from memory  
- `list_project_scans`: List all cached project scans across multiple projects

**Command Line Interface:**
- `/project-scan` - Analyze the current project and display detailed summary
- `/project-scan help` - Show help for the project scan command

**Key Features:**
- **Comprehensive Analysis**: File types, languages, directory structure, code metrics
- **Memory Storage**: Results cached in memory for AI to reference across conversations
- **Smart Filtering**: Automatically ignores build artifacts, dependencies, hidden files
- **Performance Optimized**: Limits file scanning to prevent performance issues
- **Rich Metrics**: Lines of code, file counts, largest files, language distribution

**Example AI Usage:**
```
User: "Analyze the current project structure"
Assistant: I'll scan the project to understand its structure and composition.
[Uses scan_project tool to analyze codebase and stores results in memory]

User: "What are the main languages used in this project?"
Assistant: Based on the previous scan, this project primarily uses:
[References cached scan results from memory without re-scanning]
```

The AI can now understand project architecture and provide contextually relevant assistance based on the actual codebase structure.

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
  - New slash commands (e.g., `/credentials`)
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

**Example**: Adding new AI tool with slash command interface = MINOR version bump

### Development Workflow

- Always run lint/typecheck commands if available before committing
- Use TodoWrite tool for complex multi-step tasks to track progress
- Mark todos as completed immediately after finishing tasks
- **Commit changes regularly**: After completing 2-3 related tasks or making significant progress, commit changes to maintain good version history
- **Bump version appropriately**: Use semantic versioning rules above to determine version bumps
- Commit with descriptive messages
- Push to GitHub repository after commits to keep remote updated

### TypeScript Unused Code Detection

**Two-tier type checking system:**

- **`bun run typecheck`**: Standard type checking for CI/CD and regular development
  - Compatible with Vitest and test files
  - No unused code detection to avoid breaking test builds

- **`bun run typecheck:strict`**: Stricter checking for finding unused code
  - Uses `tsconfig.strict.json` which extends base config
  - Enables `noUnusedLocals` and `noUnusedParameters`
  - Excludes test files (`**/*.test.ts`, `**/*.spec.ts`, etc.)
  - **Use this to find unused functions, methods, and variables**

**When to use:**
```bash
# Before committing (standard checks)
bun run lint
bun run typecheck

# Weekly cleanup or before major releases (find unused code)
bun run typecheck:strict
```

**Why two configs:**
Strict unused code checks cause Vitest config loading to fail because test files often have intentionally unused parameters (like mocked functions). The two-tier system allows tests to run while still providing strict checking for production code.

### YAML Configuration Rules

- **NEVER use comments in YAML files**: Do not add any comments (lines starting with #) to YAML configuration files
- Keep YAML files clean and comment-free for better compatibility and parsing

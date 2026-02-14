# Project Overview

**LLPM (Large Language Model Product Manager)** is an AI-powered project management CLI that brings intelligent assistance directly to the terminal.

## What It Does
- Interactive chat with AI models (OpenAI, Anthropic, Groq, Google Vertex AI)
- Project management with GitHub integration
- Skills system for reusable AI instruction sets
- Slash commands for quick actions (`/project`, `/github`, `/model`, `/skills`)

## Tech Stack
- **Runtime**: Bun (not Node.js)
- **UI**: Ink (React for CLI)
- **AI**: Vercel AI SDK with multi-provider support
- **Testing**: Vitest
- **Language**: TypeScript

## Key Directories
- `src/commands/` - Slash command implementations
- `src/services/` - Core services (GitHub, LLM, model registry)
- `src/tools/` - AI tools for LLM function calling
- `src/utils/` - Utility functions and helpers
- `src/components/` - Ink UI components

## Running LLPM

```bash
# Development mode (same as start)
bun run dev

# Production mode
bun run start

# With verbose logging
bun run dev:verbose
```

Entry point: `index.ts`

---

## ABSOLUTE RULES - NO EXCEPTIONS

### 1. Test-Driven Development is MANDATORY

**The Iron Law**: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

Every single line of production code MUST follow this cycle:
1. **RED**: Write failing test FIRST
2. **Verify RED**: Run test, watch it fail for the RIGHT reason
3. **GREEN**: Write MINIMAL code to pass the test
4. **Verify GREEN**: Run test, confirm it passes
5. **REFACTOR**: Clean up with tests staying green

### 2. Violations = Delete and Start Over

If ANY of these occur, you MUST delete the code and start over:
- ❌ Wrote production code before test → DELETE CODE, START OVER
- ❌ Test passed immediately → TEST IS WRONG, FIX TEST FIRST
- ❌ Can't explain why test failed → NOT TDD, START OVER
- ❌ "I'll add tests later" → DELETE CODE NOW
- ❌ "Just this once without tests" → NO. DELETE CODE.
- ❌ "It's too simple to test" → NO. TEST FIRST.
- ❌ "Tests after achieve same goal" → NO. DELETE CODE.

### 3. Test Coverage Requirements

- **Minimum 90%** coverage on ALL metrics:
  - Lines: 90%+
  - Functions: 90%+
  - Branches: 85%+
  - Statements: 90%+
- Coverage below threshold = Implementation incomplete
- Untested code = Code that shouldn't exist

### 4. Before Writing ANY Code

Ask yourself:
1. Did I write a failing test for this?
2. Did I run the test and see it fail?
3. Did it fail for the expected reason?

If ANY answer is "no" → STOP. Write the test first.

### 5. Test File Structure

Tests are **co-located** with source files (not in separate `__tests__` folders):
- `src/commands/github.ts` → `src/commands/github.test.ts`
- `src/utils/config.ts` → `src/utils/config.test.ts`
- `src/services/llm.ts` → `src/services/llm.test.ts`

### 6. Task Completion Requirements

**MANDATORY RULE**: NO TASK IS COMPLETE until:
- ✅ ALL tests pass (100% green)
- ✅ Build succeeds with ZERO errors
- ✅ NO linter errors or warnings
- ✅ Coverage meets minimum thresholds (90%+)
- ✅ Progress documented in PROGRESS.md

A task with failing tests, build errors, or linter warnings is INCOMPLETE. Period.

### 7. Progress Documentation

**MANDATORY RULE**: YOU MUST REPORT YOUR PROGRESS IN `PROGRESS.md`

After completing EACH task:
1. Create `PROGRESS.md` if it doesn't exist
2. Document:
   - Task completed
   - Tests written/passed
   - Coverage achieved
   - Any issues encountered
   - Timestamp

Format:
```markdown
## Task X: [Name] - [COMPLETE/IN PROGRESS]
- Started: [timestamp]
- Tests: X passing, 0 failing
- Coverage: Lines: X%, Functions: X%, Branches: X%, Statements: X%
- Build: ✅ Successful / ❌ Failed
- Linting: ✅ Clean / ❌ X errors
- Completed: [timestamp]
- Notes: [any relevant notes]
```

### 8. Git Commits - Commit Early, Commit Often

**MANDATORY RULE**: COMMIT EARLY, COMMIT OFTEN

- **Commit after EACH successful TDD cycle**:
  - ✅ After RED-GREEN-REFACTOR cycle completes
  - ✅ After each test file is created
  - ✅ After each module implementation
  - ✅ After fixing bugs or issues
  - ✅ After updating documentation

- **Frequency Requirements**:
  - Minimum: After each completed subtask
  - Maximum: No more than 30 minutes without a commit
  - Never have more than one feature in a single commit

- **Each commit MUST**:
  - Have failing tests written first
  - Pass all tests
  - Build successfully
  - Have no linter errors
  - Meet coverage requirements (if code was added)
  - Have progress documented
  - Include clear commit message mentioning TDD

- **Commit Message Format**:
  ```
  type(scope): brief description

  - RED: What tests were written first
  - GREEN: What minimal code was added
  - Status: X tests passing, build successful
  - Coverage: X% (if applicable)
  ```

- **Benefits of Frequent Commits**:
  - Easy rollback if something breaks
  - Clear history of TDD progression
  - Smaller, reviewable changes
  - Proof of TDD discipline

## Development Workflow

For EACH feature/function:

```
1. Write test file or add test case
2. Run: bun run test
3. See RED (test fails)
4. Understand WHY it fails
5. Write minimal production code
6. Run: bun run test
7. See GREEN (test passes)
8. Refactor if needed
9. Run: bun run test (stays green)
10. Check coverage: bun run test --coverage
11. Repeat for next feature
```

## Commands You'll Use Constantly

```bash
# Watch mode - keep this running ALWAYS
bun run test --watch

# Run once
bun run test

# Check coverage
bun run test --coverage

# Build - MUST succeed before task is complete
bun run build

# Check for Linter errors
bun run lint

# Type checking
bun run typecheck
```

## Red Flags - STOP Immediately

If you catch yourself:
- Opening a code file before a test file
- Writing function implementation before test
- Thinking "I know this works"
- Copying code from examples without tests
- Skipping test runs
- Ignoring failing tests
- Writing multiple features before testing

**STOP. DELETE. START WITH TEST.**

## The Mindset

- Tests are not optional
- Tests are not added after
- Tests DRIVE the implementation
- If it's not tested, it doesn't exist
- Coverage below 90% = unfinished work

## Accountability Check

Before marking ANY task complete, verify:
1. ✓ Test written first?
2. ✓ Test failed first?
3. ✓ Minimal code to pass?
4. ✓ All tests green? (`bun run test`)
5. ✓ Coverage maintained (90%+)? (`bun run test --coverage`)
6. ✓ Build succeeds? (`bun run build`)
7. ✓ No linter errors? (`bun run lint`)
8. ✓ Progress documented in PROGRESS.md?

Missing ANY ✓ = Task is NOT complete. Fix it first.

## Final Rule

**When in doubt**: Write a test.
**When not in doubt**: Write a test anyway.
**When it seems too simple**: Especially write a test.

There are NO exceptions to TDD in this project. None.

---

*This document is your contract. Breaking these rules means breaking the project's core quality commitment. The discipline of TDD is what separates professional, reliable code from hopeful guesswork.*

---

# Development Tools

## Bun Usage

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun run test` to run Vitest tests (NOT `bun test` which runs Bun's native test runner)
- **ALWAYS use `bun run test` for running tests, NOT `bun test` or `npm test`**
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

- **CRITICAL: Use `bun run test` to run Vitest tests - NOT `bun test` or any other command.**
- `bun test` runs Bun's native test runner which doesn't support Vitest features
- `bun run test` executes the npm script which runs Vitest properly
- Test files should use `.test.tsx` or `.spec.tsx` extensions
- Mock external dependencies (APIs, services) in tests to ensure reliability
- Use Vitest's `vi.mock()` for mocking modules and `vi.spyOn()` for spying on functions
- Test both success and error cases for robust coverage
- **Always add unit tests for new behaviors**: When implementing new features, validation logic, or significant changes, write corresponding unit tests

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

**Implementation Details:**
- Files are uploaded as private GitHub gists for secure, permanent hosting
- Attachment markdown is appended to issue/PR/comment body automatically
- Upload failures are handled gracefully without blocking issue/PR creation
- GitHub token is required for file uploads

### GitHub Integration

- Use `@octokit/rest` for GitHub API interactions
- Create repositories: `gh repo create` command
- Environment variable: `GITHUB_TOKEN` for authentication

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

**MANDATORY RULE: Never claim to have used a tool without actually calling it.** This is a hard rule. NEVER respond as though you have used a tool when you have not.

### Prompt Documentation with @prompt

**MANDATORY: All prompts sent to LLMs must be documented with `@prompt` comments.**

When creating or modifying any text that will be sent to an LLM, add a JSDoc comment with `@prompt` to make it searchable and identifiable:

```typescript
/**
 * @prompt Tool: my_tool_name
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const myTool = tool({
  description: 'This description is sent to the LLM...',
  inputSchema: z.object({
    param: z.string().describe('This is also sent to the LLM')
  }),
  execute: async ({ param }) => { ... }
});
```

**What counts as a prompt:**
- Tool `description` fields (sent to LLM as tool instructions)
- Parameter `.describe()` strings (sent to LLM as parameter guidance)
- System prompts and templates (`DEFAULT_SYSTEM_PROMPT`, etc.)
- Context injection functions that generate LLM-bound text
- User-facing message templates shown before LLM actions
- Setup/instruction messages that guide LLM behavior

**Comment format:**
- For tools: `@prompt Tool: tool_name`
- For system prompts: `@prompt PROMPT_CONSTANT_NAME`
- For template functions: `@prompt functionName`

**Why this matters:**
- Makes prompts searchable: `grep -r "@prompt" src/`
- Helps with prompt maintenance and updates
- Documents which strings affect LLM behavior
- Enables prompt auditing and optimization

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
  inputSchema: z.object({ ... }),
  execute: async (params) => { ... }
});
```

**Why These Rules Matter:**
1. **Prevents Integration Issues**: Using library types ensures compatibility
2. **Reduces Bugs**: Library types are tested and validated  
3. **Improves Maintainability**: Changes in library versions are automatically handled
4. **Follows Best Practices**: Library authors know their system best
5. **Saves Time**: No need to reverse-engineer or guess at type structures

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

# Verification

Verification is acceptance testing with real systems (not mocks). It validates that features work in production-like conditions.
The specific verification plan is detailed in @VERIFICATION_PLAN.md

## When to Run Verification

| Verification Type | When to Run | What It Covers |
|-------------------|-------------|----------------|
| **Quick** | After completing a set of related changes | Smoke test: `/help`, `/model`, AI responds |
| **Extensive** | Before completing a major feature or PR | All 9 scenarios in VERIFICATION_PLAN.md |

**Verification is NOT required after every commit.** TDD handles code correctness at the unit level. Verification validates real-world behavior at the feature level.

## If Verification Fails

1. **Document the failure** - which scenario failed and why
2. **Fix the issue** - address the root cause
3. **Re-run verification** - confirm the fix works
4. **Proceed only when passing** - do not create PRs with failing verification

## Quick Verification (run often)

```bash
# Start LLPM and run:
/help
/model
/skills list
# Send: "Hello, what model are you?"
/exit
```

Pass: All commands succeed, AI responds.

## Extensive Verification (before PRs)

See @VERIFICATION_PLAN.md for full acceptance testing procedures covering:
- AI chat integration
- Model switching
- Slash commands
- Skills system
- GitHub integration
- Project management
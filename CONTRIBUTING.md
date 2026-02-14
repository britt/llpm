# Contributing to LLPM

Thank you for your interest in contributing to LLPM! This guide covers everything you need to get started.

## Community Trust (Vouch)

This project uses [Vouch](https://github.com/mitchellh/vouch) to verify contributions come from trusted community members. This prevents AI slop, spam, and low-quality drive-by contributions.

**How it works:**

- **Vouched users** can open issues and pull requests normally.
- **Unvouched users** will have their issues/PRs automatically closed with a message explaining how to get vouched.
- **Denounced users** will have their issues/PRs automatically closed and locked.

**How to get vouched:**

1. Engage with the project in discussions or existing issues.
2. Demonstrate familiarity with the codebase and project goals.
3. Ask a maintainer to vouch for you.

Only the project owner can vouch or denounce users via `/vouch @username` and `/denounce @username` comments.

### Maintainer actions

- Add someone to the trusted list: comment `/vouch @username`.
- Add someone to the denounced list: comment `/denounce @username`.

Store the lists in [VOUCHED.td](./VOUCHED.td).

## Code of Conduct

Be respectful, constructive, and collaborative. We welcome contributors of all experience levels.

Posting in issues, PRs, or discussions in an attempt to generate sales, promote your product, increase SEO for your project, or any other form of spam will result in being denounced. Your future contributions will be automatically closed and locked.

## Reporting Bugs

Bug reports should be authored by LLPM. Use LLPM to create issues with the appropriate context:

```
"Create an issue for [describe the bug]"
```

LLPM will gather the relevant environment details, steps to reproduce, and error context automatically.

## Suggesting Features

Feature suggestions should also be authored by LLPM. Use LLPM to create the issue:

```
"Create a feature request for [describe the feature]"
```

LLPM will structure the request with the problem statement, proposed solution, and alternatives considered.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) runtime (latest version)
- Node.js 18+ (for compatibility)
- Git
- An API key for at least one AI provider (OpenAI, Anthropic, Groq, or Google Vertex AI)
- A GitHub personal access token (optional, for GitHub integration features)

### Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/your-username/llpm.git
   cd llpm
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. Run the test suite:

   ```bash
   bun run test
   ```

5. Start the application:

   ```bash
   bun run start
   ```

## Project Structure

```
src/
  commands/       Slash command implementations (/help, /model, /github, etc.)
  components/     Ink (React for CLI) UI components
  hooks/          React hooks for state management
  services/       Core services (LLM, GitHub, model registry)
  tools/          AI tools for LLM function calling
  utils/          Configuration, helpers, and shared utilities
test/             Test setup and shared mocks
```

Test files live next to the source files they test:

```
src/commands/help.ts        # Source
src/commands/help.test.ts   # Test
```

## Test-Driven Development

This project follows strict TDD. Every change to production code must be driven by a failing test.

### The Cycle

1. **RED** -- Write a failing test first
2. **GREEN** -- Write the minimum code to make it pass
3. **REFACTOR** -- Clean up while keeping tests green

### Running Tests

Use `bun run test` (not `bun test`, which invokes Bun's native test runner instead of Vitest).

```bash
bun run test              # Run all tests once
bun run test --watch      # Watch mode (keep this running)
bun run test --coverage   # Coverage report
bun run test:ui           # Browser-based test UI
```

To run a single file or filter by name:

```bash
bun run test src/commands/help.test.ts
bun run test -t "should return success"
```

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionToTest } from './moduleToTest';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle the normal case', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(() => functionToTest(null)).toThrow();
  });
});
```

Key conventions:

- Use descriptive test names that state the expected behavior
- Structure tests as Arrange, Act, Assert
- Mock external dependencies with `vi.mock()` -- never call real APIs in tests
- Clear mocks in `beforeEach` to ensure test isolation
- Test both success and error paths

### Coverage

Coverage thresholds are enforced in `vitest.config.ts`. Critical modules have per-file thresholds. Check your coverage before opening a PR:

```bash
bun run test --coverage
```

Reports are generated in `coverage/` as HTML, JSON, and LCOV.

## Code Style

### Formatting and Linting

The project uses ESLint and Prettier. Run both before committing:

```bash
bun run lint          # Check for lint errors
bun run lint:fix      # Auto-fix lint errors
bun run format        # Format with Prettier
bun run format:check  # Check formatting without writing
bun run typecheck     # TypeScript type checking
```

### Prettier Configuration

- Single quotes, semicolons, no trailing commas
- 100-character print width, 2-space indentation, LF line endings

### TypeScript Conventions

- Use `import type` for type-only imports:

  ```typescript
  import type { Message } from '../types';
  ```

- Use library types instead of defining your own -- check the library's type definitions first.
- Prefix unused parameters with an underscore (`_unused`).

### AI Tool Definitions

Tools use `inputSchema` (not `parameters`):

```typescript
export const myTool = tool({
  description: 'What the tool does',
  inputSchema: z.object({
    param: z.string().describe('What this parameter is for')
  }),
  execute: async ({ param }) => {
    // implementation
  }
});
```

Do not modify existing tool schemas when adding new tools.

## Commit Guidelines

### Commit Messages

Follow the conventional commit format:

```
type(scope): brief description

- What tests were written
- What code was added or changed
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`

### Version Bumps

This project follows semantic versioning:

- **PATCH** (0.0.x): Bug fixes, docs, small improvements
- **MINOR** (0.x.0): New features, commands, or tools (backward-compatible)
- **MAJOR** (x.0.0): Breaking changes

## Pull Request Process

1. Create a feature branch from `main`.

2. Make your changes following the TDD workflow.

3. Verify everything passes:

   ```bash
   bun run test
   bun run lint
   bun run typecheck
   ```

4. Push your branch and open a PR against `main`.

5. Fill in the PR description:
   - What the change does and why
   - How to test it
   - Any breaking changes

### What CI Checks

The GitHub Actions pipeline runs on every push and PR to `main`:

- Tests with Vitest on Ubuntu (latest Bun)
- Coverage report posted as a PR comment
- Dependency security audit

Your PR must pass all CI checks before merging.

## Getting Help

- Search [existing issues](https://github.com/britt/llpm/issues) for similar questions
- Read the [full documentation](https://britt.github.io/llpm/)
- Open an issue if you're stuck -- we're happy to help

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

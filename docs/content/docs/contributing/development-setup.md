---
title: Development Setup
weight: 1
---

Set up a local development environment for contributing to LLPM.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh) runtime (latest version)
- Node.js 18+ (for compatibility)
- Git
- An API key for at least one AI provider
- A GitHub personal access token (optional)

## Clone and Install

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/llpm.git
   cd llpm
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

## Environment Setup

Copy `.env.example` and edit `.env` to add API keys.

```bash
cp .env.example .env
# Edit .env and add API keys
```

## Verify Setup

Run the test suite to ensure everything is working:

```bash
bun run test
```

Start the application in development mode:

```bash
bun run start
```

You should see the LLPM welcome screen and prompt.

## Development Scripts

| Script | Description |
|--------|-------------|
| `bun run start` | Start LLPM in development mode |
| `bun run test` | Run the test suite once |
| `bun run test --watch` | Run tests in watch mode |
| `bun run test --coverage` | Run tests with coverage report |
| `bun run test:ui` | Open Vitest UI |
| `bun run lint` | Check for linting errors |
| `bun run lint:fix` | Fix auto-fixable linting errors |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run format` | Format code with Prettier |

## Pre-commit Checklist

Before submitting a pull request, ensure:

1. All tests pass: `bun run test`
2. No linting errors: `bun run lint`
3. Types check correctly: `bun run typecheck`
4. Code is formatted: `bun run format`
5. Coverage meets thresholds: `bun run test --coverage`

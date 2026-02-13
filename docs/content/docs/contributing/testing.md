---
title: Testing
weight: 2
---

LLPM uses [Vitest](https://vitest.dev/) for testing, with a strong emphasis on Test-Driven Development (TDD) practices.

## Running Tests

| Command | Description |
|---------|-------------|
| `bun run test` | Run the test suite once |
| `bun run test --watch` | Run tests in watch mode |
| `bun run test --coverage` | Run tests with coverage report |
| `bun run test:ui` | Open the Vitest UI for interactive testing |

`bun run test` is used instead of `bun test`, because `bun test` invokes Bun's native test runner rather than Vitest.

## Test File Conventions

Test files are co-located with their source files:

- **Location**: Same directory as the source file
- **Naming**: `<filename>.test.ts` or `<filename>.spec.ts`
- **Example**: `src/commands/help.ts` -> `src/commands/help.test.ts`

## Test Structure

Tests follow a consistent structure using Vitest's `describe` and `it` blocks:

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

- Use descriptive test names
- Structure tests as Arrange, Act, Assert
- Mock external dependencies with `vi.mock()` and avoid real API calls
- Clear mocks in `beforeEach` for isolation
- Test both success and error paths

## Coverage Requirements

Coverage thresholds are enforced in `vitest.config.ts`, and some modules have per-file thresholds.

Run `bun run test --coverage` to generate a coverage report.

## TDD Workflow

Follow the Red-Green-Refactor cycle:

1. **Write a failing test** - Define the expected behavior
2. **Run the test** - Verify it fails for the right reason
3. **Write minimal code** - Just enough to make the test pass
4. **Run the test** - Verify it passes
5. **Refactor** - Clean up while keeping tests green
6. **Repeat** - Continue for the next feature or behavior

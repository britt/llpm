---
title: Testing
weight: 2
---

LLPM uses [Vitest](https://vitest.dev/) for testing, with a strong emphasis on Test-Driven Development (TDD) practices.

## Running Tests

| Command | Description |
|---------|-------------|
| `bun run test` | Run the test suite once |
| `bun run test:watch` | Run tests in watch mode (recommended during development) |
| `bun run test:coverage` | Run tests with coverage report |
| `bun run test:ui` | Open the Vitest UI for interactive testing |

## Test File Conventions

Test files are co-located with their source files:

- **Location**: Same directory as the source file
- **Naming**: `<filename>.test.ts` or `<filename>.spec.ts`
- **Example**: `src/utils/config.ts` -> `src/utils/config.test.ts`

## Test Structure

Tests follow a consistent structure using Vitest's `describe` and `it` blocks:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return expected result for valid input', () => {
    const result = myFunction('valid input');
    expect(result).toBe('expected output');
  });

  it('should throw error for invalid input', () => {
    expect(() => myFunction('')).toThrow('Invalid input');
  });

  it('should handle edge cases correctly', () => {
    const result = myFunction(null);
    expect(result).toBeNull();
  });
});
```

## Coverage Requirements

LLPM maintains strict coverage thresholds:

| Metric | Minimum Coverage |
|--------|-----------------|
| Lines | 90%+ |
| Functions | 90%+ |
| Branches | 85%+ |
| Statements | 90%+ |

Run `bun run test:coverage` to verify coverage meets these thresholds.

## TDD Workflow

Follow the Red-Green-Refactor cycle:

1. **Write a failing test** - Define the expected behavior
2. **Run the test** - Verify it fails for the right reason
3. **Write minimal code** - Just enough to make the test pass
4. **Run the test** - Verify it passes
5. **Refactor** - Clean up while keeping tests green
6. **Repeat** - Continue for the next feature or behavior

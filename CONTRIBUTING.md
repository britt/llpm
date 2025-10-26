# Contributing to LLPM

Thank you for your interest in contributing to LLPM! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- [Bun](https://bun.com) runtime (latest version recommended)
- Node.js 18+ (for compatibility)
- Git

### Getting Started

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/llpm.git
   cd llpm
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env and add at least one AI provider API key
   ```

4. **Run tests to ensure everything works**

   ```bash
   bun test
   ```

5. **Start the application**
   ```bash
   bun start
   ```

## Testing Guidelines

LLPM uses [Vitest](https://vitest.dev/) for testing with comprehensive coverage requirements.

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage report
bun test:coverage

# Run tests with UI
bun test:ui
```

### Writing Tests

#### Test File Conventions

- **Location**: Place test files next to the source files they test
- **Naming**: Use `.test.ts` or `.test.tsx` extensions
- **Structure**: Follow the pattern `ModuleName.test.ts`

#### Test Structure

```typescript
import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionToTest } from './moduleToTest';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionToTest', () => {
    it('should behave correctly in normal case', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge cases', () => {
      const result = functionToTest('');
      expect(result).toBe('edge case output');
    });

    it('should throw error for invalid input', () => {
      expect(() => functionToTest(null)).toThrow('Expected error message');
    });
  });
});
```

#### Test Categories

1. **Unit Tests**: Test individual functions and modules in isolation
2. **Integration Tests**: Test multiple modules working together
3. **Component Tests**: Test React components with proper setup
4. **Performance Tests**: Test performance characteristics where relevant

#### Best Practices

- **Meaningful Test Names**: Use descriptive test names that explain the expected behavior
- **Arrange, Act, Assert**: Structure tests clearly with setup, execution, and verification phases
- **Test Edge Cases**: Include tests for empty inputs, null values, and boundary conditions
- **Mock External Dependencies**: Use `vi.mock()` to isolate units under test
- **Clean Up**: Use `beforeEach` and `afterEach` to ensure test isolation

#### Example Test Patterns

**Command Tests:**

```typescript
describe('helpCommand', () => {
  it('should have correct name and description', () => {
    expect(helpCommand.name).toBe('help');
    expect(helpCommand.description).toBe('Show available commands');
  });

  it('should return success result with help content', () => {
    const result = helpCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Available Commands:');
  });
});
```

**Async Function Tests:**

```typescript
describe('asyncFunction', () => {
  it('should handle successful operation', async () => {
    const result = await asyncFunction('valid input');

    expect(result).toEqual(expectedResult);
  });

  it('should handle errors gracefully', async () => {
    await expect(asyncFunction('invalid')).rejects.toThrow('Expected error');
  });
});
```

### Coverage Requirements

LLPM maintains high test coverage standards:

- **Global Minimum**: 70% coverage (lines, functions, branches, statements)
- **Command Modules**: 80% coverage (critical CLI functionality)
- **Core Utilities**: 95% coverage (foundational code like system prompt handling)

#### Coverage Reports

Coverage reports are generated automatically:

- **Terminal**: Summary displayed after running tests with coverage
- **HTML**: Detailed report in `coverage/index.html`
- **JSON/LCOV**: Machine-readable formats for CI integration

#### Coverage Thresholds

The build will fail if coverage falls below configured thresholds. To check current coverage:

```bash
bun test:coverage
```

### Mocking Guidelines

#### File System Operations

```typescript
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn()
}));
```

#### External APIs

```typescript
vi.mock('../services/api', () => ({
  fetchData: vi.fn().mockResolvedValue(mockData)
}));
```

#### Environment Variables

```typescript
beforeEach(() => {
  process.env.TEST_VAR = 'test-value';
});

afterEach(() => {
  delete process.env.TEST_VAR;
});
```

## Code Quality

### Linting and Formatting

```bash
# Check code style
bun run lint

# Fix code style issues
bun run lint:fix

# Check formatting
bun run format:check

# Format code
bun run format

# Type checking
bun run typecheck
```

### Pre-commit Checklist

Before submitting a pull request:

1. ✅ All tests pass: `bun test`
2. ✅ Coverage thresholds met: `bun test:coverage`
3. ✅ No linting errors: `bun run lint`
4. ✅ Code is formatted: `bun run format`
5. ✅ Type checking passes: `bun run typecheck`
6. ✅ Manual testing completed

## Continuous Integration

### GitHub Actions

The CI pipeline runs automatically on push and pull requests:

1. **Multi-platform testing**: Ubuntu, macOS, Windows
2. **Multiple Node versions**: 18.x, 20.x, 22.x
3. **Coverage reporting**: Uploaded to Codecov
4. **Quality checks**: Linting, formatting, type checking
5. **Security audit**: Dependency vulnerability scanning

### Coverage Integration

- Coverage reports are uploaded to [Codecov](https://codecov.io)
- Pull requests show coverage diff
- Build fails if coverage drops below thresholds

## Module-Specific Testing

### Commands (`src/commands/`)

- Test command execution with various arguments
- Test error handling and edge cases
- Verify command metadata (name, description)
- Mock external dependencies (file system, APIs)

### Services (`src/services/`)

- Mock external API calls
- Test configuration handling
- Test error scenarios and retries
- Verify data transformation logic

### Tools (`src/tools/`)

- Test tool execution with sample inputs
- Mock external integrations (GitHub, etc.)
- Test validation logic
- Verify error handling

### Utilities (`src/utils/`)

- Test pure functions thoroughly
- Test file system operations with mocks
- Test configuration parsing
- Verify error handling and edge cases

## Performance Testing

For performance-critical components:

```typescript
it('should handle large datasets efficiently', () => {
  const startTime = performance.now();

  processLargeDataset(largeTestData);

  const duration = performance.now() - startTime;
  expect(duration).toBeLessThan(1000); // 1 second threshold
});
```

## Debugging Tests

### Common Issues

1. **Test Isolation**: Use `beforeEach`/`afterEach` to reset state
2. **Async Testing**: Always await async operations
3. **Mock Cleanup**: Clear mocks between tests
4. **Environment**: Ensure test environment matches expectations

### Debugging Tools

```bash
# Run specific test file
bun test src/commands/help.test.ts

# Run tests with debug output
bun test --reporter=verbose

# Run single test
bun test -t "specific test name"

# UI debugging
bun test:ui
```

## Getting Help

- **Documentation**: Check existing tests for patterns and examples
- **Issues**: Search existing issues for similar problems
- **Discussions**: Use GitHub discussions for questions
- **Code Review**: Request feedback on your approach

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names (e.g., `feature/add-tests-for-commands`)
2. **Commit Messages**: Write clear, descriptive commit messages
3. **Test Coverage**: Ensure new code is well-tested
4. **Documentation**: Update relevant documentation
5. **Code Review**: Respond to feedback constructively

Thank you for contributing to LLPM! Your efforts help make the project better for everyone.

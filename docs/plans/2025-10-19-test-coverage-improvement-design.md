# Test Coverage Improvement Plan

**Date:** October 19, 2025
**Status:** Approved Design
**Target:** 80% overall statement coverage across the project
**Strategy:** Critical path first, unit-test focused, minimal mocking

## Executive Summary

This plan improves LLPM's test coverage from 31.61% to 80%+ overall statement coverage through systematic testing of critical business logic, services, commands, tools, and UI components. The approach prioritizes high-value files first, uses minimal mocking with real filesystem operations, and delivers value incrementally through 4 tiers of work.

## Current State

**Coverage Metrics:**
- Statements: 31.61%
- Branches: 73.78%
- Functions: 43.78%

**Key Observations:**
- Branch coverage is already good (73.78%)
- Many critical files have 0% coverage (useChat.ts, ChatInterface.tsx, github.ts)
- Some files have partial coverage (systemPrompt.ts: 94.95%, chatHistory.ts: 70.37%)

## Goals & Success Criteria

### Quantitative Goals
- ✅ Overall statement coverage: 31.61% → 80%+
- ✅ Tier 1 files (critical core): 0-5% → 85%+
- ✅ Tier 2 files (high-value services): <40% → 80%+
- ✅ Tier 3 files (commands & tools): <40% → 75%+
- ✅ Tier 4 files (supporting components): 0% → 70%+
- ✅ All tests passing in CI
- ✅ Test suite runs in <5 minutes

### Qualitative Goals
- Tests document expected behavior
- Mocks are minimal and realistic
- Tests catch real bugs (not just for coverage)
- Easy to understand and maintain
- Fast enough for TDD workflow

## File Prioritization

### Tier 1 - Critical Core (Target: 85%+ coverage)

**Priority:** Highest - Ship first

1. **src/hooks/useChat.ts** (0% → 85%)
   - Lines: 467
   - Impact: Core conversation management, most critical business logic
   - Scope: Message handling, queue management, tool execution lifecycle

2. **src/services/llm.ts** (4.7% → 85%)
   - Lines: 214
   - Impact: LLM provider abstraction and tool calling
   - Scope: Request formatting, response parsing, streaming

3. **src/components/ChatInterface.tsx** (0% → 85%)
   - Lines: 385
   - Impact: Main UI component, user interaction entry point
   - Scope: Rendering, event handling, keyboard shortcuts

### Tier 2 - High-Value Services (Target: 80%+ coverage)

**Priority:** High - Ship second

4. **src/services/github.ts** (0.87% → 80%)
   - Lines: 1061
   - Impact: GitHub API integration
   - Scope: Issues, PRs, repositories, error handling

5. **src/utils/projectConfig.ts** (36.15% → 80%)
   - Lines: 464
   - Impact: Project configuration management
   - Scope: CRUD operations, validation, persistence

6. **src/utils/chatHistory.ts** (70.37% → 80%)
   - Lines: 250
   - Impact: Conversation persistence
   - Scope: Message storage, retrieval, trimming

### Tier 3 - Commands & Tools (Target: 75%+ coverage)

**Priority:** Medium - Ship third

7-10. **Command handlers:**
   - src/commands/model.ts (2.96% → 75%)
   - src/commands/project.ts (15.4% → 75%)
   - src/commands/credentials.ts (2.25% → 75%)
   - src/commands/notes.ts (3.44% → 75%)

11-15. **Tool definitions:**
   - src/tools/projectTools.ts (24.86% → 75%)
   - src/tools/notesTools.ts (20.22% → 75%)
   - src/tools/githubTools.ts (31.96% → 75%)
   - src/tools/githubIssueTools.ts (56.46% → 75%)
   - src/tools/githubPullRequestTools.ts (52.83% → 75%)

### Tier 4 - Supporting Components (Target: 70%+ coverage)

**Priority:** Lower - Ship last

16-20. **UI components:**
   - src/components/HybridInput.tsx (0% → 70%)
   - src/components/ModelSelector.tsx (0% → 70%)
   - src/components/ProjectSelector.tsx (0% → 70%)
   - src/components/NotesSelector.tsx (0% → 70%)
   - src/components/RequestLogDisplay.tsx (0% → 70%)

## Testing Strategy by File Type

### Hooks (useChat.ts)

**Mock:**
- AI SDK functions (generateText, streamText)
- Tool registry

**Real:**
- Message state management
- Queue logic
- History trimming

**Test Approach:**
- State machine testing - verify transitions between idle/loading/processing states
- Focus on message flow, lifecycle events, error recovery

**Key Scenarios:**
- Tool calls and execution
- Streaming responses
- Error recovery
- Message history trimming
- Queue overflow handling

### Services (llm.ts, github.ts)

**Mock:**
- Only external HTTP calls (OpenAI, Anthropic, GitHub REST APIs)

**Real:**
- Request formatting
- Response parsing
- Error handling logic

**Test Approach:**
- Contract testing with mocked HTTP responses
- Verify correct API interaction patterns

**Key Scenarios:**
- Success cases with various response formats
- API errors (404, 500, rate limiting)
- Timeout handling
- Retry logic
- Partial/malformed responses

### Components (ChatInterface.tsx, HybridInput.tsx)

**Mock:**
- Only external service calls

**Real:**
- Ink rendering
- Event handling
- State management

**Test Approach:**
- React Testing Library with ink-testing-library
- Focus on user interactions and visual output

**Key Scenarios:**
- User interactions (typing, shortcuts)
- Loading states
- Error displays
- Selector navigation
- Message rendering

### Commands (project.ts, model.ts, etc.)

**Mock:**
- External APIs (GitHub, LLM services)
- External services

**Real:**
- Filesystem operations (use `/tmp/llpm-test-<uuid>/`)
- All command logic
- Argument parsing

**Test Approach:**
- Integration testing with real filesystem, mocked external calls
- Create temp dir in beforeEach, clean up in afterEach

**Key Scenarios:**
- Valid command execution
- Invalid arguments
- Help text generation
- Filesystem operations (create, read, update, delete)
- API integration points
- Error messages

**Cleanup:**
- `rm -rf` temp directory after each test
- Ensure no test pollution

### Tools (projectTools.ts, githubTools.ts, etc.)

**Mock:**
- Only external APIs (GitHub, web services, LLM providers)

**Real:**
- Zod validation
- Tool execution logic
- Filesystem operations (with /tmp)

**Test Approach:**
- Contract tests ensuring AI SDK compatibility
- Real filesystem for file operations

**Key Scenarios:**
- Valid inputs matching Zod schema
- Schema violations (invalid inputs)
- Execution errors
- Return value formats (must match AI SDK expectations)

### Utils (projectConfig.ts, chatHistory.ts, etc.)

**Mock:**
- Database connections if needed
- External APIs

**Real:**
- Business logic
- Data transformations
- Filesystem operations (with /tmp)

**Test Approach:**
- Pure function testing where possible
- Focus on edge cases and error conditions

**Key Scenarios:**
- Valid inputs
- Edge cases (empty, null, undefined, boundary values)
- Error conditions
- Data transformation correctness

## Test Infrastructure

### Test Helpers (test/helpers/)

Create reusable utilities:

1. **createTempDir()**
   - Generate unique `/tmp/llpm-test-<uuid>/`
   - Return path and cleanup function
   - Automatic cleanup in afterEach if not called

2. **mockLLMResponse()**
   - Standard AI SDK response mocking
   - Support for streaming and non-streaming
   - Configurable tool calls

3. **mockGitHubAPI()**
   - GitHub REST API response fixtures
   - Common scenarios (issues, PRs, repos)
   - Error responses

4. **renderChatInterface()**
   - Wrapper for Ink component testing
   - Standard props and utilities
   - Helper assertions for Ink output

5. **waitForState()**
   - Wait for hook state changes
   - Timeout after reasonable period
   - Useful for async state updates

### Test Fixtures (test/fixtures/)

Standard test data:

1. **messages.ts**
   - Sample message objects (user, assistant, system)
   - Various tool call scenarios
   - Edge cases (empty, very long)

2. **projects.ts**
   - Sample project configurations
   - With/without GitHub repos
   - Various edge cases

3. **apiResponses.ts**
   - Mock API response data
   - GitHub, OpenAI, Anthropic responses
   - Success and error cases

4. **toolSchemas.ts**
   - Sample tool definitions
   - Valid and invalid schemas
   - Edge cases

### Mock Setup (test/mocks/)

Extend existing mocks:

1. **bun-sqlite.js** (already exists)
   - Extend as needed for new test scenarios

2. **ai-sdk.ts** (new)
   - Mock generateText/streamText
   - Support tool calls
   - Configurable responses

3. **octokit.ts** (new)
   - Mock GitHub API client
   - Standard response patterns
   - Error scenarios

## Error Handling & Edge Cases

### Critical Error Scenarios

**useChat.ts:**
- AI SDK stream failures mid-response
- Tool execution throwing errors
- Database write failures during message save
- Queue overflow scenarios
- Race conditions (multiple tools called simultaneously)

**Service Layer:**
- Network timeouts and retries
- Rate limiting responses (429)
- Invalid API responses (malformed JSON)
- Authentication failures
- Partial data from streaming APIs

**Commands:**
- Invalid arguments / missing required params
- Filesystem permission errors
- Concurrent file access
- Config file corruption
- Missing dependencies

**Components:**
- Empty message lists
- Very long messages (truncation)
- Rapid user input (debouncing)
- Terminal resize during render
- Keyboard shortcut conflicts

### Edge Case Coverage Strategy

Test boundary values and edge cases:
- Boundary values (0, -1, MAX_INT)
- Empty/null/undefined inputs
- Malformed data structures
- Unicode/emoji in text fields
- Very large datasets (performance)

### Error Testing Approach

- Every error path gets explicit test case
- Use `expect().rejects.toThrow()` for async errors
- Verify error messages are user-friendly
- Test cleanup happens even when errors occur
- Verify state recovery after errors

## CI/CD Integration

### Coverage Enforcement

Update GitHub Actions workflow:

1. **Coverage Thresholds:**
   - Fail PR if overall coverage drops below 80%
   - Fail PR if any Tier 1 file drops below 85%
   - Fail PR if any Tier 2 file drops below 80%

2. **Reporting:**
   - Generate coverage report as PR comment
   - Show coverage diff (before/after)
   - Track coverage trends over time

3. **Per-File Thresholds (vitest.config.ts):**
```typescript
thresholds: {
  global: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },
  // Tier 1 - Critical Core
  'src/hooks/useChat.ts': {
    statements: 85,
    branches: 85,
    functions: 85,
    lines: 85
  },
  'src/services/llm.ts': {
    statements: 85,
    branches: 85,
    functions: 85,
    lines: 85
  },
  'src/components/ChatInterface.tsx': {
    statements: 85,
    branches: 85,
    functions: 85,
    lines: 85
  },
  // Tier 2 - High-Value Services
  'src/services/github.ts': {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  },
  // ... additional thresholds
}
```

### Test Performance

1. **Parallel Execution:**
   - Already configured in vitest.config.ts
   - Continue using thread pool

2. **Timeouts:**
   - 30s per test (existing)
   - 5min total suite
   - Fail fast on first error in CI

3. **Caching:**
   - Cache node_modules
   - Cache Bun dependencies
   - Cache test database fixtures

### Quality Gates

All PRs must pass:
- ✅ All tests passing
- ✅ No skipped tests in Tier 1/2 files
- ✅ Coverage thresholds met
- ✅ TypeScript compilation succeeds
- ✅ No linting errors

## Work Breakdown & Timeline

### Week 1: Tier 1 + Infrastructure
**Goal:** 85%+ coverage for critical core

- **Day 1-2:** Test infrastructure setup
  - Create test helpers (createTempDir, mockLLMResponse, etc.)
  - Set up fixtures (messages, projects, apiResponses)
  - Create AI SDK and GitHub mocks

- **Day 3-4:** useChat.ts comprehensive tests
  - State machine testing
  - Message flow scenarios
  - Tool execution lifecycle
  - Error handling

- **Day 5:** llm.ts comprehensive tests
  - Request/response handling
  - Streaming tests
  - Error scenarios

- **Weekend/Day 6-7:** ChatInterface.tsx tests
  - Rendering tests
  - User interaction tests
  - Keyboard shortcuts
  - Error states

**Deliverable:** PR #1 - Tier 1 Coverage + Test Infrastructure

### Week 2: Tier 2
**Goal:** 80%+ coverage for high-value services

- **Day 1-3:** github.ts comprehensive tests
  - Issues, PRs, repos operations
  - Error handling
  - Rate limiting

- **Day 4:** projectConfig.ts tests
  - CRUD operations
  - Validation
  - Filesystem operations

- **Day 5:** chatHistory.ts tests
  - Message persistence
  - Retrieval
  - Trimming logic

**Deliverable:** PR #2 - Tier 2 Coverage

### Week 3: Tier 3
**Goal:** 75%+ coverage for commands & tools

- **Day 1-2:** Command tests (model, project, credentials, notes)
  - Argument parsing
  - Command execution
  - Filesystem operations with /tmp
  - Error messages

- **Day 3-5:** Tool tests (projectTools, notesTools, githubTools, etc.)
  - Zod schema validation
  - Tool execution
  - Return format verification
  - Error handling

**Deliverable:** PR #3 - Tier 3 Coverage

### Week 4: Tier 4 + Cleanup
**Goal:** 70%+ coverage for supporting components

- **Day 1-3:** UI component tests
  - HybridInput, selectors, displays
  - User interactions
  - Edge cases

- **Day 4:** Coverage gap analysis
  - Identify remaining gaps
  - Prioritize critical missing coverage
  - Fill high-value gaps

- **Day 5:** Documentation & cleanup
  - Update CONTRIBUTING.md with testing patterns
  - Document test utilities
  - Clean up any test code duplication

**Deliverable:** PR #4 - Tier 4 Coverage + Cleanup

## Maintenance Plan

### Ongoing Practices

1. **New Code Requirements:**
   - All new code requires tests (enforced by coverage thresholds)
   - Tests written before or alongside implementation (TDD encouraged)

2. **Regular Reviews:**
   - Quarterly coverage review
   - Identify and remove flaky tests
   - Update mocks for API changes

3. **Pattern Documentation:**
   - Document testing patterns in CONTRIBUTING.md
   - Update test utilities as patterns emerge
   - Share learnings in team discussions

4. **Continuous Improvement:**
   - Track test performance metrics
   - Optimize slow tests
   - Improve test readability

### Coverage Monitoring

- Coverage reports in every PR
- Track trends over time (coverage should not decrease)
- Alert on coverage drops
- Celebrate coverage milestones

## Risks & Mitigations

### Risk: Test Suite Becomes Too Slow

**Mitigation:**
- Monitor test execution time
- Parallelize where possible
- Keep integration tests minimal
- Profile and optimize slow tests

### Risk: Over-Mocking Creates False Confidence

**Mitigation:**
- Minimal mocking strategy (already planned)
- Use real filesystem with /tmp
- Integration tests for critical paths
- Regular manual testing

### Risk: Tests Become Maintenance Burden

**Mitigation:**
- Clear, readable test code
- Good test helpers reduce duplication
- Regular refactoring of test code
- Document testing patterns

### Risk: Coverage Without Quality

**Mitigation:**
- Focus on meaningful scenarios, not just coverage %
- Code review emphasizes test quality
- Tests should catch real bugs
- Prefer fewer good tests over many poor tests

## Conclusion

This plan systematically improves LLPM's test coverage from 31.61% to 80%+ through four tiers of work delivered incrementally over 4 weeks. The approach prioritizes critical business logic, uses minimal mocking with real filesystem operations, and establishes sustainable testing practices for ongoing development.

**Key Success Factors:**
- Critical path first (highest value delivered early)
- Minimal mocking (tests catch real bugs)
- Real filesystem operations (with /tmp cleanup)
- Incremental delivery (4 reviewable PRs)
- Sustainable practices (documented patterns, maintainable tests)

**Next Steps:**
1. Approve this design document
2. Set up git worktree for implementation
3. Create detailed implementation plan
4. Begin Week 1: Tier 1 + Infrastructure

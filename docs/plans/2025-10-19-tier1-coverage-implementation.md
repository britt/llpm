# Tier 1 Test Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve 85%+ test coverage for Tier 1 critical files (useChat.ts, llm.ts, ChatInterface.tsx) and establish reusable test infrastructure.

**Architecture:** Unit-test focused with minimal mocking. Mock only external APIs (AI SDK, GitHub). Use real filesystem operations with /tmp cleanup. Build reusable test helpers and fixtures for sustainable testing.

**Tech Stack:** Vitest, React Testing Library, ink-testing-library, Vitest mocking

---

## Task 1: Test Infrastructure - createTempDir Helper

**Files:**
- Create: `test/helpers/tempDir.ts`
- Create: `test/helpers/index.ts`
- Test: `test/helpers/tempDir.test.ts`

**Step 1: Write the failing test**

```typescript
// test/helpers/tempDir.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createTempDir } from './tempDir';
import { existsSync } from 'fs';
import { rmSync } from 'fs';

describe('createTempDir', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    // Cleanup any remaining dirs
    createdDirs.forEach(dir => {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });
    createdDirs.length = 0;
  });

  it('should create a unique temp directory', () => {
    const { path, cleanup } = createTempDir();
    createdDirs.push(path);

    expect(path).toContain('/tmp/llpm-test-');
    expect(existsSync(path)).toBe(true);

    cleanup();
    expect(existsSync(path)).toBe(false);
  });

  it('should create unique directories on multiple calls', () => {
    const { path: path1 } = createTempDir();
    const { path: path2 } = createTempDir();
    createdDirs.push(path1, path2);

    expect(path1).not.toBe(path2);
    expect(existsSync(path1)).toBe(true);
    expect(existsSync(path2)).toBe(true);
  });

  it('should handle cleanup errors gracefully', () => {
    const { path, cleanup } = createTempDir();
    createdDirs.push(path);

    // Remove dir manually
    rmSync(path, { recursive: true, force: true });

    // Should not throw
    expect(() => cleanup()).not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test test/helpers/tempDir.test.ts --run`
Expected: FAIL with "Cannot find module './tempDir'"

**Step 3: Write minimal implementation**

```typescript
// test/helpers/tempDir.ts
import { mkdirSync, rmSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

export interface TempDir {
  path: string;
  cleanup: () => void;
}

export function createTempDir(prefix = 'llpm-test'): TempDir {
  const path = `/tmp/${prefix}-${randomUUID()}`;

  mkdirSync(path, { recursive: true });

  const cleanup = () => {
    try {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    } catch (error) {
      // Gracefully handle cleanup errors
      console.warn(`Failed to cleanup temp dir ${path}:`, error);
    }
  };

  return { path, cleanup };
}
```

**Step 4: Create barrel export**

```typescript
// test/helpers/index.ts
export { createTempDir } from './tempDir';
export type { TempDir } from './tempDir';
```

**Step 5: Run test to verify it passes**

Run: `bun run test test/helpers/tempDir.test.ts --run`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add test/helpers/
git commit -m "test: add createTempDir helper for filesystem testing"
```

---

## Task 2: Test Infrastructure - AI SDK Mocks

**Files:**
- Create: `test/mocks/ai-sdk.ts`
- Test: `test/mocks/ai-sdk.test.ts`

**Step 1: Write the failing test**

```typescript
// test/mocks/ai-sdk.test.ts
import { describe, it, expect, vi } from 'vitest';
import { mockGenerateText, mockStreamText } from './ai-sdk';

describe('AI SDK Mocks', () => {
  describe('mockGenerateText', () => {
    it('should return mocked text response', async () => {
      const generateText = mockGenerateText('Hello, world!');
      const result = await generateText({
        model: 'test-model',
        prompt: 'test prompt'
      });

      expect(result.text).toBe('Hello, world!');
    });

    it('should support tool calls in response', async () => {
      const generateText = mockGenerateText('Response', {
        toolCalls: [{
          toolCallId: 'call-1',
          toolName: 'test_tool',
          args: { foo: 'bar' }
        }]
      });

      const result = await generateText({
        model: 'test-model',
        prompt: 'test'
      });

      expect(result.text).toBe('Response');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].toolName).toBe('test_tool');
    });
  });

  describe('mockStreamText', () => {
    it('should return async iterable of text chunks', async () => {
      const streamText = mockStreamText(['Hello', ' ', 'world']);
      const stream = await streamText({
        model: 'test-model',
        prompt: 'test'
      });

      const chunks: string[] = [];
      for await (const chunk of stream.textStream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' ', 'world']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test test/mocks/ai-sdk.test.ts --run`
Expected: FAIL with "Cannot find module './ai-sdk'"

**Step 3: Write minimal implementation**

```typescript
// test/mocks/ai-sdk.ts
import { vi } from 'vitest';

export interface MockGenerateTextOptions {
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
}

export function mockGenerateText(text: string, options: MockGenerateTextOptions = {}) {
  return vi.fn().mockResolvedValue({
    text,
    toolCalls: options.toolCalls || [],
    finishReason: 'stop',
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
  });
}

export function mockStreamText(chunks: string[]) {
  return vi.fn().mockResolvedValue({
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
    text: Promise.resolve(chunks.join('')),
    finishReason: Promise.resolve('stop'),
    usage: Promise.resolve({ promptTokens: 10, completionTokens: 20, totalTokens: 30 })
  });
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test test/mocks/ai-sdk.test.ts --run`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add test/mocks/ai-sdk.ts test/mocks/ai-sdk.test.ts
git commit -m "test: add AI SDK mock utilities"
```

---

## Task 3: Test Fixtures - Messages

**Files:**
- Create: `test/fixtures/messages.ts`
- Create: `test/fixtures/index.ts`

**Step 1: Create message fixtures (no test needed - just data)**

```typescript
// test/fixtures/messages.ts
import type { Message } from '../../src/types';

export const userMessage: Message = {
  id: 'msg-user-1',
  role: 'user',
  content: 'Hello, how can you help me?'
};

export const assistantMessage: Message = {
  id: 'msg-assistant-1',
  role: 'assistant',
  content: 'I can help you with various tasks. What would you like to do?'
};

export const systemMessage: Message = {
  id: 'msg-system-1',
  role: 'system',
  content: 'You are a helpful assistant.'
};

export const messageWithToolCall: Message = {
  id: 'msg-tool-1',
  role: 'assistant',
  content: '',
  toolInvocations: [{
    state: 'call',
    toolCallId: 'call-1',
    toolName: 'get_weather',
    args: { city: 'San Francisco' }
  }]
};

export const longMessage: Message = {
  id: 'msg-long-1',
  role: 'user',
  content: 'A'.repeat(10000) // 10k character message
};

export const emptyMessage: Message = {
  id: 'msg-empty-1',
  role: 'user',
  content: ''
};

export const messageWithUnicode: Message = {
  id: 'msg-unicode-1',
  role: 'user',
  content: 'Hello 👋 World 🌍 Test 🧪'
};

export const conversationHistory: Message[] = [
  systemMessage,
  userMessage,
  assistantMessage,
  {
    id: 'msg-user-2',
    role: 'user',
    content: 'Can you create a project for me?'
  },
  messageWithToolCall
];
```

**Step 2: Create barrel export**

```typescript
// test/fixtures/index.ts
export * from './messages';
```

**Step 3: Commit**

```bash
git add test/fixtures/
git commit -m "test: add message fixtures for testing"
```

---

## Task 4: Test Infrastructure - waitForState Helper

**Files:**
- Modify: `test/helpers/index.ts`
- Create: `test/helpers/waitForState.ts`
- Test: `test/helpers/waitForState.test.ts`

**Step 1: Write the failing test**

```typescript
// test/helpers/waitForState.test.ts
import { describe, it, expect, vi } from 'vitest';
import { waitForState } from './waitForState';

describe('waitForState', () => {
  it('should resolve when condition becomes true', async () => {
    let value = false;
    setTimeout(() => { value = true; }, 100);

    await waitForState(() => value === true, { timeout: 500 });
    expect(value).toBe(true);
  });

  it('should timeout if condition never becomes true', async () => {
    await expect(
      waitForState(() => false, { timeout: 100 })
    ).rejects.toThrow('Timeout waiting for state condition');
  });

  it('should use default timeout if not specified', async () => {
    const start = Date.now();

    await expect(
      waitForState(() => false)
    ).rejects.toThrow();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(3000);
    expect(elapsed).toBeLessThan(3500);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test test/helpers/waitForState.test.ts --run`
Expected: FAIL with "Cannot find module './waitForState'"

**Step 3: Write minimal implementation**

```typescript
// test/helpers/waitForState.ts
export interface WaitForStateOptions {
  timeout?: number;
  interval?: number;
}

export async function waitForState(
  condition: () => boolean,
  options: WaitForStateOptions = {}
): Promise<void> {
  const { timeout = 3000, interval = 50 } = options;
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for state condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
```

**Step 4: Update barrel export**

```typescript
// test/helpers/index.ts
export { createTempDir } from './tempDir';
export type { TempDir } from './tempDir';
export { waitForState } from './waitForState';
export type { WaitForStateOptions } from './waitForState';
```

**Step 5: Run test to verify it passes**

Run: `bun run test test/helpers/waitForState.test.ts --run`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add test/helpers/waitForState.ts test/helpers/waitForState.test.ts test/helpers/index.ts
git commit -m "test: add waitForState helper for async state testing"
```

---

## Task 5: useChat.ts Tests - Message State Management

**Files:**
- Create: `src/hooks/useChat.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/useChat.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import { userMessage, assistantMessage } from '../../test/fixtures';

// Mock dependencies
vi.mock('../services/llm');
vi.mock('../tools/registry');
vi.mock('../utils/chatHistory');

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message State Management', () => {
    it('should initialize with empty messages', () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should add user message when sendMessage is called', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        result.current.sendMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello'
      });
    });

    it('should trim whitespace from user messages', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        result.current.sendMessage('  Hello  ');
      });

      expect(result.current.messages[0].content).toBe('Hello');
    });

    it('should not add empty messages', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/hooks/useChat.test.ts --run`
Expected: Tests run but likely fail due to unmocked dependencies

**Step 3: Add proper mocks and verify baseline**

```typescript
// Add to top of src/hooks/useChat.test.ts after imports
vi.mock('../services/llm', () => ({
  generateResponse: vi.fn().mockResolvedValue({
    text: 'Mocked response',
    toolCalls: []
  })
}));

vi.mock('../tools/registry', () => ({
  getToolRegistry: vi.fn().mockReturnValue({})
}));

vi.mock('../utils/chatHistory', () => ({
  saveChatHistory: vi.fn().mockResolvedValue(undefined),
  loadChatHistory: vi.fn().mockResolvedValue([])
}));
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/hooks/useChat.test.ts --run`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/hooks/useChat.test.ts
git commit -m "test: add useChat message state management tests"
```

---

## Task 6: useChat.ts Tests - Loading State

**Files:**
- Modify: `src/hooks/useChat.test.ts`

**Step 1: Add loading state tests**

```typescript
// Add to src/hooks/useChat.test.ts

describe('Loading State', () => {
  it('should set isLoading to true while processing message', async () => {
    const { result } = renderHook(() => useChat());

    let loadingDuringProcess = false;

    act(() => {
      result.current.sendMessage('Hello');
      loadingDuringProcess = result.current.isLoading;
    });

    expect(loadingDuringProcess).toBe(true);
  });

  it('should set isLoading to false after message processing completes', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set isLoading to false even if processing fails', async () => {
    const { llm } = await import('../services/llm');
    vi.mocked(llm.generateResponse).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      try {
        await result.current.sendMessage('Hello');
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `bun run test src/hooks/useChat.test.ts --run`
Expected: PASS (7 tests total)

**Step 3: Commit**

```bash
git add src/hooks/useChat.test.ts
git commit -m "test: add useChat loading state tests"
```

---

## Task 7: useChat.ts Tests - Message Queue

**Files:**
- Modify: `src/hooks/useChat.test.ts`

**Step 1: Add message queue tests**

```typescript
// Add to src/hooks/useChat.test.ts

describe('Message Queue', () => {
  it('should queue messages when already processing', async () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.sendMessage('First message');
      result.current.sendMessage('Second message');
      result.current.sendMessage('Third message');
    });

    expect(result.current.queuedMessages).toHaveLength(2); // First is processing, 2 queued
  });

  it('should process queued messages in order', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('First');
      result.current.sendMessage('Second');
      result.current.sendMessage('Third');
    });

    const userMessages = result.current.messages.filter(m => m.role === 'user');
    expect(userMessages[0].content).toBe('First');
    expect(userMessages[1].content).toBe('Second');
    expect(userMessages[2].content).toBe('Third');
  });

  it('should clear queue after all messages processed', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('First');
      result.current.sendMessage('Second');
    });

    expect(result.current.queuedMessages).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `bun run test src/hooks/useChat.test.ts --run`
Expected: PASS (10 tests total)

**Step 3: Commit**

```bash
git add src/hooks/useChat.test.ts
git commit -m "test: add useChat message queue tests"
```

---

## Task 8: Run Coverage and Verify Progress

**Step 1: Run coverage for useChat**

Run: `bun run test src/hooks/useChat.test.ts --coverage --run`
Expected: Coverage report showing improvement from 0%

**Step 2: Check overall coverage**

Run: `bun run test:coverage 2>&1 | grep "useChat.ts"`
Expected: See improved coverage percentage

**Step 3: Document current state**

Create a progress note (no commit needed, just awareness of where we are).

---

## Next Steps

After completing these tasks, continue with:

1. **Additional useChat tests** - Tool execution, error handling, history trimming
2. **llm.ts tests** - Request formatting, response parsing, streaming
3. **ChatInterface.tsx tests** - Rendering, user interactions, keyboard shortcuts
4. **Update vitest.config.ts** - Add coverage thresholds for tested files
5. **Create PR** - Tier 1 coverage improvements

## Notes for Implementation

- Run tests frequently (after every step)
- Keep commits small and focused
- If tests fail unexpectedly, investigate before proceeding
- Use `bun run test --watch` during development for fast feedback
- Check coverage after each major test suite addition

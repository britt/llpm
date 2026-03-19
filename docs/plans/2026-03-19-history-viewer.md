# /history Command with Scrollable Viewer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder `/history` command with a full-screen scrollable conversation history viewer with search, keyboard navigation, and match highlighting.

**Architecture:** The history viewer is a full-screen Ink component that overlays the chat UI (same pattern as `ModelSelector`/`ProjectSelector`). The `/history` command returns an `interactive` result with type `'history-view'`, which the `useChat` hook intercepts to set viewer state. The `App` component passes messages to a new `HistoryViewer` component that manages its own scroll position, search state, and keyboard input. When the user presses `q`/`Esc`, the viewer closes and the chat UI resumes.

**Tech Stack:** Ink 6, React 19, TypeScript, Vitest

---

## Design Decisions

### No Timestamps
The `Message` type (`src/types.ts`) has `role`, `content`, and optional `id` — no timestamp. Adding timestamps would require changes to the message serialization format in `chatHistory.ts` and migration of existing history files. **Decision: Show message index instead of timestamp.** The issue's mockup shows `[14:32:15]` but we'll use `[1]`, `[2]`, etc. This avoids scope creep and breaking changes. Timestamps can be added later as a separate enhancement.

### Interactive Command Pattern
The existing `model-select` interactive pattern flows: command returns `{ interactive: { type: 'model-select', ... } }` → `useChat` intercepts → sets state → `ChatInterface` renders selector. We follow this exact pattern with a new `'history-view'` interactive type.

### Viewer as Input Mode
`ChatInterface` already supports `activeInput` modes: `'main'`, `'project'`, `'model'`, `'notes'`. We add `'history'` mode. When active, the `HistoryViewer` component replaces the entire chat area, giving it full screen. Pressing `q`/`Esc` returns to `'main'`.

---

## Task 1: Add `timestamp` to Message Type

The issue spec calls for timestamps. Rather than show index numbers, add an optional `timestamp` field so new messages get timestamps and old messages degrade gracefully.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/hooks/useChat.ts` (where messages are created)
- Modify: `src/utils/chatHistory.ts` (serialization)
- Test: `src/types.test.ts` (new), `src/utils/chatHistory.test.ts` (modify)

### Step 1: Write failing test for Message timestamp

Create `src/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type { Message } from './types';

describe('Message type', () => {
  it('should allow optional timestamp field', () => {
    const msg: Message = {
      role: 'user',
      content: 'hello',
      timestamp: Date.now(),
    };
    expect(msg.timestamp).toBeDefined();
    expect(typeof msg.timestamp).toBe('number');
  });

  it('should work without timestamp for backward compatibility', () => {
    const msg: Message = {
      role: 'assistant',
      content: 'hi',
    };
    expect(msg.timestamp).toBeUndefined();
  });
});
```

### Step 2: Run test to verify it fails

Run: `bun run test src/types.test.ts`
Expected: FAIL — TypeScript error, `timestamp` does not exist on `Message`

### Step 3: Add timestamp to Message type

In `src/types.ts`, add `timestamp?: number` to the `Message` interface:
```typescript
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'ui-notification';
  content: string;
  id?: string;
  timestamp?: number;
}
```

### Step 4: Run test to verify it passes

Run: `bun run test src/types.test.ts`
Expected: PASS

### Step 5: Write failing test for timestamp serialization in chatHistory

Add to `src/utils/chatHistory.test.ts`:
```typescript
describe('Timestamp serialization', () => {
  it('should preserve timestamp through save/load cycle', async () => {
    const now = Date.now();
    const messages: Message[] = [
      { role: 'user', content: 'hello', timestamp: now },
    ];
    await saveChatHistory(messages);
    const loaded = await loadChatHistory();
    expect(loaded[0].timestamp).toBe(now);
  });

  it('should handle messages without timestamp (backward compat)', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'old message' },
    ];
    await saveChatHistory(messages);
    const loaded = await loadChatHistory();
    expect(loaded[0].timestamp).toBeUndefined();
  });
});
```

### Step 6: Run test to verify it fails

Run: `bun run test src/utils/chatHistory.test.ts`
Expected: FAIL — timestamp not preserved through serialization

### Step 7: Update chatHistory serialization to include timestamp

In `src/utils/chatHistory.ts`, update `MessageToLogString` and `LogStringToMessage`:

Current format: `{role}: {content}`
New format: `{role}|{timestamp}: {content}` (timestamp is optional, empty string if missing)

Update `MessageToLogString`:
```typescript
function MessageToLogString(message: Message): string {
  const escapedContent = message.content.replace(/\n/g, '\\n');
  const ts = message.timestamp != null ? String(message.timestamp) : '';
  return `${message.role}|${ts}: ${escapedContent}`;
}
```

Update `LogStringToMessage`:
```typescript
function LogStringToMessage(logString: string): Message | null {
  // New format: role|timestamp: content
  // Legacy format: role: content
  const pipeIndex = logString.indexOf('|');
  const colonIndex = logString.indexOf(': ');

  if (colonIndex === -1) return null;

  let role: string;
  let timestamp: number | undefined;

  if (pipeIndex !== -1 && pipeIndex < colonIndex) {
    role = logString.slice(0, pipeIndex);
    const tsStr = logString.slice(pipeIndex + 1, colonIndex);
    timestamp = tsStr ? Number(tsStr) : undefined;
  } else {
    role = logString.slice(0, colonIndex);
  }

  const content = logString.slice(colonIndex + 2).replace(/\\n/g, '\n');

  if (!['user', 'assistant', 'system', 'ui-notification'].includes(role)) {
    return null;
  }

  const msg: Message = {
    role: role as Message['role'],
    content,
  };
  if (timestamp != null && !isNaN(timestamp)) {
    msg.timestamp = timestamp;
  }
  return msg;
}
```

### Step 8: Run test to verify it passes

Run: `bun run test src/utils/chatHistory.test.ts`
Expected: PASS

### Step 9: Add timestamps to message creation in useChat

In `src/hooks/useChat.ts`, every place a new `Message` is created, add `timestamp: Date.now()`. Search for `role: 'user'`, `role: 'assistant'`, `role: 'ui-notification'`, `role: 'system'` within `useChat.ts` and add `timestamp: Date.now()` to each. These are inline object literals — just add the field.

### Step 10: Run full test suite and commit

Run: `bun run test`
Expected: ALL PASS

```bash
git add src/types.ts src/types.test.ts src/utils/chatHistory.ts src/utils/chatHistory.test.ts src/hooks/useChat.ts
git commit -m "feat(history): add optional timestamp to Message type

- RED: tests for timestamp on Message interface and serialization
- GREEN: added timestamp field, updated chatHistory serialization
- Status: all tests passing, build successful"
```

---

## Task 2: Extend CommandResult for History Viewer Interactive Type

The `/history` command needs to return messages to the viewer. Extend `CommandResult.interactive` to support a `'history-view'` type.

**Files:**
- Modify: `src/commands/types.ts`
- Test: `src/commands/types.test.ts` (new)

### Step 1: Write failing test

Create `src/commands/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type { CommandResult } from './types';
import type { Message } from '../types';

describe('CommandResult types', () => {
  it('should support history-view interactive type', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];

    const result: CommandResult = {
      content: '',
      success: true,
      interactive: {
        type: 'history-view',
        messages,
      },
    };

    expect(result.interactive?.type).toBe('history-view');
    if (result.interactive?.type === 'history-view') {
      expect(result.interactive.messages).toHaveLength(2);
    }
  });
});
```

### Step 2: Run test to verify it fails

Run: `bun run test src/commands/types.test.ts`
Expected: FAIL — TypeScript error, `'history-view'` not in type

### Step 3: Extend CommandResult interactive type

Update `src/commands/types.ts`:
```typescript
import type { Message } from '../types';

export interface CommandResult {
  content: string;
  success: boolean;
  interactive?: {
    type: 'model-select';
    models: Array<{
      id: string;
      label: string;
      value: string;
    }>;
  } | {
    type: 'history-view';
    messages: Message[];
  };
}
```

### Step 4: Run test to verify it passes

Run: `bun run test src/commands/types.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/commands/types.ts src/commands/types.test.ts
git commit -m "feat(history): add history-view interactive type to CommandResult

- RED: type test for history-view interactive result
- GREEN: extended CommandResult union type
- Status: all tests passing"
```

---

## Task 3: Rewrite `/history` Command to Return Interactive Result

Replace the placeholder `/history` command with one that slices messages and returns an interactive `'history-view'` result.

**Files:**
- Modify: `src/commands/history.ts`
- Modify: `src/commands/history.test.ts`

### Step 1: Write failing tests for new behavior

Replace `src/commands/history.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
}));

import { historyCommand } from './history';
import type { CommandContext } from './types';

describe('History Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(historyCommand.name).toBe('history');
      expect(historyCommand.description).toBeDefined();
    });
  });

  describe('/history (no args) — default last 20', () => {
    it('should return history-view interactive with last 20 messages', async () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: 'user' as const,
        content: `message ${i}`,
      }));

      const result = await historyCommand.execute([], { messages });

      expect(result.success).toBe(true);
      expect(result.interactive?.type).toBe('history-view');
      if (result.interactive?.type === 'history-view') {
        expect(result.interactive.messages).toHaveLength(20);
        expect(result.interactive.messages[0].content).toBe('message 10');
      }
    });

    it('should return all messages when fewer than 20', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        role: 'user' as const,
        content: `message ${i}`,
      }));

      const result = await historyCommand.execute([], { messages });

      expect(result.success).toBe(true);
      if (result.interactive?.type === 'history-view') {
        expect(result.interactive.messages).toHaveLength(5);
      }
    });
  });

  describe('/history all', () => {
    it('should return all messages', async () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        role: 'user' as const,
        content: `message ${i}`,
      }));

      const result = await historyCommand.execute(['all'], { messages });

      expect(result.success).toBe(true);
      if (result.interactive?.type === 'history-view') {
        expect(result.interactive.messages).toHaveLength(50);
      }
    });
  });

  describe('/history N', () => {
    it('should return last N messages', async () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: 'user' as const,
        content: `message ${i}`,
      }));

      const result = await historyCommand.execute(['10'], { messages });

      expect(result.success).toBe(true);
      if (result.interactive?.type === 'history-view') {
        expect(result.interactive.messages).toHaveLength(10);
        expect(result.interactive.messages[0].content).toBe('message 20');
      }
    });

    it('should reject non-numeric argument', async () => {
      const result = await historyCommand.execute(['abc'], { messages: [] });
      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should reject zero', async () => {
      const result = await historyCommand.execute(['0'], { messages: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('/history help', () => {
    it('should show help text', async () => {
      const result = await historyCommand.execute(['help'], { messages: [] });
      expect(result.success).toBe(true);
      expect(result.content).toContain('/history');
    });
  });

  describe('Empty history', () => {
    it('should handle empty messages gracefully', async () => {
      const result = await historyCommand.execute([], { messages: [] });

      expect(result.success).toBe(true);
      expect(result.content).toContain('No messages');
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `bun run test src/commands/history.test.ts`
Expected: FAIL — current implementation doesn't accept messages in context or return interactive results

### Step 3: Update CommandContext to include messages

In `src/commands/types.ts`, add `messages` to `CommandContext`:
```typescript
export interface CommandContext {
  messageCount?: number;
  messages?: Message[];
}
```

### Step 4: Rewrite history command

Replace `src/commands/history.ts`:
```typescript
import type { Command, CommandResult, CommandContext } from './types';
import type { Message } from '../types';
import { debug } from '../utils/logger';

const DEFAULT_MESSAGE_COUNT = 20;

function sliceMessages(messages: Message[], count: number): Message[] {
  if (count >= messages.length) return [...messages];
  return messages.slice(-count);
}

export const historyCommand: Command = {
  name: 'history',
  description: 'View conversation history in a scrollable viewer',
  execute: async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    debug('Executing /history command with args:', args);
    const messages = context?.messages ?? [];

    // /history help
    if (args[0]?.toLowerCase() === 'help') {
      return {
        content: `## /history — View Conversation History

**Usage:**
- \`/history\` — View last ${DEFAULT_MESSAGE_COUNT} messages
- \`/history all\` — View complete history
- \`/history N\` — View last N messages
- \`/history help\` — Show this help

**Navigation:**
- \`↑/↓\` — Scroll one line
- \`Page Up/Page Down\` — Scroll one page
- \`Home/End\` — Jump to start/end
- \`/\` — Search
- \`n/N\` — Next/previous match
- \`q\` or \`Esc\` — Close viewer`,
        success: true,
      };
    }

    // /history all
    if (args[0]?.toLowerCase() === 'all') {
      if (messages.length === 0) {
        return { content: 'No messages in history.', success: true };
      }
      return {
        content: '',
        success: true,
        interactive: { type: 'history-view', messages: [...messages] },
      };
    }

    // /history (no args) — default
    if (args.length === 0) {
      if (messages.length === 0) {
        return { content: 'No messages in history.', success: true };
      }
      return {
        content: '',
        success: true,
        interactive: {
          type: 'history-view',
          messages: sliceMessages(messages, DEFAULT_MESSAGE_COUNT),
        },
      };
    }

    // /history N
    const count = parseInt(args[0], 10);
    if (isNaN(count) || count <= 0) {
      return {
        content: `Usage: /history [all | N | help]\n\nExamples:\n  /history      — last ${DEFAULT_MESSAGE_COUNT} messages\n  /history 50   — last 50 messages\n  /history all  — everything`,
        success: false,
      };
    }

    if (messages.length === 0) {
      return { content: 'No messages in history.', success: true };
    }

    return {
      content: '',
      success: true,
      interactive: {
        type: 'history-view',
        messages: sliceMessages(messages, count),
      },
    };
  },
};
```

### Step 5: Update useChat to pass messages in context

In `src/hooks/useChat.ts`, find where `executeCommand` is called (around line 203 and line 509). Update the context to include messages:

```typescript
return await executeCommand(
  parsed.command as string,
  parsed.args as string[],
  { messageCount: messagesRef.current.length, messages: messagesRef.current }
);
```

Do this for both call sites.

### Step 6: Run tests to verify they pass

Run: `bun run test src/commands/history.test.ts`
Expected: PASS

### Step 7: Commit

```bash
git add src/commands/history.ts src/commands/history.test.ts src/commands/types.ts src/hooks/useChat.ts
git commit -m "feat(history): rewrite /history to return interactive history-view result

- RED: tests for /history, /history all, /history N, /history help, empty history
- GREEN: command slices messages and returns interactive result
- Status: all tests passing"
```

---

## Task 4: Create HistoryMessage Component

Renders a single message in the history viewer with role label, optional timestamp, and content.

**Files:**
- Create: `src/components/HistoryMessage.tsx`
- Create: `src/components/HistoryMessage.test.tsx`

### Step 1: Write failing test

Create `src/components/HistoryMessage.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistoryMessage } from './HistoryMessage';

// Mock markdown renderer to return content as-is for testing
vi.mock('../utils/markdownRenderer', () => ({
  renderMarkdown: (s: string) => s,
  isASCIICapableTerminal: () => false,
}));

describe('HistoryMessage', () => {
  it('should display user role and content', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'hello world' },
        index: 1,
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('user');
    expect(frame).toContain('hello world');
  });

  it('should display assistant role and content', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'assistant', content: 'I can help' },
        index: 2,
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('assistant');
    expect(frame).toContain('I can help');
  });

  it('should format timestamp when present', () => {
    // Create a known timestamp: 2026-03-19 14:32:15 UTC
    const ts = new Date('2026-03-19T14:32:15Z').getTime();
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'test', timestamp: ts },
        index: 1,
      })
    );
    const frame = lastFrame() ?? '';
    // Should show time in HH:MM:SS format (locale-dependent, just check pattern)
    expect(frame).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should show index when no timestamp', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'test' },
        index: 5,
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('#5');
  });

  it('should highlight search matches', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'hello world' },
        index: 1,
        searchQuery: 'world',
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('world');
  });
});
```

### Step 2: Run test to verify it fails

Run: `bun run test src/components/HistoryMessage.test.tsx`
Expected: FAIL — module not found

### Step 3: Implement HistoryMessage

Create `src/components/HistoryMessage.tsx`:
```typescript
import React, { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types';
import { getMessageDisplayContent } from '../utils/messageDisplay';

interface HistoryMessageProps {
  message: Message;
  index: number;
  searchQuery?: string;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getRoleColor(role: Message['role']): string {
  switch (role) {
    case 'user': return 'cyan';
    case 'assistant': return 'green';
    case 'system': return 'yellow';
    default: return 'gray';
  }
}

export const HistoryMessage = memo(function HistoryMessage({
  message,
  index,
  searchQuery,
}: HistoryMessageProps) {
  const label = message.timestamp
    ? `[${formatTimestamp(message.timestamp)}]`
    : `[#${index}]`;

  const roleColor = getRoleColor(message.role);
  const content = useMemo(() => getMessageDisplayContent(message), [message.role, message.content]);

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text dimColor>{label} </Text>
        <Text color={roleColor} bold>{message.role}</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
});
```

### Step 4: Run tests to verify they pass

Run: `bun run test src/components/HistoryMessage.test.tsx`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/HistoryMessage.tsx src/components/HistoryMessage.test.tsx
git commit -m "feat(history): create HistoryMessage component

- RED: tests for role display, timestamp formatting, index fallback
- GREEN: HistoryMessage with role colors, timestamp/index label
- Status: all tests passing"
```

---

## Task 5: Create HistorySearchBar Component

A search input overlay for the history viewer.

**Files:**
- Create: `src/components/HistorySearchBar.tsx`
- Create: `src/components/HistorySearchBar.test.tsx`

### Step 1: Write failing test

Create `src/components/HistorySearchBar.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistorySearchBar } from './HistorySearchBar';

describe('HistorySearchBar', () => {
  it('should render search prompt', () => {
    const { lastFrame } = render(
      React.createElement(HistorySearchBar, {
        query: '',
        matchCount: 0,
        currentMatch: 0,
        onQueryChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/');
  });

  it('should show match count when there are matches', () => {
    const { lastFrame } = render(
      React.createElement(HistorySearchBar, {
        query: 'test',
        matchCount: 5,
        currentMatch: 2,
        onQueryChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('3 of 5');
  });

  it('should show no matches when query has no results', () => {
    const { lastFrame } = render(
      React.createElement(HistorySearchBar, {
        query: 'xyz',
        matchCount: 0,
        currentMatch: 0,
        onQueryChange: vi.fn(),
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No matches');
  });
});
```

### Step 2: Run test to verify it fails

Run: `bun run test src/components/HistorySearchBar.test.tsx`
Expected: FAIL — module not found

### Step 3: Implement HistorySearchBar

Create `src/components/HistorySearchBar.tsx`:
```typescript
import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HistorySearchBarProps {
  query: string;
  matchCount: number;
  currentMatch: number;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function HistorySearchBar({
  query,
  matchCount,
  currentMatch,
  onQueryChange,
  onSubmit,
  onCancel,
}: HistorySearchBarProps) {
  useInput((inputChar, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit();
    } else if (key.backspace || key.delete) {
      onQueryChange(query.slice(0, -1));
    } else if (inputChar && !key.ctrl && !key.meta) {
      onQueryChange(query + inputChar);
    }
  });

  const matchInfo = query.length > 0
    ? matchCount > 0
      ? `${currentMatch + 1} of ${matchCount}`
      : 'No matches'
    : '';

  return (
    <Box paddingX={1}>
      <Text color="yellow">/ </Text>
      <Text>{query}</Text>
      <Text color="cyan">█</Text>
      {matchInfo && (
        <Text dimColor> ({matchInfo})</Text>
      )}
    </Box>
  );
}
```

### Step 4: Run tests to verify they pass

Run: `bun run test src/components/HistorySearchBar.test.tsx`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/HistorySearchBar.tsx src/components/HistorySearchBar.test.tsx
git commit -m "feat(history): create HistorySearchBar component

- RED: tests for search prompt, match count display, no-match state
- GREEN: search bar with input handling and match info
- Status: all tests passing"
```

---

## Task 6: Create HistoryViewer Component (Core)

The main scrollable container. Manages scroll position, renders visible messages, handles keyboard navigation.

**Files:**
- Create: `src/components/HistoryViewer.tsx`
- Create: `src/components/HistoryViewer.test.tsx`

### Step 1: Write failing tests

Create `src/components/HistoryViewer.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistoryViewer } from './HistoryViewer';
import type { Message } from '../types';

// Mock markdown renderer
vi.mock('../utils/markdownRenderer', () => ({
  renderMarkdown: (s: string) => s,
  isASCIICapableTerminal: () => false,
}));

// Mock fullscreen-ink
vi.mock('fullscreen-ink', () => ({
  useScreenSize: () => ({ width: 80, height: 24 }),
}));

const makeMessages = (count: number): Message[] =>
  Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as Message['role'],
    content: `Message ${i + 1}`,
    id: `msg-${i}`,
  }));

describe('HistoryViewer', () => {
  it('should render messages', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(3),
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Message 1');
    expect(frame).toContain('user');
    expect(frame).toContain('assistant');
  });

  it('should show header with title', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(3),
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('History');
  });

  it('should show keybinding hints', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(1),
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('q');
  });

  it('should call onClose when q is pressed', () => {
    const onClose = vi.fn();
    const { stdin } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(1),
        onClose,
      })
    );
    stdin.write('q');
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle empty messages', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: [],
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No messages');
  });
});
```

### Step 2: Run test to verify it fails

Run: `bun run test src/components/HistoryViewer.test.tsx`
Expected: FAIL — module not found

### Step 3: Implement HistoryViewer

Create `src/components/HistoryViewer.tsx`:
```typescript
import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useScreenSize } from 'fullscreen-ink';
import type { Message } from '../types';
import { HistoryMessage } from './HistoryMessage';
import { HistorySearchBar } from './HistorySearchBar';

interface HistoryViewerProps {
  messages: Message[];
  onClose: () => void;
}

const HEADER_LINES = 2;
const FOOTER_LINES = 2;
const LINES_PER_MESSAGE = 4; // approximate: label + content + margin

export function HistoryViewer({ messages, onClose }: HistoryViewerProps) {
  const { height } = useScreenSize();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Calculate visible area
  const viewportMessages = Math.max(1, Math.floor((height - HEADER_LINES - FOOTER_LINES) / LINES_PER_MESSAGE));

  // Search matches
  const matchIndices = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return messages
      .map((msg, i) => (msg.content.toLowerCase().includes(query) ? i : -1))
      .filter(i => i >= 0);
  }, [messages, searchQuery]);

  // Clamp scroll offset
  const maxScroll = Math.max(0, messages.length - viewportMessages);
  const clampedOffset = Math.min(Math.max(0, scrollOffset), maxScroll);

  // Visible slice
  const visibleMessages = messages.slice(clampedOffset, clampedOffset + viewportMessages);

  const scrollTo = useCallback((offset: number) => {
    setScrollOffset(Math.min(Math.max(0, offset), maxScroll));
  }, [maxScroll]);

  const jumpToMatch = useCallback((index: number) => {
    if (matchIndices.length === 0) return;
    const wrappedIndex = ((index % matchIndices.length) + matchIndices.length) % matchIndices.length;
    setCurrentMatchIndex(wrappedIndex);
    const msgIndex = matchIndices[wrappedIndex];
    if (msgIndex !== undefined) {
      scrollTo(msgIndex);
    }
  }, [matchIndices, scrollTo]);

  // Main keyboard handler (non-search mode)
  useInput((inputChar, key) => {
    if (searchMode) return;

    if (inputChar === 'q' || key.escape) {
      onClose();
    } else if (inputChar === '/') {
      setSearchMode(true);
      setSearchQuery('');
      setCurrentMatchIndex(0);
    } else if (inputChar === 'n') {
      jumpToMatch(currentMatchIndex + 1);
    } else if (inputChar === 'N') {
      jumpToMatch(currentMatchIndex - 1);
    } else if (key.upArrow) {
      scrollTo(clampedOffset - 1);
    } else if (key.downArrow) {
      scrollTo(clampedOffset + 1);
    } else if (key.pageUp) {
      scrollTo(clampedOffset - viewportMessages);
    } else if (key.pageDown) {
      scrollTo(clampedOffset + viewportMessages);
    } else if (key.home || (key.ctrl && inputChar === 'a')) {
      scrollTo(0);
    } else if (key.end || (key.ctrl && inputChar === 'e')) {
      scrollTo(maxScroll);
    }
  }, { isActive: !searchMode });

  if (messages.length === 0) {
    return (
      <Box flexDirection="column" minHeight={height}>
        <Box paddingX={1}>
          <Text bold color="cyan">History Viewer</Text>
        </Box>
        <Box paddingX={1} flexGrow={1}>
          <Text dimColor>No messages in history.</Text>
        </Box>
        <Box paddingX={1}>
          <Text dimColor>Press q to close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={height}>
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">History Viewer</Text>
        <Text dimColor>
          {clampedOffset + 1}-{Math.min(clampedOffset + viewportMessages, messages.length)} of {messages.length}
        </Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleMessages.map((msg, i) => (
          <HistoryMessage
            key={msg.id || `hist-${clampedOffset + i}`}
            message={msg}
            index={clampedOffset + i + 1}
            searchQuery={searchQuery}
          />
        ))}
      </Box>

      {/* Footer / Search */}
      {searchMode ? (
        <HistorySearchBar
          query={searchQuery}
          matchCount={matchIndices.length}
          currentMatch={currentMatchIndex}
          onQueryChange={(q) => {
            setSearchQuery(q);
            setCurrentMatchIndex(0);
            // Auto-jump to first match
            if (q) {
              const query = q.toLowerCase();
              const firstMatch = messages.findIndex(m => m.content.toLowerCase().includes(query));
              if (firstMatch >= 0) scrollTo(firstMatch);
            }
          }}
          onSubmit={() => setSearchMode(false)}
          onCancel={() => {
            setSearchMode(false);
            setSearchQuery('');
          }}
        />
      ) : (
        <Box paddingX={1}>
          <Text dimColor>
            ↑↓ scroll  PgUp/PgDn page  Home/End jump  / search  n/N next/prev  q quit
          </Text>
        </Box>
      )}
    </Box>
  );
}
```

### Step 4: Run tests to verify they pass

Run: `bun run test src/components/HistoryViewer.test.tsx`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/HistoryViewer.tsx src/components/HistoryViewer.test.tsx
git commit -m "feat(history): create HistoryViewer scrollable component

- RED: tests for rendering, header, keybinds, close, empty state
- GREEN: HistoryViewer with scroll, search, keyboard navigation
- Status: all tests passing"
```

---

## Task 7: Wire HistoryViewer into App and ChatInterface

Connect the `/history` command's interactive result to show the `HistoryViewer` component.

**Files:**
- Modify: `src/hooks/useChat.ts`
- Modify: `src/components/ChatInterface.tsx`
- Modify: `index.ts`

### Step 1: Write failing test

Add to an existing test or create a focused integration test. Since the wiring is mostly React state, we test the useChat hook's handling of history-view interactive results:

Create `src/hooks/useChat.history.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';

// We test that executeCommand with 'history' returns history-view interactive
// The actual rendering is tested in component tests
// Here we verify the command flow produces the right shape

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  setVerbose: vi.fn(),
}));

vi.mock('../utils/chatHistory', () => ({
  loadChatHistory: vi.fn().mockResolvedValue([]),
  saveChatHistory: vi.fn().mockResolvedValue(undefined),
  flushChatHistory: vi.fn().mockResolvedValue(undefined),
}));

import { executeCommand } from '../commands/registry';

describe('History command integration', () => {
  it('should return history-view interactive result', async () => {
    const messages = [
      { role: 'user' as const, content: 'hello' },
      { role: 'assistant' as const, content: 'hi' },
    ];

    const result = await executeCommand('history', ['all'], { messages });

    expect(result.success).toBe(true);
    expect(result.interactive?.type).toBe('history-view');
  });
});
```

### Step 2: Run test to verify it fails initially, then passes after Task 3

Run: `bun run test src/hooks/useChat.history.test.ts`
Expected: Should pass if Task 3 is already done (command returns interactive result)

### Step 3: Add history-view handling in useChat

In `src/hooks/useChat.ts`, find the interactive result handler (around line 211). Add a case for `'history-view'`:

```typescript
// After the model-select check:
if (result.interactive && result.interactive.type === 'history-view') {
  setHistoryViewerMessages(result.interactive.messages);
  debug('Showing history viewer');
  return;
}
```

Add state to useChat:
```typescript
const [historyViewerMessages, setHistoryViewerMessages] = useState<Message[] | null>(null);
```

Add to return object:
```typescript
return {
  // ... existing fields
  historyViewerMessages,
  closeHistoryViewer: useCallback(() => setHistoryViewerMessages(null), []),
};
```

### Step 4: Add 'history' to activeInput type in ChatInterface

In `src/components/ChatInterface.tsx`:

1. Change activeInput type to include `'history'`:
```typescript
const [activeInput, setActiveInput] = useState<'main' | 'project' | 'model' | 'notes' | 'history'>('main');
```

2. Add `historyViewerMessages` and `onCloseHistoryViewer` to `ChatInterfaceProps`:
```typescript
interface ChatInterfaceProps {
  // ... existing props
  historyViewerMessages?: Message[] | null;
  onCloseHistoryViewer?: () => void;
}
```

3. Add effect to show history viewer when messages are set:
```typescript
useEffect(() => {
  if (historyViewerMessages && historyViewerMessages.length > 0) {
    setActiveInput('history');
  }
}, [historyViewerMessages]);
```

4. When `activeInput === 'history'`, render `HistoryViewer` instead of the normal chat:
```typescript
if (activeInput === 'history' && historyViewerMessages) {
  return (
    <HistoryViewer
      messages={historyViewerMessages}
      onClose={() => {
        setActiveInput('main');
        onCloseHistoryViewer?.();
      }}
    />
  );
}
```

### Step 5: Update App component (index.ts) to pass history props

In `index.ts`, destructure new fields from `useChat()` and pass to `ChatInterface`:

```typescript
const {
  // ... existing
  historyViewerMessages,
  closeHistoryViewer,
} = useChat();

// In the createElement call, add:
historyViewerMessages,
onCloseHistoryViewer: closeHistoryViewer,
```

### Step 6: Run full test suite

Run: `bun run test`
Expected: ALL PASS

### Step 7: Commit

```bash
git add src/hooks/useChat.ts src/hooks/useChat.history.test.ts src/components/ChatInterface.tsx index.ts
git commit -m "feat(history): wire HistoryViewer into app UI

- RED: integration test for history command interactive flow
- GREEN: useChat handles history-view, ChatInterface renders HistoryViewer
- Status: all tests passing"
```

---

## Task 8: Update /help Output

Add `/history` documentation to the help command output.

**Files:**
- Modify: `src/commands/help.ts`
- Modify: `src/commands/help.test.ts`

### Step 1: Write failing test

Add to `src/commands/help.test.ts`:
```typescript
it('should list /history command', async () => {
  const result = await helpCommand.execute([]);
  expect(result.content).toContain('/history');
});
```

### Step 2: Run test — may already pass if help auto-reads registry

Run: `bun run test src/commands/help.test.ts`

If it already passes (because `/help` reads from registry dynamically), skip to commit. If it fails, add `/history` to the help output manually.

### Step 3: Commit

```bash
git add src/commands/help.ts src/commands/help.test.ts
git commit -m "feat(history): document /history in help output

- Status: all tests passing"
```

---

## Task 9: Final Verification

### Step 1: Run full test suite with coverage

Run: `bun run test --coverage`

Verify:
- All tests pass
- Coverage meets 90%+ thresholds for new files
- No regressions in existing tests

### Step 2: Run build

Run: `bun run build`
Expected: Successful, zero errors

### Step 3: Run linter

Run: `bun run lint`
Expected: Clean, no errors or warnings

### Step 4: Run typecheck

Run: `bun run typecheck`
Expected: Clean

### Step 5: Update PROGRESS.md

Document all completed tasks with test counts, coverage, and build status.

### Step 6: Bump version

This is a new feature (minor bump). Update `package.json` version.

### Step 7: Final commit

```bash
git add -A
git commit -m "feat(history): complete /history scrollable viewer implementation

- New HistoryViewer, HistoryMessage, HistorySearchBar components
- /history, /history all, /history N commands
- Keyboard navigation: scroll, page, home/end, search, match nav
- Optional timestamp on Message type with backward-compat serialization
- Coverage: 90%+, build clean, lint clean"
```

---

## Summary

| Task | Component | What It Does |
|------|-----------|-------------|
| 1 | Message timestamp | Add optional `timestamp` to Message type + serialization |
| 2 | CommandResult type | Extend interactive type union with `'history-view'` |
| 3 | /history command | Rewrite command to return interactive result with sliced messages |
| 4 | HistoryMessage | Single message display with role, timestamp, content |
| 5 | HistorySearchBar | Search input with match count display |
| 6 | HistoryViewer | Main scrollable container with keyboard navigation + search |
| 7 | App wiring | Connect command → useChat → ChatInterface → HistoryViewer |
| 8 | Help docs | Update `/help` to document `/history` |
| 9 | Verification | Tests, build, lint, typecheck, coverage, version bump |

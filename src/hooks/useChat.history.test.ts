import { describe, it, expect, vi } from 'vitest';

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  setVerbose: vi.fn(),
  getVerbose: vi.fn().mockReturnValue(false),
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

  it('should return non-interactive result for empty history', async () => {
    const result = await executeCommand('history', [], { messages: [] });
    expect(result.success).toBe(true);
    expect(result.interactive).toBeUndefined();
    expect(result.content).toContain('No messages');
  });
});

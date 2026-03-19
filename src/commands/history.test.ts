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
        expect(result.interactive.messages[0]!.content).toBe('message 10');
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
        expect(result.interactive.messages[0]!.content).toBe('message 20');
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

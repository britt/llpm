/**
 * HistoryViewer Tests
 *
 * Tests the scroll, search, and viewport logic without rendering with ink.
 * Rendering tests are not included due to yoga-layout WASM compilation issues in CI.
 */

import { describe, it, expect } from 'vitest';
import type { Message } from '../types';

// Replicate core logic from HistoryViewer for testing

const HEADER_LINES = 2;
const FOOTER_LINES = 2;
const LINES_PER_MESSAGE = 4;

function calcViewportMessages(height: number): number {
  return Math.max(1, Math.floor((height - HEADER_LINES - FOOTER_LINES) / LINES_PER_MESSAGE));
}

function calcMaxScroll(messageCount: number, viewportMessages: number): number {
  return Math.max(0, messageCount - viewportMessages);
}

function clampOffset(offset: number, maxScroll: number): number {
  return Math.min(Math.max(0, offset), maxScroll);
}

function findMatchIndices(messages: Message[], searchQuery: string): number[] {
  if (!searchQuery) return [];
  const query = searchQuery.toLowerCase();
  return messages
    .map((msg, i) => (msg.content.toLowerCase().includes(query) ? i : -1))
    .filter(i => i >= 0);
}

function getVisibleSlice(messages: Message[], offset: number, count: number): Message[] {
  return messages.slice(offset, offset + count);
}

const makeMessages = (count: number): Message[] =>
  Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as Message['role'],
    content: `Message ${i + 1}`,
    id: `msg-${i}`,
  }));

describe('HistoryViewer Logic', () => {
  describe('viewport calculation', () => {
    it('should calculate viewport messages from terminal height', () => {
      // height=24, header=2, footer=2, linesPerMsg=4 → (24-4)/4 = 5
      expect(calcViewportMessages(24)).toBe(5);
    });

    it('should return minimum 1 for very small terminals', () => {
      expect(calcViewportMessages(4)).toBe(1);
      expect(calcViewportMessages(1)).toBe(1);
    });

    it('should handle large terminals', () => {
      expect(calcViewportMessages(100)).toBe(24);
    });
  });

  describe('scroll clamping', () => {
    it('should clamp negative offsets to 0', () => {
      expect(clampOffset(-5, 10)).toBe(0);
    });

    it('should clamp offsets above max to max', () => {
      expect(clampOffset(15, 10)).toBe(10);
    });

    it('should pass through valid offsets unchanged', () => {
      expect(clampOffset(5, 10)).toBe(5);
    });

    it('should handle maxScroll of 0', () => {
      expect(clampOffset(0, 0)).toBe(0);
      expect(clampOffset(5, 0)).toBe(0);
    });
  });

  describe('max scroll calculation', () => {
    it('should compute correct max scroll', () => {
      // 20 messages, viewport shows 5 → max scroll = 15
      expect(calcMaxScroll(20, 5)).toBe(15);
    });

    it('should return 0 when messages fit in viewport', () => {
      expect(calcMaxScroll(3, 5)).toBe(0);
    });

    it('should return 0 for empty messages', () => {
      expect(calcMaxScroll(0, 5)).toBe(0);
    });
  });

  describe('search matching', () => {
    it('should find matching message indices', () => {
      const messages = makeMessages(5);
      // Messages: "Message 1", "Message 2", ..., "Message 5"
      const indices = findMatchIndices(messages, 'message 3');
      expect(indices).toEqual([2]);
    });

    it('should be case insensitive', () => {
      const messages = makeMessages(3);
      const indices = findMatchIndices(messages, 'MESSAGE');
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should return empty array for no query', () => {
      const messages = makeMessages(3);
      expect(findMatchIndices(messages, '')).toEqual([]);
    });

    it('should return empty array for no matches', () => {
      const messages = makeMessages(3);
      expect(findMatchIndices(messages, 'nonexistent')).toEqual([]);
    });

    it('should find multiple matches', () => {
      const messages: Message[] = [
        { role: 'user', content: 'hello world' },
        { role: 'assistant', content: 'hi there' },
        { role: 'user', content: 'hello again' },
      ];
      const indices = findMatchIndices(messages, 'hello');
      expect(indices).toEqual([0, 2]);
    });
  });

  describe('visible slice', () => {
    it('should return correct slice of messages', () => {
      const messages = makeMessages(10);
      const visible = getVisibleSlice(messages, 3, 4);
      expect(visible).toHaveLength(4);
      expect(visible[0]!.content).toBe('Message 4');
      expect(visible[3]!.content).toBe('Message 7');
    });

    it('should handle offset at end of messages', () => {
      const messages = makeMessages(10);
      const visible = getVisibleSlice(messages, 8, 5);
      expect(visible).toHaveLength(2); // Only 2 messages left
    });

    it('should handle empty messages', () => {
      const visible = getVisibleSlice([], 0, 5);
      expect(visible).toHaveLength(0);
    });
  });
});

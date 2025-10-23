import { describe, it, expect } from 'vitest';
import { countMessageLines, filterMessagesByLines } from './messageLineCounter';
import type { Message } from '../types';

describe('messageLineCounter', () => {
  describe('countMessageLines', () => {
    it('should count lines correctly with newlines', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Line 1\nLine 2\nLine 3\n'
      };
      expect(countMessageLines(message)).toBe(3);
    });

    it('should count lines correctly without trailing newline', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Line 1\nLine 2\nLine 3'
      };
      expect(countMessageLines(message)).toBe(3);
    });

    it('should count single line without newline', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Single line'
      };
      expect(countMessageLines(message)).toBe(1);
    });

    it('should count single line with newline', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Single line\n'
      };
      expect(countMessageLines(message)).toBe(1);
    });

    it('should return 0 for empty content', () => {
      const message: Message = {
        id: '1',
        role: 'user',
        content: ''
      };
      expect(countMessageLines(message)).toBe(0);
    });
  });

  describe('filterMessagesByLines', () => {
    const createMessage = (id: string, content: string): Message => ({
      id,
      role: 'user',
      content
    });

    it('should return all messages when total lines <= maxLines', () => {
      const messages = [
        createMessage('1', 'Line 1'),
        createMessage('2', 'Line 2'),
        createMessage('3', 'Line 3')
      ];

      const result = filterMessagesByLines(messages, 10);

      expect(result.visibleMessages).toHaveLength(3);
      expect(result.hiddenLinesCount).toBe(0);
      expect(result.totalLines).toBe(3);
    });

    it('should filter messages to fit within line limit', () => {
      const messages = [
        createMessage('1', 'Line 1\nLine 2'),     // 2 lines
        createMessage('2', 'Line 3\nLine 4'),     // 2 lines
        createMessage('3', 'Line 5\nLine 6')      // 2 lines
      ];

      const result = filterMessagesByLines(messages, 4);

      expect(result.visibleMessages).toHaveLength(2);  // Last 2 messages = 4 lines
      expect(result.visibleMessages[0].id).toBe('2');
      expect(result.visibleMessages[1].id).toBe('3');
      expect(result.hiddenLinesCount).toBe(2);
      expect(result.totalLines).toBe(6);
    });

    it('should return only messages that completely fit within limit', () => {
      const messages = [
        createMessage('1', 'Line 1\nLine 2\nLine 3'),  // 3 lines
        createMessage('2', 'Line 4\nLine 5'),          // 2 lines
        createMessage('3', 'Line 6')                   // 1 line
      ];

      const result = filterMessagesByLines(messages, 3);

      // Message 2 (2 lines) + Message 3 (1 line) = 3 lines
      expect(result.visibleMessages).toHaveLength(2);
      expect(result.visibleMessages[0].id).toBe('2');
      expect(result.visibleMessages[1].id).toBe('3');
      expect(result.hiddenLinesCount).toBe(3);
      expect(result.totalLines).toBe(6);
    });

    it('should handle maxLines = 0 by returning all messages', () => {
      const messages = [
        createMessage('1', 'Line 1'),
        createMessage('2', 'Line 2')
      ];

      const result = filterMessagesByLines(messages, 0);

      expect(result.visibleMessages).toHaveLength(2);
      expect(result.hiddenLinesCount).toBe(0);
    });

    it('should handle negative maxLines by returning all messages', () => {
      const messages = [
        createMessage('1', 'Line 1'),
        createMessage('2', 'Line 2')
      ];

      const result = filterMessagesByLines(messages, -5);

      expect(result.visibleMessages).toHaveLength(2);
      expect(result.hiddenLinesCount).toBe(0);
    });

    it('should handle empty message array', () => {
      const result = filterMessagesByLines([], 10);

      expect(result.visibleMessages).toHaveLength(0);
      expect(result.hiddenLinesCount).toBe(0);
      expect(result.totalLines).toBe(0);
    });

    it('should handle single message exceeding limit', () => {
      const messages = [
        createMessage('1', 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5')  // 5 lines
      ];

      const result = filterMessagesByLines(messages, 3);

      // Can't fit the message, so nothing is shown
      expect(result.visibleMessages).toHaveLength(0);
      expect(result.hiddenLinesCount).toBe(5);
      expect(result.totalLines).toBe(5);
    });

    it('should calculate correct line counts with mixed line endings', () => {
      const messages = [
        createMessage('1', 'Line 1\nLine 2\n'),   // 2 lines (trailing newline)
        createMessage('2', 'Line 3\nLine 4')      // 2 lines (no trailing newline)
      ];

      const result = filterMessagesByLines(messages, 10);

      expect(result.totalLines).toBe(4);
      expect(result.visibleMessages).toHaveLength(2);
    });
  });
});

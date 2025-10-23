import { describe, it, expect, beforeEach } from 'vitest';
import { ChatRenderBuffer } from './chatRenderBuffer';

describe('ChatRenderBuffer', () => {
  let buffer: ChatRenderBuffer;

  beforeEach(() => {
    buffer = new ChatRenderBuffer();
  });

  describe('append', () => {
    it('should append text to the buffer', () => {
      buffer.append('Line 1\n');
      buffer.append('Line 2\n');

      expect(buffer.getFullText()).toBe('Line 1\nLine 2\n');
      expect(buffer.getTotalLines()).toBe(2);
    });

    it('should handle multiple appends correctly', () => {
      buffer.append('Line 1\n');
      buffer.append('Line 2\n');
      buffer.append('Line 3\n');

      expect(buffer.getTotalLines()).toBe(3);
    });

    it('should handle appends without newlines', () => {
      buffer.append('Line 1');
      expect(buffer.getTotalLines()).toBe(1);

      buffer.append('\nLine 2');
      expect(buffer.getTotalLines()).toBe(2);
    });
  });

  describe('setText', () => {
    it('should replace existing content', () => {
      buffer.append('Old content\n');
      buffer.setText('New content\n');

      expect(buffer.getFullText()).toBe('New content\n');
      expect(buffer.getTotalLines()).toBe(1);
    });

    it('should update line count when setting text', () => {
      buffer.setText('Line 1\nLine 2\nLine 3\n');

      expect(buffer.getTotalLines()).toBe(3);
    });
  });

  describe('getTail', () => {
    beforeEach(() => {
      // Create buffer with 10 lines
      const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
      buffer.setText(lines.join('\n'));
    });

    it('should return all lines when maxLines >= total lines', () => {
      const result = buffer.getTail(10);

      expect(result.hiddenLinesCount).toBe(0);
      expect(result.totalLines).toBe(10);
      expect(result.text).toBe(buffer.getFullText());
    });

    it('should return all lines when maxLines > total lines', () => {
      const result = buffer.getTail(20);

      expect(result.hiddenLinesCount).toBe(0);
      expect(result.totalLines).toBe(10);
      expect(result.text).toBe(buffer.getFullText());
    });

    it('should return only last N lines when maxLines < total lines', () => {
      const result = buffer.getTail(3);

      expect(result.hiddenLinesCount).toBe(7);
      expect(result.totalLines).toBe(10);
      expect(result.text).toBe('Line 8\nLine 9\nLine 10');
    });

    it('should return everything when maxLines is 0', () => {
      const result = buffer.getTail(0);

      expect(result.hiddenLinesCount).toBe(0);
      expect(result.totalLines).toBe(10);
      expect(result.text).toBe(buffer.getFullText());
    });

    it('should return everything when maxLines is negative', () => {
      const result = buffer.getTail(-5);

      expect(result.hiddenLinesCount).toBe(0);
      expect(result.totalLines).toBe(10);
      expect(result.text).toBe(buffer.getFullText());
    });

    it('should handle single line tail request', () => {
      const result = buffer.getTail(1);

      expect(result.hiddenLinesCount).toBe(9);
      expect(result.totalLines).toBe(10);
      expect(result.text).toBe('Line 10');
    });

    it('should handle buffer with trailing newline', () => {
      buffer.setText('Line 1\nLine 2\nLine 3\n');
      const result = buffer.getTail(2);

      expect(result.hiddenLinesCount).toBe(1);
      expect(result.totalLines).toBe(3);
      expect(result.text).toBe('Line 2\nLine 3\n');
    });

    it('should handle buffer without trailing newline', () => {
      buffer.setText('Line 1\nLine 2\nLine 3');
      const result = buffer.getTail(2);

      expect(result.hiddenLinesCount).toBe(1);
      expect(result.totalLines).toBe(3);
      expect(result.text).toBe('Line 2\nLine 3');
    });
  });

  describe('getFullText', () => {
    it('should return the complete text content', () => {
      buffer.append('Line 1\n');
      buffer.append('Line 2\n');

      expect(buffer.getFullText()).toBe('Line 1\nLine 2\n');
    });

    it('should return empty string for empty buffer', () => {
      expect(buffer.getFullText()).toBe('');
    });
  });

  describe('getTotalLines', () => {
    it('should return 0 for empty buffer', () => {
      expect(buffer.getTotalLines()).toBe(0);
    });

    it('should count lines correctly with newlines', () => {
      buffer.setText('Line 1\nLine 2\nLine 3\n');
      expect(buffer.getTotalLines()).toBe(3);
    });

    it('should count lines correctly without trailing newline', () => {
      buffer.setText('Line 1\nLine 2\nLine 3');
      expect(buffer.getTotalLines()).toBe(3);
    });

    it('should count single line without newline', () => {
      buffer.setText('Single line');
      expect(buffer.getTotalLines()).toBe(1);
    });

    it('should count single line with newline', () => {
      buffer.setText('Single line\n');
      expect(buffer.getTotalLines()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all content and reset line count', () => {
      buffer.append('Line 1\n');
      buffer.append('Line 2\n');
      buffer.clear();

      expect(buffer.getFullText()).toBe('');
      expect(buffer.getTotalLines()).toBe(0);
    });

    it('should allow adding content after clear', () => {
      buffer.append('Old content\n');
      buffer.clear();
      buffer.append('New content\n');

      expect(buffer.getFullText()).toBe('New content\n');
      expect(buffer.getTotalLines()).toBe(1);
    });
  });

  describe('performance with large transcripts', () => {
    it('should handle 5000+ line transcripts efficiently', () => {
      const lines = Array.from({ length: 5000 }, (_, i) => `Line ${i + 1}`);
      const largeText = lines.join('\n');

      const startTime = Date.now();
      buffer.setText(largeText);
      const tailResult = buffer.getTail(300);
      const endTime = Date.now();

      expect(tailResult.totalLines).toBe(5000);
      expect(tailResult.hiddenLinesCount).toBe(4700);

      // Should complete in reasonable time (< 100ms)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should handle streaming appends efficiently', () => {
      const startTime = Date.now();

      // Simulate streaming 1000 token appends
      for (let i = 0; i < 1000; i++) {
        buffer.append(`Token ${i} `);
        if (i % 50 === 0) buffer.append('\n');
      }

      const tailResult = buffer.getTail(10);
      const endTime = Date.now();

      expect(tailResult.totalLines).toBeGreaterThan(0);

      // Should complete in reasonable time (< 200ms)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      buffer.setText('');
      expect(buffer.getTotalLines()).toBe(0);

      const result = buffer.getTail(10);
      expect(result.text).toBe('');
      expect(result.hiddenLinesCount).toBe(0);
    });

    it('should handle strings with only newlines', () => {
      buffer.setText('\n\n\n');
      expect(buffer.getTotalLines()).toBe(3);
    });

    it('should handle very long single line', () => {
      const longLine = 'x'.repeat(10000);
      buffer.setText(longLine);

      expect(buffer.getTotalLines()).toBe(1);
      const result = buffer.getTail(1);
      expect(result.text).toBe(longLine);
    });

    it('should handle mixed line endings (just \\n)', () => {
      buffer.setText('Line 1\nLine 2\nLine 3');
      const result = buffer.getTail(2);

      expect(result.totalLines).toBe(3);
      expect(result.text).toBe('Line 2\nLine 3');
    });
  });
});

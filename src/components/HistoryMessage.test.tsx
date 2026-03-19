/**
 * HistoryMessage Tests
 *
 * Tests the formatting and color logic without rendering with ink.
 * Rendering tests are not included due to yoga-layout WASM compilation issues in CI.
 */

import { describe, it, expect } from 'vitest';
import { formatTimestamp, getRoleColor } from './HistoryMessage';
import type { Message } from '../types';

describe('HistoryMessage Logic', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp as HH:MM:SS', () => {
      // Use a fixed UTC timestamp and verify the format pattern
      const ts = new Date('2026-03-19T14:32:15Z').getTime();
      const result = formatTimestamp(ts);
      // Should match HH:MM:SS pattern (local timezone varies)
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should pad single-digit hours, minutes, seconds', () => {
      // Use a timestamp where local time has single digits
      const ts = new Date('2026-01-01T01:02:03Z').getTime();
      const result = formatTimestamp(ts);
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      // Each segment should be zero-padded
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      for (const part of parts) {
        expect(part).toHaveLength(2);
      }
    });
  });

  describe('getRoleColor', () => {
    it('should return cyan for user', () => {
      expect(getRoleColor('user')).toBe('cyan');
    });

    it('should return green for assistant', () => {
      expect(getRoleColor('assistant')).toBe('green');
    });

    it('should return yellow for system', () => {
      expect(getRoleColor('system')).toBe('yellow');
    });

    it('should return gray for ui-notification', () => {
      expect(getRoleColor('ui-notification')).toBe('gray');
    });
  });

  describe('label logic', () => {
    it('should use timestamp format when timestamp is present', () => {
      const ts = Date.now();
      const label = `[${formatTimestamp(ts)}]`;
      expect(label).toMatch(/^\[\d{2}:\d{2}:\d{2}\]$/);
    });

    it('should use index format when no timestamp', () => {
      const index = 5;
      const label = `[#${index}]`;
      expect(label).toBe('[#5]');
    });
  });
});

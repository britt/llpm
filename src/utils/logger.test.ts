import { describe, it, expect, beforeEach, vi } from 'vitest';
import { debug, getRecentDebugLogs, setVerbose } from './logger';

describe('logger', () => {
  beforeEach(() => {
    // Clear any existing logs by getting more than exist
    vi.clearAllMocks();
  });

  describe('debug', () => {
    it('should store debug messages', () => {
      debug('Test message');
      const logs = getRecentDebugLogs(1);

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].timestamp).toBeDefined();
    });

    it('should handle multiple arguments', () => {
      debug('Message', 'with', 'multiple', 'parts');
      const logs = getRecentDebugLogs(1);

      expect(logs[0].message).toBe('Message with multiple parts');
    });

    it('should truncate long strings', () => {
      const longString = 'x'.repeat(600);
      debug(longString);
      const logs = getRecentDebugLogs(1);

      expect(logs[0].message.length).toBeLessThanOrEqual(503); // 500 + '...'
      expect(logs[0].message).toContain('...');
    });

    it('should truncate large objects', () => {
      const largeObject = {
        data: 'x'.repeat(600),
        nested: {
          field: 'y'.repeat(600)
        }
      };

      debug(largeObject);
      const logs = getRecentDebugLogs(1);

      expect(logs[0].message.length).toBeLessThanOrEqual(503); // 500 + '...'
      expect(logs[0].message).toContain('...');
    });

    it('should not truncate short messages', () => {
      debug('Short message');
      const logs = getRecentDebugLogs(1);

      expect(logs[0].message).toBe('Short message');
      expect(logs[0].message).not.toContain('...');
    });

    it('should handle mixed short and long arguments', () => {
      const longString = 'x'.repeat(600);
      debug('Short', longString);
      const logs = getRecentDebugLogs(1);

      // First arg should be intact, second should be truncated
      expect(logs[0].message).toContain('Short');
      expect(logs[0].message).toContain('...');
    });

    it('should stringify objects compactly', () => {
      const obj = { key: 'value', num: 42 };
      debug(obj);
      const logs = getRecentDebugLogs(1);

      // Should use compact JSON (no newlines/indentation)
      expect(logs[0].message).toBe('{"key":"value","num":42}');
    });

    it('should handle null and undefined', () => {
      debug(null);
      debug(undefined);
      const logs = getRecentDebugLogs(2);

      expect(logs[0].message).toBe('null');
      expect(logs[1].message).toBe('undefined');
    });
  });

  describe('getRecentDebugLogs', () => {
    it('should return requested number of logs', () => {
      debug('Log 1');
      debug('Log 2');
      debug('Log 3');

      const logs = getRecentDebugLogs(2);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Log 2');
      expect(logs[1].message).toBe('Log 3');
    });

    it('should return all logs if count exceeds available', () => {
      const beforeCount = getRecentDebugLogs(1000).length;

      debug('Log 1');
      debug('Log 2');

      const logs = getRecentDebugLogs(1000);
      // Should have added exactly 2 logs
      expect(logs.length).toBe(beforeCount + 2);
    });

    it('should return default 10 logs when no count provided', () => {
      for (let i = 0; i < 20; i++) {
        debug(`Log ${i}`);
      }

      const logs = getRecentDebugLogs();
      expect(logs).toHaveLength(10);
    });
  });

  describe('truncation prevents performance issues', () => {
    it('should handle extremely large objects without creating massive strings', () => {
      // Create an object that would be > 10KB if serialized
      const hugeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: 'x'.repeat(100)
        }))
      };

      const startTime = Date.now();
      debug(hugeObject);
      const endTime = Date.now();

      const logs = getRecentDebugLogs(1);

      // Message should be truncated to reasonable size
      expect(logs[0].message.length).toBeLessThanOrEqual(503);

      // Should complete quickly (< 50ms even with huge object)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
    });
  });
});

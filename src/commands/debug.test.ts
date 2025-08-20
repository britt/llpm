import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debugCommand } from './debug';
import * as logger from '../utils/logger';

describe('debugCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name and description', () => {
    expect(debugCommand.name).toBe('debug');
    expect(debugCommand.description).toBe('Show the last N debug log lines (default: 10)');
  });

  it('should return default 10 logs when no args provided', () => {
    const mockLogs = Array.from({ length: 15 }, (_, i) => ({
      message: `Debug message ${i + 1}`,
      timestamp: `2023-01-01T12:${String(i).padStart(2, '0')}:00.000Z`
    }));

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs.slice(-10));

    const result = debugCommand.execute([]);

    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(10);
    expect(result.success).toBe(true);
    expect(result.content).toContain('🐛 Last 10 debug logs:');
    expect(result.content).toContain('Debug message 6');
    expect(result.content).toContain('Debug message 15');
  });

  it('should return specified number of logs', () => {
    const mockLogs = Array.from({ length: 5 }, (_, i) => ({
      message: `Test log ${i + 1}`,
      timestamp: `2023-01-01T12:0${i}:00.000Z`
    }));

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = debugCommand.execute(['5']);

    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(5);
    expect(result.success).toBe(true);
    expect(result.content).toContain('🐛 Last 5 debug logs:');
  });

  it('should handle empty logs gracefully', () => {
    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue([]);

    const result = debugCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toBe('📝 No debug logs available yet.');
  });

  it('should handle invalid numeric arguments', () => {
    const result = debugCommand.execute(['invalid']);

    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Invalid number: invalid');
    expect(result.content).toContain('Please provide a positive integer');
  });

  it('should handle zero and negative numbers', () => {
    const result1 = debugCommand.execute(['0']);
    expect(result1.success).toBe(false);
    expect(result1.content).toContain('❌ Invalid number: 0');

    const result2 = debugCommand.execute(['-5']);
    expect(result2.success).toBe(false);
    expect(result2.content).toContain('❌ Invalid number: -5');
  });

  it('should format timestamps correctly', () => {
    const mockLogs = [{
      message: 'Test message',
      timestamp: '2023-01-01T12:34:56.789Z'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = debugCommand.execute(['1']);

    expect(result.success).toBe(true);
    // Should extract time part from ISO timestamp
    expect(result.content).toContain('[12:34:56]');
    expect(result.content).toContain('Test message');
  });

  it('should handle malformed timestamps', () => {
    const mockLogs = [{
      message: 'Test message',
      timestamp: 'invalid-timestamp'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = debugCommand.execute(['1']);

    expect(result.success).toBe(true);
    // Should fallback to full timestamp
    expect(result.content).toContain('[invalid-timestamp]');
    expect(result.content).toContain('Test message');
  });

  it('should handle single log with correct grammar', () => {
    const mockLogs = [{
      message: 'Single log',
      timestamp: '2023-01-01T12:00:00.000Z'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = debugCommand.execute(['1']);

    expect(result.success).toBe(true);
    expect(result.content).toContain('🐛 Last 1 debug log:'); // Singular
    expect(result.content).not.toContain('logs:');
  });

  it('should colorize log output', () => {
    const mockLogs = [{
      message: 'Colorized message',
      timestamp: '2023-01-01T12:00:00.000Z'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = debugCommand.execute(['1']);

    expect(result.success).toBe(true);
    // Check for ANSI color codes
    expect(result.content).toContain('\x1b[90m'); // Gray timestamp
    expect(result.content).toContain('\x1b[37m'); // White message
    expect(result.content).toContain('\x1b[0m');  // Reset
  });

  it('should handle floating point numbers', () => {
    const result = debugCommand.execute(['5.5']);

    expect(result.success).toBe(true);
    // Should parse as 5 (parseInt behavior)
    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(5);
  });
});
import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debugCommand } from './debug';
import * as logger from '../utils/logger';
import type { CommandResult } from './types';

// Helper to resolve command results (handles both sync and async)
async function resolveCommandResult(result: CommandResult | Promise<CommandResult>): Promise<CommandResult> {
  return Promise.resolve(result);
}

describe('debugCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name and description', () => {
    expect(debugCommand.name).toBe('debug');
    expect(debugCommand.description).toBe('Show the last N debug log lines (default: 10, max: 1000)');
  });

  it('should return default 10 logs when no args provided', async () => {
    const mockLogs = Array.from({ length: 15 }, (_, i) => ({
      message: `Debug message ${i + 1}`,
      timestamp: `2023-01-01T12:${String(i).padStart(2, '0')}:00.000Z`
    }));

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs.slice(-10));

    const result = await resolveCommandResult(debugCommand.execute([]));

    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(10);
    expect(result.success).toBe(true);
    expect(result.content).toContain('🐛 Last 10 debug logs:');
    expect(result.content).toContain('Debug message 6');
    expect(result.content).toContain('Debug message 15');
  });

  it('should return specified number of logs', async () => {
    const mockLogs = Array.from({ length: 5 }, (_, i) => ({
      message: `Test log ${i + 1}`,
      timestamp: `2023-01-01T12:0${i}:00.000Z`
    }));

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = await resolveCommandResult(debugCommand.execute(['5']));

    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(5);
    expect(result.success).toBe(true);
    expect(result.content).toContain('🐛 Last 5 debug logs:');
  });

  it('should handle empty logs gracefully', async () => {
    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue([]);

    const result = await resolveCommandResult(debugCommand.execute([]));

    expect(result.success).toBe(true);
    expect(result.content).toBe('📝 No debug logs available yet.');
  });

  it('should handle invalid numeric arguments', async () => {
    const result = await resolveCommandResult(debugCommand.execute(['invalid']));

    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Invalid number: invalid');
    expect(result.content).toContain('Please provide a positive integer');
  });

  it('should handle zero and negative numbers', async () => {
    const result1 = await resolveCommandResult(debugCommand.execute(['0']));
    expect(result1.success).toBe(false);
    expect(result1.content).toContain('❌ Invalid number: 0');

    const result2 = await resolveCommandResult(debugCommand.execute(['-5']));
    expect(result2.success).toBe(false);
    expect(result2.content).toContain('❌ Invalid number: -5');
  });

  it('should format timestamps correctly', async () => {
    const mockLogs = [{
      message: 'Test message',
      timestamp: '2023-01-01T12:34:56.789Z'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = await resolveCommandResult(debugCommand.execute(['1']));

    expect(result.success).toBe(true);
    // Should extract time part from ISO timestamp
    expect(result.content).toContain('[12:34:56]');
    expect(result.content).toContain('Test message');
  });

  it('should handle malformed timestamps', async () => {
    const mockLogs = [{
      message: 'Test message',
      timestamp: 'invalid-timestamp'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = await resolveCommandResult(debugCommand.execute(['1']));

    expect(result.success).toBe(true);
    // Should fallback to full timestamp
    expect(result.content).toContain('[invalid-timestamp]');
    expect(result.content).toContain('Test message');
  });

  it('should handle single log with correct grammar', async () => {
    const mockLogs = [{
      message: 'Single log',
      timestamp: '2023-01-01T12:00:00.000Z'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = await resolveCommandResult(debugCommand.execute(['1']));

    expect(result.success).toBe(true);
    expect(result.content).toContain('🐛 Last 1 debug log:'); // Singular
    expect(result.content).not.toContain('logs:');
  });

  it('should colorize log output', async () => {
    const mockLogs = [{
      message: 'Colorized message',
      timestamp: '2023-01-01T12:00:00.000Z'
    }];

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = await resolveCommandResult(debugCommand.execute(['1']));

    expect(result.success).toBe(true);
    // Check for ANSI color codes
    expect(result.content).toContain('\x1b[90m'); // Gray timestamp
    expect(result.content).toContain('\x1b[37m'); // White message
    expect(result.content).toContain('\x1b[0m');  // Reset
  });

  it('should handle floating point numbers', async () => {
    const result = await resolveCommandResult(debugCommand.execute(['5.5']));

    expect(result.success).toBe(true);
    // Should parse as 5 (parseInt behavior)
    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(5);
  });

  it('should reject counts exceeding the maximum limit', async () => {
    const result = await resolveCommandResult(debugCommand.execute(['10000']));

    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Count exceeds maximum limit of 1000');
    expect(result.content).toContain('Please request 1000 or fewer logs');
  });

  it('should accept count equal to maximum limit', async () => {
    const mockLogs = Array.from({ length: 1000 }, (_, i) => ({
      message: `Log ${i + 1}`,
      timestamp: `2023-01-01T12:00:${String(i % 60).padStart(2, '0')}.000Z`
    }));

    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs);

    const result = await resolveCommandResult(debugCommand.execute(['1000']));

    expect(result.success).toBe(true);
    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(1000);
    expect(result.content).toContain('🐛 Last 1000 debug logs:');
  });

  it('should reject count just above maximum limit', async () => {
    const result = await resolveCommandResult(debugCommand.execute(['1001']));

    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Count exceeds maximum limit of 1000');
  });

  it('should show maximum limit in help text', async () => {
    const result = await resolveCommandResult(debugCommand.execute(['help']));

    expect(result.success).toBe(true);
    expect(result.content).toContain('max: 1000');
    expect(result.content).toContain('The system stores up to 1000 debug logs in memory');
  });

  it('should show maximum limit in description', () => {
    expect(debugCommand.description).toContain('max: 1000');
  });

  it('should return exactly N log entries when requested', async () => {
    // Create 100 logs with some containing objects that would be pretty-printed
    const mockLogs = Array.from({ length: 100 }, (_, i) => ({
      message: i % 5 === 0 ? JSON.stringify({ id: i, data: 'test' }, null, 2) : `Simple log ${i}`,
      timestamp: `2023-01-01T12:00:${String(i % 60).padStart(2, '0')}.000Z`
    }));

    // Mock to return last 50
    vi.spyOn(logger, 'getRecentDebugLogs').mockReturnValue(mockLogs.slice(-50));

    const result = await resolveCommandResult(debugCommand.execute(['50']));

    expect(result.success).toBe(true);
    expect(logger.getRecentDebugLogs).toHaveBeenCalledWith(50);
    expect(result.content).toContain('🐛 Last 50 debug logs:');

    // Count the actual log entries in the output
    // Each log has a timestamp in brackets [HH:MM:SS]
    const logEntryMatches = result.content.match(/\[\d{2}:\d{2}:\d{2}\]/g);
    expect(logEntryMatches).toHaveLength(50); // Should be exactly 50 entries
  });
});
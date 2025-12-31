import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearCommand } from './clear';
import * as chatHistory from '../utils/chatHistory';

describe('clearCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name and description', () => {
    expect(clearCommand.name).toBe('clear');
    expect(clearCommand.description).toBe('Start a new chat session (clears current conversation)');
  });

  it('should successfully clear session', async () => {
    const mockClearChatHistory = vi.spyOn(chatHistory, 'clearChatHistory').mockResolvedValue(undefined);

    const result = await clearCommand.execute([]);

    expect(mockClearChatHistory).toHaveBeenCalledWith();
    expect(result.success).toBe(true);
    expect(result.content).toContain('🧹 Chat session cleared!');
    expect(result.content).toContain('Starting fresh conversation');
    expect(result.content).toContain('previous conversations are saved');
    expect(result.content).toContain('~/.llpm');
  });

  it('should handle clearChatHistory failure gracefully', async () => {
    const mockClearChatHistory = vi.spyOn(chatHistory, 'clearChatHistory')
      .mockRejectedValue(new Error('Failed to clear history'));

    const result = await clearCommand.execute([]);

    expect(mockClearChatHistory).toHaveBeenCalledWith();
    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Failed to clear session');
  });

  it('should ignore command arguments', async () => {
    const mockClearChatHistory = vi.spyOn(chatHistory, 'clearChatHistory').mockResolvedValue(undefined);

    const result = await clearCommand.execute(['arg1', 'arg2', 'arg3']);

    expect(mockClearChatHistory).toHaveBeenCalledWith();
    expect(result.success).toBe(true);
    expect(result.content).toContain('🧹 Chat session cleared!');
  });

  it('should handle different types of errors', async () => {
    // Test with a non-Error object
    const mockClearChatHistory = vi.spyOn(chatHistory, 'clearChatHistory')
      .mockRejectedValue('String error');

    const result = await clearCommand.execute([]);

    expect(mockClearChatHistory).toHaveBeenCalledWith();
    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Failed to clear session');
  });

  it('should show help when help argument is passed', async () => {
    const result = await clearCommand.execute(['help']);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Clear Command');
    expect(result.content).toContain('/clear');
    expect(result.content).toContain('clears current conversation');
  });

  it('should be case insensitive for help argument', async () => {
    const result = await clearCommand.execute(['HELP']);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Clear Command');
  });
});
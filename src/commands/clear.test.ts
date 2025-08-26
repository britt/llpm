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
    const mockSaveChatHistory = vi.spyOn(chatHistory, 'saveChatHistory').mockResolvedValue(undefined);

    const result = await clearCommand.execute([]);

    expect(mockSaveChatHistory).toHaveBeenCalledWith([]);
    expect(result.success).toBe(true);
    expect(result.content).toContain('🧹 Chat session cleared!');
    expect(result.content).toContain('Starting fresh conversation');
    expect(result.content).toContain('previous conversations are saved');
    expect(result.content).toContain('~/.llpm');
  });

  it('should handle saveChatHistory failure gracefully', async () => {
    const mockSaveChatHistory = vi.spyOn(chatHistory, 'saveChatHistory')
      .mockImplementation(() => {
        throw new Error('Failed to save history');
      });

    const result = await clearCommand.execute([]);

    expect(mockSaveChatHistory).toHaveBeenCalledWith([]);
    // The current implementation doesn't await saveChatHistory, but it should still catch sync throws
    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Failed to clear session');
  });

  it('should ignore command arguments', async () => {
    const mockSaveChatHistory = vi.spyOn(chatHistory, 'saveChatHistory').mockResolvedValue(undefined);

    const result = await clearCommand.execute(['arg1', 'arg2', 'arg3']);

    expect(mockSaveChatHistory).toHaveBeenCalledWith([]);
    expect(result.success).toBe(true);
    expect(result.content).toContain('🧹 Chat session cleared!');
  });

  it('should handle different types of errors', async () => {
    // Test with a non-Error object
    const mockSaveChatHistory = vi.spyOn(chatHistory, 'saveChatHistory')
      .mockImplementation(() => {
        throw 'String error';
      });

    const result = await clearCommand.execute([]);

    expect(mockSaveChatHistory).toHaveBeenCalledWith([]);
    // The current implementation doesn't await saveChatHistory, but it should still catch sync throws
    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Failed to clear session');
  });
});
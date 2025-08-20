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
    const mockCreateNewSession = vi.spyOn(chatHistory, 'createNewSession').mockResolvedValue(undefined);

    const result = await clearCommand.execute([]);

    expect(mockCreateNewSession).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    expect(result.content).toContain('🧹 Chat session cleared!');
    expect(result.content).toContain('Starting fresh conversation');
    expect(result.content).toContain('previous conversations are saved');
    expect(result.content).toContain('~/.llpm');
  });

  it('should handle createNewSession failure gracefully', async () => {
    const mockCreateNewSession = vi.spyOn(chatHistory, 'createNewSession')
      .mockRejectedValue(new Error('Failed to create session'));

    const result = await clearCommand.execute([]);

    expect(mockCreateNewSession).toHaveBeenCalledOnce();
    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Failed to clear session');
    expect(result.content).toContain('Please try again');
  });

  it('should ignore command arguments', async () => {
    const mockCreateNewSession = vi.spyOn(chatHistory, 'createNewSession').mockResolvedValue(undefined);

    const result = await clearCommand.execute(['arg1', 'arg2', 'arg3']);

    expect(mockCreateNewSession).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    expect(result.content).toContain('🧹 Chat session cleared!');
  });

  it('should handle different types of errors', async () => {
    // Test with a non-Error object
    const mockCreateNewSession = vi.spyOn(chatHistory, 'createNewSession')
      .mockRejectedValue('String error');

    const result = await clearCommand.execute([]);

    expect(mockCreateNewSession).toHaveBeenCalledOnce();
    expect(result.success).toBe(false);
    expect(result.content).toContain('❌ Failed to clear session');
  });
});
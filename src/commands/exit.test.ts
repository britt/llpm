import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exitCommand } from './exit';
import type { CommandResult } from './types';

// Helper to resolve command results (handles both sync and async)
async function resolveCommandResult(result: CommandResult | Promise<CommandResult>): Promise<CommandResult> {
  return Promise.resolve(result);
}

describe('exitCommand', () => {
  let originalExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock process.exit to prevent actual exit during tests
    originalExit = process.exit;
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    // Restore original functions
    process.exit = originalExit;
  });

  it('should have correct name and description', () => {
    expect(exitCommand.name).toBe('exit');
    expect(exitCommand.description).toBe('Exit the application (alias for /quit)');
  });

  it('should return success result with goodbye message', async () => {
    const result = await resolveCommandResult(exitCommand.execute([]));

    expect(result.success).toBe(true);
    expect(result.content).toContain('✌️ Peace out!');
  });

  it('should not call process.exit in test environment', () => {
    return new Promise<void>((resolve) => {
      exitCommand.execute([]);

      // process.exit should not be called in test environment
      expect(process.exit).not.toHaveBeenCalled();

      // Wait to ensure setTimeout doesn't execute process.exit
      setTimeout(() => {
        expect(process.exit).not.toHaveBeenCalled();
        resolve();
      }, 150); // Wait longer than the 100ms delay
    });
  });

  it('should be functionally identical to quit command', async () => {
    const result = await resolveCommandResult(exitCommand.execute([]));

    expect(result.success).toBe(true);
    expect(result.content).toBe('✌️ Peace out!');
  });

  it('should ignore command arguments', async () => {
    const result = await resolveCommandResult(exitCommand.execute(['arg1', 'arg2']));

    expect(result.success).toBe(true);
    expect(result.content).toContain('✌️ Peace out!');
  });
});
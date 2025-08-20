import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { quitCommand } from './quit';
import type { CommandResult } from './types';

// Helper to resolve command results (handles both sync and async)
async function resolveCommandResult(result: CommandResult | Promise<CommandResult>): Promise<CommandResult> {
  return Promise.resolve(result);
}

describe('quitCommand', () => {
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
    expect(quitCommand.name).toBe('quit');
    expect(quitCommand.description).toBe('Exit the application');
  });

  it('should return success result with goodbye message', async () => {
    const result = await resolveCommandResult(quitCommand.execute([]));

    expect(result.success).toBe(true);
    expect(result.content).toContain('👋 Goodbye!');
    expect(result.content).toContain('Thanks for using LLPM');
  });

  it('should schedule process exit after delay', () => {
    return new Promise<void>((resolve) => {
      quitCommand.execute([]);

      // Initially process.exit should not be called
      expect(process.exit).not.toHaveBeenCalled();

      // Wait for setTimeout to execute
      setTimeout(() => {
        expect(process.exit).toHaveBeenCalledWith(0);
        resolve();
      }, 150); // Wait longer than the 100ms delay
    });
  });

  it('should ignore command arguments', async () => {
    const result = await resolveCommandResult(quitCommand.execute(['arg1', 'arg2']));

    expect(result.success).toBe(true);
    expect(result.content).toContain('👋 Goodbye!');
  });

  it('should handle multiple calls without issues', async () => {
    // Call multiple times
    const result1 = await resolveCommandResult(quitCommand.execute([]));
    const result2 = await resolveCommandResult(quitCommand.execute([]));

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.content).toBe(result2.content);
  });

  it('should use consistent goodbye message format', async () => {
    const result = await resolveCommandResult(quitCommand.execute([]));

    expect(result.content).toBe('👋 Goodbye! Thanks for using LLPM.');
  });
});
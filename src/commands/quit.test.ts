import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { quitCommand } from './quit';

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

  it('should return success result with goodbye message', () => {
    const result = quitCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('👋 Goodbye!');
    expect(result.content).toContain('Thanks for using LLPM');
  });

  it('should schedule process exit after delay', (done) => {
    quitCommand.execute([]);

    // Initially process.exit should not be called
    expect(process.exit).not.toHaveBeenCalled();

    // Wait for setTimeout to execute
    setTimeout(() => {
      expect(process.exit).toHaveBeenCalledWith(0);
      done();
    }, 150); // Wait longer than the 100ms delay
  });

  it('should ignore command arguments', () => {
    const result = quitCommand.execute(['arg1', 'arg2']);

    expect(result.success).toBe(true);
    expect(result.content).toContain('👋 Goodbye!');
  });

  it('should handle multiple calls without issues', () => {
    // Call multiple times
    const result1 = quitCommand.execute([]);
    const result2 = quitCommand.execute([]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.content).toBe(result2.content);
  });

  it('should use consistent goodbye message format', () => {
    const result = quitCommand.execute([]);

    expect(result.content).toBe('👋 Goodbye! Thanks for using LLPM.');
  });
});
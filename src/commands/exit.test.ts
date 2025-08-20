import '../../test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exitCommand } from './exit';

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

  it('should return success result with goodbye message', () => {
    const result = exitCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('👋 Goodbye!');
    expect(result.content).toContain('Thanks for using LLPM');
  });

  it('should schedule process exit after delay', (done) => {
    exitCommand.execute([]);

    // Initially process.exit should not be called
    expect(process.exit).not.toHaveBeenCalled();

    // Wait for setTimeout to execute
    setTimeout(() => {
      expect(process.exit).toHaveBeenCalledWith(0);
      done();
    }, 150); // Wait longer than the 100ms delay
  });

  it('should be functionally identical to quit command', () => {
    const result = exitCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toBe('👋 Goodbye! Thanks for using LLPM.');
  });

  it('should ignore command arguments like quit', () => {
    const result = exitCommand.execute(['unnecessary', 'args']);

    expect(result.success).toBe(true);
    expect(result.content).toBe('👋 Goodbye! Thanks for using LLPM.');
  });
});
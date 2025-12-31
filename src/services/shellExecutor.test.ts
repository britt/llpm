import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_SHELL_CONFIG, type ShellConfig } from '../types/shell';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Mock the Bun $ shell function using vi.hoisted to avoid reference errors
const { mockShell, mockShellResult } = vi.hoisted(() => {
  let mockShellResult = {
    exitCode: 0,
    stdout: Buffer.from('hello world\n'),
    stderr: Buffer.from('')
  };

  const mockShell = vi.fn().mockImplementation(() => {
    return {
      cwd: vi.fn().mockReturnThis(),
      env: vi.fn().mockReturnThis(),
      quiet: vi.fn().mockReturnThis(),
      nothrow: vi.fn().mockResolvedValue(mockShellResult)
    };
  });

  return { mockShell, mockShellResult };
});

vi.mock('bun', () => ({
  $: mockShell
}));

import { ShellExecutor } from './shellExecutor';

describe('ShellExecutor', () => {
  let executor: ShellExecutor;
  let testDir: string;
  let enabledConfig: ShellConfig;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-shell-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    enabledConfig = {
      ...DEFAULT_SHELL_CONFIG,
      enabled: true,
      defaultTimeout: 5000
    };

    executor = new ShellExecutor(enabledConfig, testDir);

    // Reset mocks
    vi.clearAllMocks();

    // Reset to default successful result
    mockShellResult.exitCode = 0;
    mockShellResult.stdout = Buffer.from('hello world\n');
    mockShellResult.stderr = Buffer.from('');

    // Re-apply default mock implementation
    mockShell.mockImplementation(() => ({
      cwd: vi.fn().mockReturnThis(),
      env: vi.fn().mockReturnThis(),
      quiet: vi.fn().mockReturnThis(),
      nothrow: vi.fn().mockResolvedValue(mockShellResult)
    }));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should execute a simple command and return result', async () => {
      const result = await executor.execute('echo "hello world"');

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('hello world');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.command).toBe('echo "hello world"');
    });

    it('should capture stderr', async () => {
      // Mock a failed command
      mockShellResult.exitCode = 1;
      mockShellResult.stdout = Buffer.from('');
      mockShellResult.stderr = Buffer.from('ls: /nonexistent-path-12345: No such file or directory\n');

      const result = await executor.execute('ls /nonexistent-path-12345');

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    });

    it('should respect timeout', async () => {
      const shortTimeoutConfig = { ...enabledConfig, defaultTimeout: 100 };
      const shortExecutor = new ShellExecutor(shortTimeoutConfig, testDir);

      // Mock a long-running command by making nothrow() delay
      mockShell.mockImplementationOnce(() => ({
        cwd: vi.fn().mockReturnThis(),
        env: vi.fn().mockReturnThis(),
        quiet: vi.fn().mockReturnThis(),
        nothrow: vi.fn().mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve({
            exitCode: 0,
            stdout: Buffer.from(''),
            stderr: Buffer.from('')
          }), 200); // Longer than 100ms timeout
        }))
      }));

      const result = await shortExecutor.execute('sleep 10');

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it('should reject when shell is disabled', async () => {
      const disabledConfig = { ...DEFAULT_SHELL_CONFIG, enabled: false };
      const disabledExecutor = new ShellExecutor(disabledConfig, testDir);

      const result = await disabledExecutor.execute('echo test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should reject denied commands', async () => {
      const result = await executor.execute('sudo rm -rf /');

      expect(result.success).toBe(false);
      expect(result.error).toContain('denied');
    });

    it('should use custom cwd when provided', async () => {
      // Mock pwd output
      mockShellResult.exitCode = 0;
      mockShellResult.stdout = Buffer.from(testDir + '\n');
      mockShellResult.stderr = Buffer.from('');

      const result = await executor.execute('pwd', { cwd: testDir });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe(testDir);
      expect(result.cwd).toBe(testDir);
    });

    it('should track execution duration', async () => {
      // Mock echo test output
      mockShellResult.exitCode = 0;
      mockShellResult.stdout = Buffer.from('test\n');
      mockShellResult.stderr = Buffer.from('');

      const result = await executor.execute('echo test');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(5000);
    });

    it('should handle shell execution errors gracefully', async () => {
      // Mock the shell to throw an error
      mockShell.mockImplementationOnce(() => ({
        cwd: vi.fn().mockReturnThis(),
        env: vi.fn().mockReturnThis(),
        quiet: vi.fn().mockReturnThis(),
        nothrow: vi.fn().mockRejectedValue(new Error('Shell execution failed'))
      }));

      const result = await executor.execute('some-command');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toContain('Shell execution failed');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-Error throws gracefully', async () => {
      // Mock the shell to throw a string (non-Error)
      mockShell.mockImplementationOnce(() => ({
        cwd: vi.fn().mockReturnThis(),
        env: vi.fn().mockReturnThis(),
        quiet: vi.fn().mockReturnThis(),
        nothrow: vi.fn().mockRejectedValue('string error')
      }));

      const result = await executor.execute('some-command');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toBe('string error');
    });
  });
});

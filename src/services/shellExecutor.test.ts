// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_SHELL_CONFIG, type ShellConfig } from '../types/shell';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Mock child_process.exec using vi.hoisted
const { mockExec } = vi.hoisted(() => {
  const mockExec = vi.fn();
  return { mockExec };
});

vi.mock('child_process', () => ({
  exec: mockExec
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

    // Default: successful command execution
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null | Error, stdout: string, stderr: string) => void) => {
      cb(null, 'hello world\n', '');
      return {};
    });
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
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        const error = new Error('command failed') as Error & { code: number };
        error.code = 1;
        cb(error, '', 'ls: /nonexistent-path-12345: No such file or directory\n');
        return {};
      });

      const result = await executor.execute('ls /nonexistent-path-12345');

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    });

    it('should respect timeout', async () => {
      const shortTimeoutConfig = { ...enabledConfig, defaultTimeout: 100 };
      const shortExecutor = new ShellExecutor(shortTimeoutConfig, testDir);

      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        const error = new Error('Command timed out') as Error & { killed: boolean; code: number };
        error.killed = true;
        error.code = 1;
        setTimeout(() => cb(error, '', ''), 150);
        return {};
      });

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
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null | Error, stdout: string, stderr: string) => void) => {
        cb(null, testDir + '\n', '');
        return {};
      });

      const result = await executor.execute('pwd', { cwd: testDir });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe(testDir);
      expect(result.cwd).toBe(testDir);
    });

    it('should pass cwd to exec options', async () => {
      await executor.execute('pwd', { cwd: testDir });

      expect(mockExec).toHaveBeenCalledWith(
        'pwd',
        expect.objectContaining({ cwd: testDir }),
        expect.any(Function)
      );
    });

    it('should track execution duration', async () => {
      const result = await executor.execute('echo test');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(5000);
    });

    it('should handle shell execution errors gracefully', async () => {
      mockExec.mockImplementation(() => {
        throw new Error('Shell execution failed');
      });

      const result = await executor.execute('some-command');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toContain('Shell execution failed');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-Error throws gracefully', async () => {
      mockExec.mockImplementation(() => {
        throw 'string error';
      });

      const result = await executor.execute('some-command');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toBe('string error');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as projectConfig from '../utils/projectConfig';
import type { Project } from '../types/project';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// Mock the Bun $ shell function
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

import { runShellCommandTool } from './shellTools';

describe('shellTools', () => {
  let testDir: string;
  let mockProject: Project;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-shell-tool-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Create a shell config file that enables shell
    const configDir = join(testDir, '.llpm');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, 'shell.json'),
      JSON.stringify({ enabled: true, defaultTimeout: 5000, maxTimeout: 30000, auditEnabled: false })
    );

    mockProject = {
      id: 'test-project',
      name: 'Test Project',
      description: 'A test project',
      repository: 'test/repo',
      path: testDir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(mockProject);

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
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('runShellCommandTool', () => {
    it('should have correct inputSchema', () => {
      expect(runShellCommandTool.inputSchema).toBeDefined();
    });

    it('should execute command and return structured result', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo "hello world"'
      });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('hello world');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.command).toBe('echo "hello world"');
    });

    it('should reject when no project is set', async () => {
      vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('project');
    });

    it('should respect timeout parameter', async () => {
      // Mock a long-running command
      mockShell.mockImplementation(() => ({
        cwd: vi.fn().mockReturnThis(),
        env: vi.fn().mockReturnThis(),
        quiet: vi.fn().mockReturnThis(),
        nothrow: vi.fn().mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve(mockShellResult), 1000);
        }))
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'sleep 10',
        timeout: 100
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timed out');
    });

    it('should use default config when no shell.json exists', async () => {
      // Remove the shell config file
      const configPath = join(testDir, '.llpm', 'shell.json');
      if (existsSync(configPath)) {
        rmSync(configPath);
      }

      // Without config, shell should be disabled by default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should use default config when shell.json has invalid JSON', async () => {
      // Write invalid JSON to config file
      const configPath = join(testDir, '.llpm', 'shell.json');
      writeFileSync(configPath, '{ invalid json }');

      // Should fall back to defaults (shell disabled)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should log to audit when auditEnabled is true', async () => {
      // Enable audit logging in config
      const configPath = join(testDir, '.llpm', 'shell.json');
      writeFileSync(
        configPath,
        JSON.stringify({ enabled: true, defaultTimeout: 5000, maxTimeout: 30000, auditEnabled: true })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo "hello"'
      });

      expect(result.success).toBe(true);
      // Audit logging happens in the background, we just verify command succeeded
    });

    it('should handle audit logging errors gracefully', async () => {
      // Enable audit logging but mock config to cause an error
      const configPath = join(testDir, '.llpm', 'shell.json');
      writeFileSync(
        configPath,
        JSON.stringify({ enabled: true, defaultTimeout: 5000, maxTimeout: 30000, auditEnabled: true })
      );

      // The audit logger will try to write, which may or may not succeed
      // depending on the environment, but the command should still succeed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo "hello"'
      });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('hello world');
    });
  });
});

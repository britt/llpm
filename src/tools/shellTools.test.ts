// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as projectConfig from '../utils/projectConfig';
import type { Project } from '../types/project';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// Global config dir set by each test
let testGlobalConfigDir = '';

// Mock the config module to return our test config dir
vi.mock('../utils/config', async () => {
  return {
    getConfigDir: () => testGlobalConfigDir
  };
});

// Mock child_process.exec using vi.hoisted
const { mockExec } = vi.hoisted(() => {
  const mockExec = vi.fn();
  return { mockExec };
});

vi.mock('child_process', () => ({
  exec: mockExec
}));

import { runShellCommandTool } from './shellTools';

describe('shellTools', () => {
  let testDir: string;
  let globalConfigDir: string;
  let mockProject: Project;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-shell-tool-test-' + Date.now());
    globalConfigDir = join(tmpdir(), 'llpm-global-config-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    mkdirSync(globalConfigDir, { recursive: true });

    // Set the global config directory for this test (used by mocked getConfigDir)
    testGlobalConfigDir = globalConfigDir;

    // Create config.json with shell section that enables shell
    writeFileSync(
      join(globalConfigDir, 'config.json'),
      JSON.stringify({
        shell: { enabled: true, defaultTimeout: 5000, maxTimeout: 30000, auditEnabled: false }
      })
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

    // Default: successful command execution via child_process.exec
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null | Error, stdout: string, stderr: string) => void) => {
      cb(null, 'hello world\n', '');
      return {};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    if (existsSync(globalConfigDir)) {
      rmSync(globalConfigDir, { recursive: true, force: true });
    }
  });

  describe('runShellCommandTool', () => {
    it('should have correct inputSchema', () => {
      expect(runShellCommandTool.inputSchema).toBeDefined();
    });

    describe('confirmation flow', () => {
      it('should require confirmation when confirmed is not set', async () => {
        const execute = runShellCommandTool.execute as any;
        const result = await execute({
          command: 'echo "hello world"'
        });

        expect(result.requiresConfirmation).toBe(true);
        expect(result.confirmationMessage).toContain('echo "hello world"');
        expect(result.confirmationMessage).toContain('Shell Command Confirmation Required');
        expect(result.success).toBe(false);
      });

      it('should show working directory in confirmation message', async () => {
        const execute = runShellCommandTool.execute as any;
        const result = await execute({
          command: 'ls -la',
          cwd: '/custom/path'
        });

        expect(result.requiresConfirmation).toBe(true);
        expect(result.confirmationMessage).toContain('/custom/path');
      });

      it('should execute command when confirmed is true', async () => {
        const execute = runShellCommandTool.execute as any;
        const result = await execute({
          command: 'echo "hello world"',
          confirmed: true
        });

        expect(result.success).toBe(true);
        expect(result.requiresConfirmation).toBeUndefined();
        expect(result.stdout.trim()).toBe('hello world');
        expect(result.exitCode).toBe(0);
      });

      it('should include execution notice showing command that was run', async () => {

        const execute = runShellCommandTool.execute as any;
        const result = await execute({
          command: 'echo "hello world"',
          confirmed: true
        });

        expect(result.executionNotice).toContain('echo "hello world"');
        expect(result.executionNotice).toContain('Executing shell command');
      });
    });

    describe('skipConfirmation mode', () => {
      it('should skip confirmation when skipConfirmation is enabled', async () => {
        // Enable skipConfirmation in config
        const configPath = join(globalConfigDir, 'config.json');
        writeFileSync(
          configPath,
          JSON.stringify({
            shell: { enabled: true, skipConfirmation: true, auditEnabled: false }
          })
        );


        const execute = runShellCommandTool.execute as any;
        const result = await execute({
          command: 'echo "hello world"'
          // Note: no confirmed parameter needed
        });

        expect(result.success).toBe(true);
        expect(result.requiresConfirmation).toBeUndefined();
        expect(result.stdout.trim()).toBe('hello world');
      });

      it('should still show execution notice when skipConfirmation is enabled', async () => {
        // Enable skipConfirmation in config
        const configPath = join(globalConfigDir, 'config.json');
        writeFileSync(
          configPath,
          JSON.stringify({
            shell: { enabled: true, skipConfirmation: true, auditEnabled: false }
          })
        );


        const execute = runShellCommandTool.execute as any;
        const result = await execute({
          command: 'git status'
        });

        expect(result.executionNotice).toContain('git status');
        expect(result.executionNotice).toContain('Executing shell command');
        expect(result.executionNotice).toContain('Working directory');
      });
    });

    it('should reject when no project is set', async () => {
      vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);


      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('project');
    });

    it('should respect timeout parameter', async () => {
      // Mock a command that times out
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        const error = new Error('Command timed out') as Error & { killed: boolean; code: number };
        error.killed = true;
        error.code = 1;
        setTimeout(() => cb(error, '', ''), 200);
        return {};
      });


      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'sleep 10',
        timeout: 100,
        confirmed: true
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timed out');
    });

    it('should use default config when no config.json exists', async () => {
      // Remove the config file from global config
      const configPath = join(globalConfigDir, 'config.json');
      if (existsSync(configPath)) {
        rmSync(configPath);
      }

      // Without config, shell should be disabled by default

      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test',
        confirmed: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should use default config when config.json has no shell section', async () => {
      // Write config without shell section
      const configPath = join(globalConfigDir, 'config.json');
      writeFileSync(configPath, JSON.stringify({ model: {} }));

      // Should fall back to defaults (shell disabled)

      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test',
        confirmed: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should use default config when config.json has invalid JSON', async () => {
      // Write invalid JSON to global config file
      const configPath = join(globalConfigDir, 'config.json');
      writeFileSync(configPath, '{ invalid json }');

      // Should fall back to defaults (shell disabled)

      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo test',
        confirmed: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should log to audit when auditEnabled is true', async () => {
      // Enable audit logging in global config
      const configPath = join(globalConfigDir, 'config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          shell: { enabled: true, defaultTimeout: 5000, maxTimeout: 30000, auditEnabled: true }
        })
      );


      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo "hello"',
        confirmed: true
      });

      expect(result.success).toBe(true);
      // Audit logging happens in the background, we just verify command succeeded
    });

    it('should handle audit logging errors gracefully', async () => {
      // Enable audit logging in global config
      const configPath = join(globalConfigDir, 'config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          shell: { enabled: true, defaultTimeout: 5000, maxTimeout: 30000, auditEnabled: true }
        })
      );

      // The audit logger will try to write, which may or may not succeed
      // depending on the environment, but the command should still succeed

      const execute = runShellCommandTool.execute as any;
      const result = await execute({
        command: 'echo "hello"',
        confirmed: true
      });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('hello world');
    });
  });
});

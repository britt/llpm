import { describe, it, expect } from 'vitest';
import {
  isShellEnabled,
  isCommandAllowed,
  isPathAllowed,
  validateShellExecution
} from './shellPermissions';
import type { ShellConfig } from '../types/shell';
import { DEFAULT_SHELL_CONFIG } from '../types/shell';

describe('shellPermissions', () => {
  describe('isShellEnabled', () => {
    it('should return false when shell is disabled', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: false };
      expect(isShellEnabled(config)).toBe(false);
    });

    it('should return true when shell is enabled', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true };
      expect(isShellEnabled(config)).toBe(true);
    });
  });

  describe('isCommandAllowed', () => {
    it('should allow all commands when allowedCommands is empty', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true, allowedCommands: [] };
      expect(isCommandAllowed('git status', config)).toBe(true);
      expect(isCommandAllowed('ls -la', config)).toBe(true);
    });

    it('should only allow commands in allowedCommands list', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        allowedCommands: ['git', 'npm', 'bun']
      };
      expect(isCommandAllowed('git status', config)).toBe(true);
      expect(isCommandAllowed('npm install', config)).toBe(true);
      expect(isCommandAllowed('curl http://example.com', config)).toBe(false);
    });

    it('should deny commands in deniedCommands list', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        deniedCommands: ['rm -rf', 'sudo']
      };
      expect(isCommandAllowed('rm -rf /', config)).toBe(false);
      expect(isCommandAllowed('sudo apt install', config)).toBe(false);
      expect(isCommandAllowed('rm file.txt', config)).toBe(true);
    });
  });

  describe('isPathAllowed', () => {
    it('should allow project path when allowedPaths is empty', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true, allowedPaths: [] };
      expect(isPathAllowed('/project/src', '/project', config)).toBe(true);
    });

    it('should deny paths outside project', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true, allowedPaths: [] };
      expect(isPathAllowed('/etc/passwd', '/project', config)).toBe(false);
    });

    it('should allow explicitly configured paths', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        allowedPaths: ['/project', '/tmp']
      };
      expect(isPathAllowed('/tmp/build', '/project', config)).toBe(true);
    });
  });

  describe('validateShellExecution', () => {
    it('should return error when shell is disabled', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: false };
      const result = validateShellExecution('git status', '/project', '/project', config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('should return error when command is denied', () => {
      const config: ShellConfig = {
        ...DEFAULT_SHELL_CONFIG,
        enabled: true,
        deniedCommands: ['sudo']
      };
      const result = validateShellExecution('sudo rm -rf /', '/project', '/project', config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });

    it('should return error when path is not allowed', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true };
      const result = validateShellExecution('ls', '/etc', '/project', config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('path');
    });

    it('should return allowed when all checks pass', () => {
      const config: ShellConfig = { ...DEFAULT_SHELL_CONFIG, enabled: true };
      const result = validateShellExecution('git status', '/project', '/project', config);
      expect(result.allowed).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { ShellConfig, ShellResult, ShellAuditEntry } from './shell';

describe('shell types', () => {
  it('should define ShellConfig with correct shape', () => {
    const config: ShellConfig = {
      enabled: false,
      allowedCommands: ['git', 'npm', 'bun'],
      deniedCommands: ['rm -rf', 'sudo'],
      defaultTimeout: 30000,
      maxTimeout: 300000,
      allowedPaths: ['/project'],
      auditEnabled: true
    };

    expect(config.enabled).toBe(false);
    expect(config.allowedCommands).toContain('git');
    expect(config.defaultTimeout).toBe(30000);
  });

  it('should define ShellResult with correct shape', () => {
    const result: ShellResult = {
      success: true,
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      command: 'ls -la',
      cwd: '/project',
      durationMs: 150
    };

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it('should define ShellAuditEntry with correct shape', () => {
    const entry: ShellAuditEntry = {
      timestamp: new Date().toISOString(),
      command: 'git status',
      cwd: '/project',
      exitCode: 0,
      durationMs: 100,
      userId: 'user-123',
      projectId: 'project-456'
    };

    expect(entry.command).toBe('git status');
  });
});

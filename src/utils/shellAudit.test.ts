import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShellAuditLogger, getShellAuditLogger, initShellAuditLogger } from './shellAudit';
import type { ShellAuditEntry } from '../types/shell';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('ShellAuditLogger', () => {
  let auditDir: string;
  let logger: ShellAuditLogger;

  beforeEach(() => {
    auditDir = join(tmpdir(), 'llpm-audit-test-' + Date.now());
    mkdirSync(auditDir, { recursive: true });
    logger = new ShellAuditLogger(auditDir);
  });

  afterEach(() => {
    if (existsSync(auditDir)) {
      rmSync(auditDir, { recursive: true, force: true });
    }
  });

  describe('log', () => {
    it('should write audit entry to file', async () => {
      const entry: ShellAuditEntry = {
        timestamp: new Date().toISOString(),
        command: 'git status',
        cwd: '/project',
        exitCode: 0,
        durationMs: 100,
        projectId: 'test-project'
      };

      await logger.log(entry);

      const files = readdirSync(auditDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should format entry as JSON', async () => {
      const entry: ShellAuditEntry = {
        timestamp: '2025-01-01T00:00:00.000Z',
        command: 'echo test',
        cwd: '/project',
        exitCode: 0,
        durationMs: 50
      };

      await logger.log(entry);

      const files = readdirSync(auditDir);
      const content = readFileSync(join(auditDir, files[0]), 'utf-8');
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const logged = JSON.parse(lastLine);

      expect(logged.command).toBe('echo test');
      expect(logged.exitCode).toBe(0);
    });
  });

  describe('getRecentEntries', () => {
    it('should return recent audit entries', async () => {
      const entry1: ShellAuditEntry = {
        timestamp: new Date().toISOString(),
        command: 'cmd1',
        cwd: '/project',
        exitCode: 0,
        durationMs: 100
      };

      const entry2: ShellAuditEntry = {
        timestamp: new Date().toISOString(),
        command: 'cmd2',
        cwd: '/project',
        exitCode: 0,
        durationMs: 200
      };

      await logger.log(entry1);
      await logger.log(entry2);

      const recent = await logger.getRecentEntries(10);
      expect(recent.length).toBe(2);
    });

    it('should return empty array when directory does not exist', async () => {
      const nonExistentLogger = new ShellAuditLogger('/non/existent/path');
      const entries = await nonExistentLogger.getRecentEntries(10);
      expect(entries).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await logger.log({
          timestamp: new Date().toISOString(),
          command: `cmd${i}`,
          cwd: '/project',
          exitCode: 0,
          durationMs: 100
        });
      }

      const recent = await logger.getRecentEntries(3);
      expect(recent.length).toBe(3);
    });

    it('should skip malformed JSON entries', async () => {
      await logger.log({
        timestamp: new Date().toISOString(),
        command: 'good command',
        cwd: '/project',
        exitCode: 0,
        durationMs: 100
      });

      // Write a malformed entry directly to the file
      const files = readdirSync(auditDir);
      const filePath = join(auditDir, files[0]);
      writeFileSync(filePath, '{ invalid json\n', { flag: 'a' });

      await logger.log({
        timestamp: new Date().toISOString(),
        command: 'another good command',
        cwd: '/project',
        exitCode: 0,
        durationMs: 100
      });

      const recent = await logger.getRecentEntries(10);
      // Should only get the valid entries, skipping the malformed one
      expect(recent.length).toBe(2);
      expect(recent[0].command).toBe('another good command');
      expect(recent[1].command).toBe('good command');
    });
  });

  describe('singleton functions', () => {
    it('should initialize and get audit logger', () => {
      const testDir = join(tmpdir(), 'llpm-singleton-test');
      const initialized = initShellAuditLogger(testDir);
      expect(initialized).toBeInstanceOf(ShellAuditLogger);

      const retrieved = getShellAuditLogger();
      expect(retrieved).toBe(initialized);
    });

    it('should initialize logger with auditDir parameter on first call', () => {
      const testDir = join(tmpdir(), 'llpm-param-init-test');
      const retrieved = getShellAuditLogger(testDir);
      expect(retrieved).toBeInstanceOf(ShellAuditLogger);
    });
  });
});

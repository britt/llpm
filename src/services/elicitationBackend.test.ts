import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock the config module
vi.mock('../utils/config', () => ({
  getConfigDir: vi.fn(() => '/tmp/llpm-test'),
}));

// Import after mocking
import { ElicitationBackend } from './elicitationBackend';

describe('ElicitationBackend', () => {
  let backend: ElicitationBackend;
  const testProjectId = 'test-project-123';
  const testDir = '/tmp/llpm-test/projects/test-project-123/elicitation';

  beforeEach(async () => {
    backend = new ElicitationBackend(testProjectId);
    // Clean up test directory
    try {
      await fs.rm('/tmp/llpm-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create the elicitation directory if it does not exist', async () => {
      await backend.initialize();

      const stat = await fs.stat(testDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await expect(backend.initialize()).resolves.not.toThrow();
    });
  });

  describe('getElicitationDir', () => {
    it('should return the correct elicitation directory path', () => {
      const dir = backend.getElicitationDir();
      expect(dir).toBe(testDir);
    });
  });
});

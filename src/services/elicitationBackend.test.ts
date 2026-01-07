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

  describe('createSession', () => {
    it('should create a new session with generated ID', async () => {
      await backend.initialize();

      const session = await backend.createSession('web-app', 'My Web App');

      expect(session.id).toBeDefined();
      expect(session.domain).toBe('web-app');
      expect(session.projectName).toBe('My Web App');
      expect(session.projectId).toBe(testProjectId);
      expect(session.status).toBe('in_progress');
      expect(session.sections).toHaveLength(5); // 5 standard sections
    });

    it('should persist session to filesystem', async () => {
      await backend.initialize();

      const session = await backend.createSession('api', 'My API');
      const filePath = path.join(testDir, `${session.id}.json`);

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedSession = JSON.parse(fileContent);

      expect(savedSession.id).toBe(session.id);
      expect(savedSession.domain).toBe('api');
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      await backend.initialize();
      const created = await backend.createSession('cli', 'My CLI');

      const retrieved = await backend.getSession(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.domain).toBe('cli');
    });

    it('should return null for non-existent session', async () => {
      await backend.initialize();

      const result = await backend.getSession('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update and persist session changes', async () => {
      await backend.initialize();
      const session = await backend.createSession('mobile', 'My App');

      session.currentSectionId = 'functional';
      session.sections[0].status = 'completed';
      await backend.updateSession(session);

      const retrieved = await backend.getSession(session.id);
      expect(retrieved!.currentSectionId).toBe('functional');
      expect(retrieved!.sections[0].status).toBe('completed');
    });
  });

  describe('getActiveSession', () => {
    it('should return the most recent in_progress session', async () => {
      await backend.initialize();
      await backend.createSession('web-app', 'Old Project');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const newer = await backend.createSession('api', 'New Project');

      const active = await backend.getActiveSession();

      expect(active).not.toBeNull();
      expect(active!.id).toBe(newer.id);
    });

    it('should return null if no active sessions', async () => {
      await backend.initialize();
      const session = await backend.createSession('cli', 'Done Project');
      session.status = 'completed';
      await backend.updateSession(session);

      const active = await backend.getActiveSession();

      expect(active).toBeNull();
    });
  });
});

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

  describe('recordAnswer', () => {
    it('should record an answer to the current section', async () => {
      await backend.initialize();
      const session = await backend.createSession('web-app', 'Test');

      const updated = await backend.recordAnswer(
        session.id,
        'q1',
        'What is the project name?',
        'My Awesome Project'
      );

      expect(updated.sections[0].answers).toHaveLength(1);
      expect(updated.sections[0].answers[0].answer).toBe('My Awesome Project');
      expect(updated.sections[0].answers[0].questionId).toBe('q1');
    });

    it('should update currentQuestionIndex after recording', async () => {
      await backend.initialize();
      const session = await backend.createSession('api', 'Test');

      await backend.recordAnswer(session.id, 'q1', 'Question 1?', 'Answer 1');
      const updated = await backend.recordAnswer(session.id, 'q2', 'Question 2?', 'Answer 2');

      expect(updated.sections[0].currentQuestionIndex).toBe(2);
      expect(updated.sections[0].answers).toHaveLength(2);
    });

    it('should throw if session not found', async () => {
      await backend.initialize();

      await expect(
        backend.recordAnswer('fake-id', 'q1', 'Q?', 'A')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('advanceSection', () => {
    it('should mark current section complete and move to next', async () => {
      await backend.initialize();
      const session = await backend.createSession('cli', 'Test');

      const updated = await backend.advanceSection(session.id);

      expect(updated.sections[0].status).toBe('completed');
      expect(updated.currentSectionId).toBe('functional');
      expect(updated.sections[1].status).toBe('in_progress');
    });

    it('should mark session complete when all sections done', async () => {
      await backend.initialize();
      const session = await backend.createSession('mobile', 'Test');

      // Advance through all 5 sections
      await backend.advanceSection(session.id);
      await backend.advanceSection(session.id);
      await backend.advanceSection(session.id);
      await backend.advanceSection(session.id);
      const final = await backend.advanceSection(session.id);

      expect(final.status).toBe('completed');
    });
  });

  describe('skipSection', () => {
    it('should mark current section skipped and move to next', async () => {
      await backend.initialize();
      const session = await backend.createSession('library', 'Test');

      const updated = await backend.skipSection(session.id);

      expect(updated.sections[0].status).toBe('skipped');
      expect(updated.currentSectionId).toBe('functional');
    });
  });

  describe('reopenSection', () => {
    it('should reopen a completed section for refinement', async () => {
      await backend.initialize();
      const session = await backend.createSession('infrastructure', 'Test');
      await backend.advanceSection(session.id);

      const updated = await backend.reopenSection(session.id, 'overview');

      expect(updated.currentSectionId).toBe('overview');
      expect(updated.sections[0].status).toBe('in_progress');
    });
  });

  describe('getAllQuestionsForSession', () => {
    it('should return combined base and domain questions', async () => {
      await backend.initialize();
      const session = await backend.createSession('cli', 'Test');

      const questions = await backend.getAllQuestionsForSession(session.id);

      // Should have base questions
      expect(questions.some(q => q.id === 'project-name')).toBe(true);
      // Should have domain-specific questions
      expect(questions.some(q => q.id === 'cli-commands')).toBe(true);
    });

    it('should throw if session not found', async () => {
      await backend.initialize();

      await expect(backend.getAllQuestionsForSession('fake-id')).rejects.toThrow('Session not found');
    });
  });

  describe('getNextQuestion', () => {
    it('should return the first question for a new session', async () => {
      await backend.initialize();
      const session = await backend.createSession('web-app', 'Test');

      const question = await backend.getNextQuestion(session.id);

      expect(question).not.toBeNull();
      expect(question!.section).toBe('overview');
      expect(question!.id).toBe('project-name');
    });

    it('should return next unanswered question in current section', async () => {
      await backend.initialize();
      const session = await backend.createSession('api', 'Test');
      await backend.recordAnswer(session.id, 'project-name', 'What is the project name?', 'My API');

      const question = await backend.getNextQuestion(session.id);

      expect(question).not.toBeNull();
      expect(question!.id).toBe('project-description');
    });

    it('should return null when session is completed', async () => {
      await backend.initialize();
      const session = await backend.createSession('general', 'Test');
      session.status = 'completed';
      await backend.updateSession(session);

      const question = await backend.getNextQuestion(session.id);

      expect(question).toBeNull();
    });

    it('should return null when all questions in section are answered', async () => {
      await backend.initialize();
      const session = await backend.createSession('general', 'Test');

      // Answer all overview questions
      await backend.recordAnswer(session.id, 'project-name', 'Q?', 'A');
      await backend.recordAnswer(session.id, 'project-description', 'Q?', 'A');
      await backend.recordAnswer(session.id, 'success-criteria', 'Q?', 'A');
      await backend.recordAnswer(session.id, 'target-users', 'Q?', 'A');

      const question = await backend.getNextQuestion(session.id);

      // No more questions in overview section
      expect(question).toBeNull();
    });
  });
});

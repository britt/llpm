import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { z } from 'zod';

// Mock dependencies
vi.mock('../utils/config', () => ({
  getConfigDir: vi.fn(() => '/tmp/llpm-elicit-test'),
}));

vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(() => Promise.resolve({ id: 'test-project', name: 'Test' })),
}));

import { startRequirementElicitation, recordRequirementAnswer } from './elicitationTools';

describe('startRequirementElicitation', () => {
  beforeEach(async () => {
    try {
      await fs.rm('/tmp/llpm-elicit-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-elicit-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should have correct tool metadata', () => {
    expect(startRequirementElicitation.description).toContain('requirement elicitation');
    expect(startRequirementElicitation.inputSchema).toBeDefined();
  });

  it('should accept valid domain input', () => {
    const schema = startRequirementElicitation.inputSchema;
    if (!schema) {
      throw new Error('inputSchema is undefined');
    }
    const result = schema.safeParse({
      domain: 'web-app',
      projectName: 'My Project',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid domain', () => {
    const schema = startRequirementElicitation.inputSchema;
    if (!schema) {
      throw new Error('inputSchema is undefined');
    }
    const result = schema.safeParse({
      domain: 'invalid-domain',
      projectName: 'My Project',
    });
    expect(result.success).toBe(false);
  });

  it('should create a new elicitation session', async () => {
    if (!startRequirementElicitation.execute) {
      throw new Error('execute is undefined');
    }
    const result = await startRequirementElicitation.execute({
      domain: 'api',
      projectName: 'My API Project',
    });

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.domain).toBe('api');
    expect(result.projectName).toBe('My API Project');
    expect(result.currentSection).toBe('overview');
  });

  it('should return first question in response', async () => {
    if (!startRequirementElicitation.execute) {
      throw new Error('execute is undefined');
    }
    const result = await startRequirementElicitation.execute({
      domain: 'cli',
      projectName: 'My CLI',
    });

    expect(result.success).toBe(true);
    expect(result.nextQuestion).toBeDefined();
    expect(result.nextQuestion.id).toBe('project-name');
  });
});

describe('recordRequirementAnswer', () => {
  beforeEach(async () => {
    try {
      await fs.rm('/tmp/llpm-elicit-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-elicit-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should have correct tool metadata', () => {
    expect(recordRequirementAnswer.description).toContain('answer');
    expect(recordRequirementAnswer.inputSchema).toBeDefined();
  });

  it('should record an answer and return next question', async () => {
    // First create a session
    const startResult = await startRequirementElicitation.execute({
      domain: 'web-app',
      projectName: 'Test Project',
    });

    const result = await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My Awesome Web App',
    });

    expect(result.success).toBe(true);
    expect(result.recorded).toBe(true);
    expect(result.nextQuestion).toBeDefined();
    expect(result.nextQuestion.id).toBe('project-description');
  });

  it('should indicate section completion when all questions answered', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    // Answer all overview questions (general domain has 4)
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'Test',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-description',
      answer: 'A test project',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'success-criteria',
      answer: 'It works',
    });
    const result = await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'target-users',
      answer: 'Developers',
    });

    expect(result.success).toBe(true);
    expect(result.sectionComplete).toBe(true);
  });

  it('should fail for invalid session', async () => {
    const result = await recordRequirementAnswer.execute({
      sessionId: 'invalid-session-id',
      questionId: 'project-name',
      answer: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Session not found');
  });
});

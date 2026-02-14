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

import {
  startRequirementElicitation,
  recordRequirementAnswer,
  getElicitationState,
  advanceElicitationSection,
  skipElicitationSection,
  refineRequirementSection,
  generateRequirementsDocument,
} from './elicitationTools';

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

describe('getElicitationState', () => {
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
    expect(getElicitationState.description).toContain('state');
    expect(getElicitationState.inputSchema).toBeDefined();
  });

  it('should return current session state', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'mobile',
      projectName: 'Mobile App',
    });

    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My Mobile App',
    });

    const result = await getElicitationState.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.domain).toBe('mobile');
    expect(result.projectName).toBe('Mobile App');
    expect(result.status).toBe('in_progress');
    expect(result.sections).toHaveLength(5);
    expect(result.capturedAnswers).toHaveLength(1);
    expect(result.capturedAnswers[0].answer).toBe('My Mobile App');
  });

  it('should return active session when no sessionId provided', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'library',
      projectName: 'My Library',
    });

    const result = await getElicitationState.execute({});

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(startResult.sessionId);
  });

  it('should indicate no active session when none exists', async () => {
    // Clean up any existing sessions
    try {
      await fs.rm('/tmp/llpm-elicit-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
    await fs.mkdir('/tmp/llpm-elicit-test/projects/test-project/elicitation', { recursive: true });

    const result = await getElicitationState.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active');
  });
});

describe('advanceElicitationSection', () => {
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

  it('should move to the next section', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    const result = await advanceElicitationSection.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.previousSection).toBe('overview');
    expect(result.currentSection).toBe('functional');
  });
});

describe('skipElicitationSection', () => {
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

  it('should skip current section and move to next', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    const result = await skipElicitationSection.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.skippedSection).toBe('overview');
    expect(result.currentSection).toBe('functional');
  });
});

describe('refineRequirementSection', () => {
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

  it('should reopen a completed section', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    // Advance to functional section first
    await advanceElicitationSection.execute({ sessionId: startResult.sessionId });

    // Now refine overview
    const result = await refineRequirementSection.execute({
      sessionId: startResult.sessionId,
      sectionId: 'overview',
    });

    expect(result.success).toBe(true);
    expect(result.currentSection).toBe('overview');
  });
});

describe('generateRequirementsDocument', () => {
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

  it('should generate a markdown document from captured answers', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'api',
      projectName: 'My API Service',
    });

    // Record some answers
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My API Service',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-description',
      answer: 'A REST API for managing user data',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'success-criteria',
      answer: '99.9% uptime, <100ms response time',
    });

    const result = await generateRequirementsDocument.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.document).toContain('# Project Requirements: My API Service');
    expect(result.document).toContain('api');
    expect(result.document).toContain('REST API for managing user data');
    expect(result.document).toContain('99.9% uptime');
  });

  it('should include domain in document header', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'web-app',
      projectName: 'Web Dashboard',
    });

    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'Web Dashboard',
    });

    const result = await generateRequirementsDocument.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.document).toContain('## Overview');
    expect(result.document).toContain('Domain: web-app');
  });

  it('should optionally save document to file', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'cli',
      projectName: 'My CLI Tool',
    });

    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My CLI Tool',
    });

    // Use a unique relative path that won't collide with real project directories
    const tempDir = `.tmp-elicit-test-${Date.now()}`;
    const outputPath = `${tempDir}/requirements.md`;

    try {
      const result = await generateRequirementsDocument.execute({
        sessionId: startResult.sessionId,
        outputPath,
      });

      expect(result.success).toBe(true);
      expect(result.savedTo).toBe(outputPath);

      const fileContent = await fs.readFile(outputPath, 'utf-8');
      expect(fileContent).toContain('My CLI Tool');
    } finally {
      await fs.rm(tempDir, { recursive: true });
    }
  });
});

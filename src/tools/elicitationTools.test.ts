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

import { startRequirementElicitation } from './elicitationTools';

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

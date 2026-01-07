import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('../utils/config', () => ({
  getConfigDir: vi.fn(() => '/tmp/llpm-integration-test'),
}));

vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(() => Promise.resolve({ id: 'integration-test-project', name: 'Test' })),
}));

import {
  startRequirementElicitation,
  recordRequirementAnswer,
  getElicitationState,
  advanceElicitationSection,
  generateRequirementsDocument,
} from '../tools/elicitationTools';

describe('Elicitation Integration Tests', () => {
  beforeEach(async () => {
    try {
      await fs.rm('/tmp/llpm-integration-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-integration-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should complete a full elicitation flow for web-app', async () => {
    // Start session
    const startResult = await startRequirementElicitation.execute({
      domain: 'web-app',
      projectName: 'E-Commerce Dashboard',
    });
    expect(startResult.success).toBe(true);
    const sessionId = startResult.sessionId;

    // Answer overview questions
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'project-name',
      answer: 'E-Commerce Dashboard',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'project-description',
      answer: 'A real-time dashboard for monitoring e-commerce sales and inventory',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'success-criteria',
      answer: 'Reduce time to insights from hours to seconds',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'target-users',
      answer: 'Store managers and inventory specialists',
    });

    // Advance to functional
    await advanceElicitationSection.execute({ sessionId });

    // Answer some functional questions
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'user-roles',
      answer: 'Admin (full access), Manager (view + actions), Viewer (read-only)',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'core-features',
      answer: 'Real-time sales chart, inventory alerts, order tracking, export reports',
    });

    // Check state
    const stateResult = await getElicitationState.execute({ sessionId });
    expect(stateResult.success).toBe(true);
    expect(stateResult.capturedAnswers.length).toBeGreaterThanOrEqual(6);

    // Generate document
    const docResult = await generateRequirementsDocument.execute({
      sessionId,
      outputPath: '/tmp/llpm-integration-test/docs/requirements.md',
    });
    expect(docResult.success).toBe(true);
    expect(docResult.document).toContain('E-Commerce Dashboard');
    expect(docResult.document).toContain('web-app');
    expect(docResult.document).toContain('Real-time sales chart');

    // Verify file was saved
    const savedContent = await fs.readFile('/tmp/llpm-integration-test/docs/requirements.md', 'utf-8');
    expect(savedContent).toBe(docResult.document);
  });

  it('should support session resumption', async () => {
    // Start and answer some questions
    const startResult = await startRequirementElicitation.execute({
      domain: 'cli',
      projectName: 'Data Migration CLI',
    });
    const sessionId = startResult.sessionId;

    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'project-name',
      answer: 'Data Migration CLI',
    });

    // Simulate "later" by getting state without sessionId
    const resumeResult = await getElicitationState.execute({});

    expect(resumeResult.success).toBe(true);
    expect(resumeResult.sessionId).toBe(sessionId);
    expect(resumeResult.projectName).toBe('Data Migration CLI');
    expect(resumeResult.capturedAnswers).toHaveLength(1);
  });
});

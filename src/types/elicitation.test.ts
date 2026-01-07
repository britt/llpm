import { describe, it, expect } from 'vitest';
import type {
  ElicitationSession,
  ElicitationSection,
  RequirementAnswer,
  ProjectDomain,
  SectionStatus,
} from './elicitation';

describe('Elicitation Types', () => {
  it('should define ProjectDomain as valid domain strings', () => {
    const domains: ProjectDomain[] = [
      'web-app',
      'api',
      'full-stack',
      'cli',
      'mobile',
      'data-pipeline',
      'library',
      'infrastructure',
      'ai-ml',
      'general',
    ];
    expect(domains).toHaveLength(10);
  });

  it('should define SectionStatus as valid status strings', () => {
    const statuses: SectionStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];
    expect(statuses).toHaveLength(4);
  });

  it('should define RequirementAnswer structure', () => {
    const answer: RequirementAnswer = {
      questionId: 'q1',
      question: 'What is the project name?',
      answer: 'My Project',
      timestamp: '2026-01-06T12:00:00Z',
      section: 'overview',
    };
    expect(answer.questionId).toBe('q1');
    expect(answer.section).toBe('overview');
  });

  it('should define ElicitationSection structure', () => {
    const section: ElicitationSection = {
      id: 'functional',
      name: 'Functional Requirements',
      status: 'pending',
      answers: [],
    };
    expect(section.status).toBe('pending');
  });

  it('should define ElicitationSession structure', () => {
    const session: ElicitationSession = {
      id: 'session-123',
      projectId: 'project-456',
      domain: 'web-app',
      projectName: 'My Web App',
      createdAt: '2026-01-06T12:00:00Z',
      updatedAt: '2026-01-06T12:00:00Z',
      sections: [],
      currentSectionId: 'overview',
      status: 'in_progress',
    };
    expect(session.domain).toBe('web-app');
    expect(session.status).toBe('in_progress');
  });
});

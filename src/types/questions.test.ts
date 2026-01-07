import { describe, it, expect } from 'vitest';
import {
  type Question,
  type QuestionCategory,
  type QuestionPriority,
  type QuestionSource,
  type ProjectQuestionsResult,
  type IssueQuestionsResult,
  isQuestion,
  createQuestion,
} from './questions';

describe('questions types', () => {
  describe('QuestionCategory', () => {
    it('should include all expected categories', () => {
      const categories: QuestionCategory[] = [
        'requirements',
        'technical',
        'documentation',
        'process',
        'consistency',
        'architecture',
      ];
      expect(categories).toHaveLength(6);
    });
  });

  describe('QuestionPriority', () => {
    it('should include all expected priorities', () => {
      const priorities: QuestionPriority[] = ['high', 'medium', 'low'];
      expect(priorities).toHaveLength(3);
    });
  });

  describe('isQuestion', () => {
    it('should return false for null', () => {
      expect(isQuestion(null)).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isQuestion({ id: 'q1' })).toBe(false);
    });

    it('should return true for valid Question', () => {
      const question = createQuestion({
        category: 'requirements',
        priority: 'high',
        question: 'What are the acceptance criteria?',
        context: 'Issue #42 has no acceptance criteria defined',
        source: {
          type: 'issue',
          reference: '#42',
          url: 'https://github.com/owner/repo/issues/42',
        },
      });
      expect(isQuestion(question)).toBe(true);
    });
  });

  describe('createQuestion', () => {
    it('should generate a unique id', () => {
      const q1 = createQuestion({
        category: 'technical',
        priority: 'medium',
        question: 'Question 1',
        context: 'Context 1',
        source: { type: 'file', reference: 'src/index.ts' },
      });
      const q2 = createQuestion({
        category: 'technical',
        priority: 'medium',
        question: 'Question 2',
        context: 'Context 2',
        source: { type: 'file', reference: 'src/index.ts' },
      });
      expect(q1.id).not.toBe(q2.id);
    });

    it('should set all required fields', () => {
      const question = createQuestion({
        category: 'documentation',
        priority: 'low',
        question: 'Should we add JSDoc?',
        context: 'No inline documentation found',
        source: { type: 'project-scan', reference: 'project.json#documentation' },
        suggestedAction: 'Add JSDoc comments to exported functions',
      });

      expect(question.category).toBe('documentation');
      expect(question.priority).toBe('low');
      expect(question.question).toBe('Should we add JSDoc?');
      expect(question.context).toBe('No inline documentation found');
      expect(question.source.type).toBe('project-scan');
      expect(question.suggestedAction).toBe('Add JSDoc comments to exported functions');
    });
  });
});

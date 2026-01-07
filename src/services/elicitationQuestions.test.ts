// src/services/elicitationQuestions.test.ts
import { describe, it, expect } from 'vitest';
import {
  getBaseQuestions,
  getDomainQuestions,
  getQuestionsForSection,
  type QuestionDefinition,
} from './elicitationQuestions';

describe('elicitationQuestions', () => {
  describe('getBaseQuestions', () => {
    it('should return questions for all 5 sections', () => {
      const questions = getBaseQuestions();

      const sections = [...new Set(questions.map(q => q.section))];
      expect(sections).toContain('overview');
      expect(sections).toContain('functional');
      expect(sections).toContain('nonfunctional');
      expect(sections).toContain('constraints');
      expect(sections).toContain('edge-cases');
    });

    it('should have required overview questions', () => {
      const questions = getBaseQuestions();
      const overviewQuestions = questions.filter(q => q.section === 'overview');

      expect(overviewQuestions.some(q => q.id === 'project-name')).toBe(true);
      expect(overviewQuestions.some(q => q.id === 'project-description')).toBe(true);
      expect(overviewQuestions.some(q => q.id === 'success-criteria')).toBe(true);
    });

    it('should have functional requirement questions', () => {
      const questions = getBaseQuestions();
      const functionalQuestions = questions.filter(q => q.section === 'functional');

      expect(functionalQuestions.some(q => q.id === 'user-roles')).toBe(true);
      expect(functionalQuestions.some(q => q.id === 'core-features')).toBe(true);
    });

    it('should mark some questions as required', () => {
      const questions = getBaseQuestions();
      const requiredQuestions = questions.filter(q => q.required);

      expect(requiredQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('getDomainQuestions', () => {
    it('should return domain-specific questions for web-app', () => {
      const questions = getDomainQuestions('web-app');

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.question.toLowerCase().includes('responsive') || q.id.includes('web'))).toBe(true);
    });

    it('should return domain-specific questions for api', () => {
      const questions = getDomainQuestions('api');

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.question.toLowerCase().includes('endpoint') || q.id.includes('api'))).toBe(true);
    });

    it('should return domain-specific questions for cli', () => {
      const questions = getDomainQuestions('cli');

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.question.toLowerCase().includes('command') || q.id.includes('cli'))).toBe(true);
    });

    it('should return empty array for general domain', () => {
      const questions = getDomainQuestions('general');

      expect(questions).toEqual([]);
    });
  });

  describe('getQuestionsForSection', () => {
    it('should combine base and domain questions for a section', () => {
      const questions = getQuestionsForSection('web-app', 'functional');

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every(q => q.section === 'functional')).toBe(true);
    });

    it('should return only base questions for general domain', () => {
      const baseQuestions = getBaseQuestions().filter(q => q.section === 'overview');
      const sectionQuestions = getQuestionsForSection('general', 'overview');

      expect(sectionQuestions.length).toBe(baseQuestions.length);
    });
  });
});

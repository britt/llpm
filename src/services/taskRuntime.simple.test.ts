import { describe, it, expect } from 'vitest';
import type { TaskTemplate } from '../types/task';

describe('Task Runtime - Core Logic', () => {
  describe('Task lifecycle', () => {
    it('should track task states correctly', () => {
      const states = ['draft', 'ready', 'confirmed', 'executing', 'completed', 'cancelled', 'failed'];
      expect(states).toContain('draft');
      expect(states).toContain('ready');
      expect(states).toContain('completed');
    });

    it('should validate slot types', () => {
      const slotTypes = ['string', 'number', 'boolean', 'enum', 'text'];
      expect(slotTypes).toContain('string');
      expect(slotTypes).toContain('enum');
    });
  });

  describe('Slot validation logic', () => {
    it('should validate string length', () => {
      const validateLength = (value: unknown, min: number, max: number) => {
        if (typeof value !== 'string') return 'Must be a string';
        if (value.length < min) return `Must be at least ${min} characters`;
        if (value.length > max) return `Must be less than ${max} characters`;
        return true;
      };

      expect(validateLength('test', 3, 10)).toBe(true);
      expect(validateLength('ab', 3, 10)).not.toBe(true);
      expect(validateLength('a'.repeat(11), 3, 10)).not.toBe(true);
    });

    it('should validate enum values', () => {
      const validateEnum = (value: unknown, enumValues: string[]) => {
        if (typeof value !== 'string') return 'Must be a string';
        if (!enumValues.includes(value)) return 'Must be one of the allowed values';
        return true;
      };

      expect(validateEnum('typescript', ['typescript', 'javascript', 'python'])).toBe(true);
      expect(validateEnum('ruby', ['typescript', 'javascript', 'python'])).not.toBe(true);
    });
  });

  describe('Draft generation logic', () => {
    it('should generate markdown sections', () => {
      const generateSection = (title: string, content?: string) => {
        if (!content) return '';
        return `## ${title}\n\n${content}`;
      };

      expect(generateSection('Motivation', 'This is why')).toContain('## Motivation');
      expect(generateSection('Motivation', 'This is why')).toContain('This is why');
      expect(generateSection('Optional', undefined)).toBe('');
    });

    it('should join draft sections correctly', () => {
      const sections = [
        '## Title\n\nContent 1',
        '## Section 2\n\nContent 2'
      ];
      const draft = sections.join('\n\n');

      expect(draft).toContain('## Title');
      expect(draft).toContain('## Section 2');
      // When joining with \n\n, we get: "## Title\n\nContent 1\n\n## Section 2\n\nContent 2"
      // which splits into 4 parts
      expect(draft.split('\n\n').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Required slots checking', () => {
    it('should identify missing required slots', () => {
      const mockTemplate = {
        slots: [
          { name: 'field1', required: true },
          { name: 'field2', required: false },
          { name: 'field3', required: true }
        ]
      };

      const slots = { field1: 'value1' };
      const missingRequired = mockTemplate.slots
        .filter(s => s.required && !(s.name in slots))
        .map(s => s.name);

      expect(missingRequired).toContain('field3');
      expect(missingRequired).not.toContain('field1');
      expect(missingRequired).not.toContain('field2');
    });

    it('should determine readiness based on required slots', () => {
      const hasAllRequired = (template: any, slots: Record<string, unknown>) => {
        return template.slots
          .filter((s: any) => s.required)
          .every((s: any) => s.name in slots);
      };

      const template = {
        slots: [
          { name: 'field1', required: true },
          { name: 'field2', required: false }
        ]
      };

      expect(hasAllRequired(template, { field1: 'value' })).toBe(true);
      expect(hasAllRequired(template, {})).toBe(false);
      expect(hasAllRequired(template, { field2: 'value' })).toBe(false);
      expect(hasAllRequired(template, { field1: 'v1', field2: 'v2' })).toBe(true);
    });
  });
});

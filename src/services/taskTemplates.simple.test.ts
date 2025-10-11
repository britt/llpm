import { describe, it, expect } from 'vitest';
import {
  issueAuthoringTemplate,
  createProjectTemplate,
  getTaskTemplate,
  getAllTaskTemplates,
  getTaskTemplatesByCategory
} from './taskTemplates';

describe('Task Templates', () => {
  describe('Issue Authoring Template', () => {
    it('should have correct template structure', () => {
      expect(issueAuthoringTemplate.id).toBe('github-issue-authoring');
      expect(issueAuthoringTemplate.name).toBeDefined();
      expect(issueAuthoringTemplate.category).toBe('github');
      expect(issueAuthoringTemplate.slots).toBeInstanceOf(Array);
      expect(issueAuthoringTemplate.slots.length).toBeGreaterThan(0);
    });

    it('should have required title and motivation slots', () => {
      const titleSlot = issueAuthoringTemplate.slots.find(s => s.name === 'title');
      const motivationSlot = issueAuthoringTemplate.slots.find(s => s.name === 'motivation');

      expect(titleSlot).toBeDefined();
      expect(titleSlot?.required).toBe(true);
      expect(motivationSlot).toBeDefined();
      expect(motivationSlot?.required).toBe(true);
    });

    it('should have optional slots', () => {
      const labelsSlot = issueAuthoringTemplate.slots.find(s => s.name === 'labels');
      const assigneeSlot = issueAuthoringTemplate.slots.find(s => s.name === 'assignee');

      expect(labelsSlot).toBeDefined();
      expect(labelsSlot?.required).toBe(false);
      expect(assigneeSlot).toBeDefined();
      expect(assigneeSlot?.required).toBe(false);
    });

    describe('title slot validation', () => {
      const titleSlot = issueAuthoringTemplate.slots.find(s => s.name === 'title');

      it('should reject short titles', () => {
        const result = titleSlot?.validation?.('ab');
        expect(result).not.toBe(true);
      });

      it('should accept valid titles', () => {
        const result = titleSlot?.validation?.('Fix login bug');
        expect(result).toBe(true);
      });

      it('should reject long titles', () => {
        const result = titleSlot?.validation?.('a'.repeat(101));
        expect(result).not.toBe(true);
      });
    });

    describe('motivation slot validation', () => {
      const motivationSlot = issueAuthoringTemplate.slots.find(s => s.name === 'motivation');

      it('should reject short motivations', () => {
        const result = motivationSlot?.validation?.('short');
        expect(result).not.toBe(true);
      });

      it('should accept valid motivations', () => {
        const result = motivationSlot?.validation?.('This is a valid motivation for the issue');
        expect(result).toBe(true);
      });
    });

    describe('draft generation', () => {
      it('should generate draft with only required fields', () => {
        const draft = issueAuthoringTemplate.generateDraft({
          title: 'Test Issue',
          motivation: 'This is the motivation'
        });

        expect(draft).toContain('## Motivation');
        expect(draft).toContain('This is the motivation');
        expect(draft).not.toContain('## Observed Behavior');
      });

      it('should generate draft with all fields', () => {
        const draft = issueAuthoringTemplate.generateDraft({
          title: 'Test Issue',
          motivation: 'This is the motivation',
          observedBehavior: 'The app crashes',
          reproSteps: '1. Open app\n2. Click button',
          suggestedInvestigation: 'Check memory leaks'
        });

        expect(draft).toContain('## Motivation');
        expect(draft).toContain('## Observed Behavior');
        expect(draft).toContain('## Reproduction Steps');
        expect(draft).toContain('## Suggested Investigation');
      });

      it('should omit optional sections when not provided', () => {
        const draft = issueAuthoringTemplate.generateDraft({
          title: 'Test Issue',
          motivation: 'This is the motivation',
          observedBehavior: 'The app crashes'
        });

        expect(draft).toContain('## Observed Behavior');
        expect(draft).not.toContain('## Reproduction Steps');
        expect(draft).not.toContain('## Suggested Investigation');
      });
    });
  });

  describe('Create Project Template', () => {
    it('should have correct template structure', () => {
      expect(createProjectTemplate.id).toBe('project-creation');
      expect(createProjectTemplate.name).toBeDefined();
      expect(createProjectTemplate.category).toBe('project');
      expect(createProjectTemplate.slots).toBeInstanceOf(Array);
    });

    it('should have required name and description slots', () => {
      const nameSlot = createProjectTemplate.slots.find(s => s.name === 'name');
      const descSlot = createProjectTemplate.slots.find(s => s.name === 'description');

      expect(nameSlot).toBeDefined();
      expect(nameSlot?.required).toBe(true);
      expect(descSlot).toBeDefined();
      expect(descSlot?.required).toBe(true);
    });

    describe('name slot validation', () => {
      const nameSlot = createProjectTemplate.slots.find(s => s.name === 'name');

      it('should reject short names', () => {
        const result = nameSlot?.validation?.('a');
        expect(result).not.toBe(true);
      });

      it('should reject invalid characters', () => {
        const result = nameSlot?.validation?.('invalid name!');
        expect(result).not.toBe(true);
      });

      it('should accept valid names', () => {
        expect(nameSlot?.validation?.('valid-project-name')).toBe(true);
        expect(nameSlot?.validation?.('name_with-123')).toBe(true);
      });
    });

    describe('language slot', () => {
      const languageSlot = createProjectTemplate.slots.find(s => s.name === 'language');

      it('should be an enum type', () => {
        expect(languageSlot?.type).toBe('enum');
      });

      it('should have valid language options', () => {
        expect(languageSlot?.enumValues).toContain('TypeScript');
        expect(languageSlot?.enumValues).toContain('Python');
        expect(languageSlot?.enumValues).toContain('Go');
      });

      it('should have TypeScript as default', () => {
        expect(languageSlot?.defaultValue).toBe('TypeScript');
      });
    });

    describe('draft generation', () => {
      it('should generate draft with minimal fields', () => {
        const draft = createProjectTemplate.generateDraft({
          name: 'test-project',
          description: 'A test project'
        });

        expect(draft).toContain('# test-project');
        expect(draft).toContain('A test project');
        expect(draft).not.toContain('## Language');
        expect(draft).not.toContain('## CI/CD');
      });

      it('should generate draft with all fields', () => {
        const draft = createProjectTemplate.generateDraft({
          name: 'test-project',
          description: 'A test project',
          language: 'TypeScript',
          repoName: 'my-repo',
          setupCI: true,
          ciType: 'advanced'
        });

        expect(draft).toContain('# test-project');
        expect(draft).toContain('## Language');
        expect(draft).toContain('TypeScript');
        expect(draft).toContain('## Repository');
        expect(draft).toContain('my-repo');
        expect(draft).toContain('## CI/CD');
        expect(draft).toContain('advanced');
      });

      it('should not show CI section when setupCI is false', () => {
        const draft = createProjectTemplate.generateDraft({
          name: 'test-project',
          description: 'A test project',
          setupCI: false
        });

        expect(draft).not.toContain('## CI/CD');
      });
    });
  });

  describe('Template Registry', () => {
    it('should get template by ID', () => {
      const template = getTaskTemplate('github-issue-authoring');
      expect(template).toBeDefined();
      expect(template?.id).toBe('github-issue-authoring');
    });

    it('should return undefined for nonexistent template', () => {
      const template = getTaskTemplate('nonexistent');
      expect(template).toBeUndefined();
    });

    it('should get all templates', () => {
      const templates = getAllTaskTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.map(t => t.id)).toContain('github-issue-authoring');
      expect(templates.map(t => t.id)).toContain('project-creation');
    });

    it('should filter templates by category', () => {
      const githubTemplates = getTaskTemplatesByCategory('github');
      expect(githubTemplates.length).toBeGreaterThan(0);
      expect(githubTemplates.every(t => t.category === 'github')).toBe(true);

      const projectTemplates = getTaskTemplatesByCategory('project');
      expect(projectTemplates.length).toBeGreaterThan(0);
      expect(projectTemplates.every(t => t.category === 'project')).toBe(true);
    });

    it('should return empty array for category with no templates', () => {
      const agentTemplates = getTaskTemplatesByCategory('agent');
      expect(agentTemplates).toEqual([]);
    });
  });
});

/**
 * Tests for SkillRegistry binary matching logic
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from './SkillRegistry';
import type { Skill } from '../types/skills';

describe('SkillRegistry - Binary Matching', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry({
      enabled: true,
      maxSkillsPerPrompt: 3,
      paths: [],
      requireConfirmationOnDeniedTool: false
    });
  });

  // Helper to add a skill to registry
  function addSkill(skill: Partial<Skill>) {
    const fullSkill: Skill = {
      name: skill.name || 'test-skill',
      description: skill.description || 'Test skill description',
      content: skill.content || '# Test Content',
      source: skill.source || 'personal',
      path: skill.path || '/test/path',
      enabled: skill.enabled !== undefined ? skill.enabled : true,
      tags: skill.tags,
      allowed_tools: skill.allowed_tools,
      vars: skill.vars,
      resources: skill.resources
    };
    (registry as any).skills.set(fullSkill.name, fullSkill);
  }

  describe('Name Matching', () => {
    it('should match skill when user message contains skill name', () => {
      addSkill({
        name: 'user-story-template',
        description: 'Guide writing user stories',
        tags: ['user-story', 'requirements']
      });

      const results = registry.findRelevant({
        userMessage: 'help me create a user-story-template'
      });

      expect(results).toHaveLength(1);
      expect(results[0].skill.name).toBe('user-story-template');
      expect(results[0].rationale).toBe('name match');
    });

    it('should be case insensitive for name matching', () => {
      addSkill({
        name: 'stakeholder-updates',
        description: 'Guide communication'
      });

      const results = registry.findRelevant({
        userMessage: 'I need help with STAKEHOLDER-UPDATES'
      });

      expect(results).toHaveLength(1);
      expect(results[0].skill.name).toBe('stakeholder-updates');
    });

    it('should not match disabled skills by name', () => {
      addSkill({
        name: 'disabled-skill',
        description: 'This skill is disabled',
        enabled: false
      });

      const results = registry.findRelevant({
        userMessage: 'use disabled-skill'
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('Tag Matching', () => {
    it('should match skill when user message contains any tag', () => {
      addSkill({
        name: 'pm-skill',
        description: 'Product management skill',
        tags: ['communication', 'stakeholders', 'reporting']
      });

      const results = registry.findRelevant({
        userMessage: 'help me with stakeholders'
      });

      expect(results).toHaveLength(1);
      expect(results[0].skill.name).toBe('pm-skill');
      expect(results[0].rationale).toContain('tag: stakeholders');
    });

    it('should be case insensitive for tag matching', () => {
      addSkill({
        name: 'test-skill',
        description: 'Test',
        tags: ['Testing', 'QA']
      });

      const results = registry.findRelevant({
        userMessage: 'run qa checks'
      });

      expect(results).toHaveLength(1);
      expect(results[0].skill.name).toBe('test-skill');
    });

    it('should match first tag found', () => {
      addSkill({
        name: 'multi-tag-skill',
        description: 'Multiple tags',
        tags: ['alpha', 'beta', 'gamma']
      });

      const results = registry.findRelevant({
        userMessage: 'beta and gamma'
      });

      expect(results).toHaveLength(1);
      // Should match first tag encountered
      expect(results[0].rationale).toMatch(/tag: (beta|gamma)/);
    });
  });

  describe.skip('Description Keyword Matching', () => {
    it('should match skill when message has keyword overlap with description', () => {
      addSkill({
        name: 'writing-skill',
        description: 'Guide writing documentation and technical specs'
      });

      const results = registry.findRelevant({
        userMessage: 'need help writing documentation'
      });

      expect(results).toHaveLength(1);
      expect(results[0].skill.name).toBe('writing-skill');
      expect(results[0].rationale).toBe('description keywords');
    });

    it('should filter out short words (<=3 chars) in description', () => {
      addSkill({
        name: 'test-skill',
        description: 'A test for the system'
      });

      const results = registry.findRelevant({
        userMessage: 'the for a'
      });

      // Should not match on short words
      expect(results).toHaveLength(0);
    });

    it('should match on longer words', () => {
      addSkill({
        name: 'analysis-skill',
        description: 'Perform detailed analysis of codebase architecture'
      });

      const results = registry.findRelevant({
        userMessage: 'analyze the architecture'
      });

      expect(results).toHaveLength(1);
      expect(results[0].rationale).toBe('description keywords');
    });
  });

  describe('Priority and Ordering', () => {
    it('should prioritize name match over tag match (alphabetical)', () => {
      addSkill({
        name: 'alpha-skill',
        description: 'Alpha description',
        tags: ['test']
      });
      addSkill({
        name: 'beta-skill',
        description: 'Beta description',
        tags: ['alpha-skill'] // tag matches the other skill's name
      });

      const results = registry.findRelevant({
        userMessage: 'alpha-skill'
      });

      // Both should match, but alpha-skill by name, beta-skill by tag
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].skill.name).toBe('alpha-skill');
      expect(results[0].rationale).toBe('name match');
    });

    it('should sort results alphabetically', () => {
      addSkill({
        name: 'zebra-skill',
        description: 'Last alphabetically',
        tags: ['common']
      });
      addSkill({
        name: 'alpha-skill',
        description: 'First alphabetically',
        tags: ['common']
      });
      addSkill({
        name: 'middle-skill',
        description: 'Middle alphabetically',
        tags: ['common']
      });

      const results = registry.findRelevant({
        userMessage: 'common task'
      });

      expect(results).toHaveLength(3);
      expect(results[0].skill.name).toBe('alpha-skill');
      expect(results[1].skill.name).toBe('middle-skill');
      expect(results[2].skill.name).toBe('zebra-skill');
    });
  });

  describe('Limit Enforcement', () => {
    it('should respect maxSkillsPerPrompt limit', () => {
      // Add 5 skills that all match
      addSkill({ name: 'skill-1', tags: ['match'] });
      addSkill({ name: 'skill-2', tags: ['match'] });
      addSkill({ name: 'skill-3', tags: ['match'] });
      addSkill({ name: 'skill-4', tags: ['match'] });
      addSkill({ name: 'skill-5', tags: ['match'] });

      const results = registry.findRelevant({
        userMessage: 'match this'
      });

      // Should return max 3 (default limit)
      expect(results).toHaveLength(3);
      // Should return first 3 alphabetically
      expect(results[0].skill.name).toBe('skill-1');
      expect(results[1].skill.name).toBe('skill-2');
      expect(results[2].skill.name).toBe('skill-3');
    });

    it('should use custom maxSkillsPerPrompt if configured', () => {
      const customRegistry = new SkillRegistry({
        enabled: true,
        maxSkillsPerPrompt: 2,
        paths: [],
        requireConfirmationOnDeniedTool: false
      });

      // Add skills to custom registry
      (customRegistry as any).skills.set('skill-1', {
        name: 'skill-1',
        description: 'Test',
        content: 'Test',
        source: 'personal' as const,
        path: '/test',
        enabled: true,
        tags: ['match']
      });
      (customRegistry as any).skills.set('skill-2', {
        name: 'skill-2',
        description: 'Test',
        content: 'Test',
        source: 'personal' as const,
        path: '/test',
        enabled: true,
        tags: ['match']
      });
      (customRegistry as any).skills.set('skill-3', {
        name: 'skill-3',
        description: 'Test',
        content: 'Test',
        source: 'personal' as const,
        path: '/test',
        enabled: true,
        tags: ['match']
      });

      const results = customRegistry.findRelevant({
        userMessage: 'match this'
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('No Match Scenarios', () => {
    it('should return empty array when no skills match', () => {
      addSkill({
        name: 'specific-skill',
        description: 'Very specific functionality',
        tags: ['specific', 'unique']
      });

      const results = registry.findRelevant({
        userMessage: 'completely unrelated request'
      });

      expect(results).toHaveLength(0);
    });

    it('should return empty array when all matching skills are disabled', () => {
      addSkill({
        name: 'disabled-1',
        description: 'Test skill',
        enabled: false,
        tags: ['test']
      });
      addSkill({
        name: 'disabled-2',
        description: 'Test skill',
        enabled: false,
        tags: ['test']
      });

      const results = registry.findRelevant({
        userMessage: 'test'
      });

      expect(results).toHaveLength(0);
    });

    it('should return empty array when user message is empty', () => {
      addSkill({
        name: 'any-skill',
        description: 'Any description',
        tags: ['any']
      });

      const results = registry.findRelevant({
        userMessage: ''
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('generatePromptAugmentation', () => {
    it('should generate prompt content for selected skills', async () => {
      const skill: Skill = {
        name: 'test-skill',
        description: 'Test description',
        content: '# Test Instructions\n\nFollow these steps...',
        source: 'personal',
        path: '/test/path',
        enabled: true
      };

      const result = await registry.generatePromptAugmentation([skill]);

      expect(result).toContain('## test-skill');
      expect(result).toContain('Test description');
      expect(result).toContain('# Test Instructions');
    });

    it('should return empty string for empty skills array', async () => {
      const result = await registry.generatePromptAugmentation([]);

      expect(result).toBe('');
    });

    it('should apply variable substitution', async () => {
      const skill: Skill = {
        name: 'var-skill',
        description: 'Has variables',
        content: 'Project: {{projectName}}\nOwner: {{owner}}',
        source: 'personal',
        path: '/test/path',
        enabled: true,
        vars: {
          projectName: 'MyProject',
          owner: 'John Doe'
        }
      };

      const result = await registry.generatePromptAugmentation([skill]);

      expect(result).toContain('Project: MyProject');
      expect(result).toContain('Owner: John Doe');
    });
  });
});

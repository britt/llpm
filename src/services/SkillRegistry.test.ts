/**
 * Tests for SkillRegistry binary matching logic
 *
 * Updated for Agent Skills specification (agentskills.io)
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
      enforceAllowedTools: false
    });
  });

  // Helper to add a skill to registry
  function addSkill(skill: Partial<Skill>) {
    const fullSkill: Skill = {
      name: skill.name || 'test-skill',
      description: skill.description || 'Test skill description',
      content: skill.content || '# Test Content',
      source: skill.source || 'user',
      path: skill.path || '/test/path',
      enabled: skill.enabled !== undefined ? skill.enabled : true,
      license: skill.license,
      compatibility: skill.compatibility,
      metadata: skill.metadata,
      allowedTools: skill.allowedTools
    };
    (registry as any).skills.set(fullSkill.name, fullSkill);
  }

  describe('Name Matching', () => {
    it('should match skill when user message contains skill name', () => {
      addSkill({
        name: 'user-story-template',
        description: 'Guide writing user stories'
      });

      const results = registry.findRelevant({
        userMessage: 'help me create a user-story-template'
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.skill.name).toBe('user-story-template');
      expect(results[0]?.rationale).toBe('name match');
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
      expect(results[0]?.skill.name).toBe('stakeholder-updates');
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

  describe('Description Keyword Matching', () => {
    it('should match skill when user message contains description keywords', () => {
      addSkill({
        name: 'pm-skill',
        description: 'Product management skill for communication and stakeholders reporting'
      });

      const results = registry.findRelevant({
        userMessage: 'help me with stakeholders'
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.skill.name).toBe('pm-skill');
      expect(results[0]?.rationale).toContain('keyword: stakeholders');
    });

    it('should be case insensitive for keyword matching', () => {
      addSkill({
        name: 'test-skill',
        description: 'Testing and quality assurance procedures'
      });

      const results = registry.findRelevant({
        userMessage: 'run quality checks'
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.skill.name).toBe('test-skill');
    });

    it('should filter out common words in description matching', () => {
      addSkill({
        name: 'writing-skill',
        description: 'Guide for the writing of documentation'
      });

      // Common words like 'the', 'for', 'of' should not match
      const results = registry.findRelevant({
        userMessage: 'the for of'
      });

      expect(results).toHaveLength(0);
    });

    it('should match on meaningful words from description', () => {
      addSkill({
        name: 'analysis-skill',
        description: 'Perform detailed analysis of codebase architecture'
      });

      const results = registry.findRelevant({
        userMessage: 'analyze the architecture'
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.rationale).toContain('keyword:');
    });
  });

  describe('Priority and Ordering', () => {
    it('should prioritize name match (alphabetical ordering)', () => {
      addSkill({
        name: 'alpha-skill',
        description: 'Alpha skill description with unique keywords'
      });
      addSkill({
        name: 'beta-skill',
        description: 'Beta skill that mentions alpha-skill in description'
      });

      const results = registry.findRelevant({
        userMessage: 'alpha-skill'
      });

      // alpha-skill should match by name
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.skill.name).toBe('alpha-skill');
      expect(results[0]?.rationale).toBe('name match');
    });

    it('should sort results alphabetically', () => {
      addSkill({
        name: 'zebra-skill',
        description: 'Last alphabetically with common keyword'
      });
      addSkill({
        name: 'alpha-skill',
        description: 'First alphabetically with common keyword'
      });
      addSkill({
        name: 'middle-skill',
        description: 'Middle alphabetically with common keyword'
      });

      const results = registry.findRelevant({
        userMessage: 'common task with keyword'
      });

      expect(results).toHaveLength(3);
      expect(results[0]?.skill.name).toBe('alpha-skill');
      expect(results[1]?.skill.name).toBe('middle-skill');
      expect(results[2]?.skill.name).toBe('zebra-skill');
    });
  });

  describe('Limit Enforcement', () => {
    it('should respect maxSkillsPerPrompt limit', () => {
      // Add 5 skills that all match on "documentation"
      addSkill({ name: 'skill-1', description: 'Documentation helper' });
      addSkill({ name: 'skill-2', description: 'Documentation writer' });
      addSkill({ name: 'skill-3', description: 'Documentation reviewer' });
      addSkill({ name: 'skill-4', description: 'Documentation generator' });
      addSkill({ name: 'skill-5', description: 'Documentation formatter' });

      const results = registry.findRelevant({
        userMessage: 'help with documentation'
      });

      // Should return max 3 (default limit)
      expect(results).toHaveLength(3);
      // Should return first 3 alphabetically
      expect(results[0]?.skill.name).toBe('skill-1');
      expect(results[1]?.skill.name).toBe('skill-2');
      expect(results[2]?.skill.name).toBe('skill-3');
    });

    it('should use custom maxSkillsPerPrompt if configured', () => {
      const customRegistry = new SkillRegistry({
        enabled: true,
        maxSkillsPerPrompt: 2,
        paths: [],
        enforceAllowedTools: false
      });

      // Add skills to custom registry
      (customRegistry as any).skills.set('skill-1', {
        name: 'skill-1',
        description: 'Documentation helper',
        content: 'Test',
        source: 'user' as const,
        path: '/test',
        enabled: true
      });
      (customRegistry as any).skills.set('skill-2', {
        name: 'skill-2',
        description: 'Documentation writer',
        content: 'Test',
        source: 'user' as const,
        path: '/test',
        enabled: true
      });
      (customRegistry as any).skills.set('skill-3', {
        name: 'skill-3',
        description: 'Documentation reviewer',
        content: 'Test',
        source: 'user' as const,
        path: '/test',
        enabled: true
      });

      const results = customRegistry.findRelevant({
        userMessage: 'help with documentation'
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('No Match Scenarios', () => {
    it('should return empty array when no skills match', () => {
      addSkill({
        name: 'specific-skill',
        description: 'Very specific functionality for unique tasks'
      });

      const results = registry.findRelevant({
        userMessage: 'completely unrelated request about something else'
      });

      expect(results).toHaveLength(0);
    });

    it('should return empty array when all matching skills are disabled', () => {
      addSkill({
        name: 'disabled-1',
        description: 'Test skill for testing purposes',
        enabled: false
      });
      addSkill({
        name: 'disabled-2',
        description: 'Another test skill for testing',
        enabled: false
      });

      const results = registry.findRelevant({
        userMessage: 'testing'
      });

      expect(results).toHaveLength(0);
    });

    it('should return empty array when user message is empty', () => {
      addSkill({
        name: 'any-skill',
        description: 'Any description with keywords'
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
        source: 'user',
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

    it('should include skill content without modification', async () => {
      const skill: Skill = {
        name: 'content-skill',
        description: 'Has content with placeholders',
        content: 'Project: {{projectName}}\nOwner: {{owner}}',
        source: 'user',
        path: '/test/path',
        enabled: true
      };

      const result = await registry.generatePromptAugmentation([skill]);

      // Content should be included as-is (no variable substitution in Agent Skills spec)
      expect(result).toContain('Project: {{projectName}}');
      expect(result).toContain('Owner: {{owner}}');
    });
  });

  describe('isToolAllowed', () => {
    it('should allow all tools when no skills have restrictions', () => {
      const skill: Skill = {
        name: 'no-restrictions',
        description: 'Skill without tool restrictions',
        content: 'Content',
        source: 'user',
        path: '/test',
        enabled: true
        // No allowedTools
      };

      const allowed = registry.isToolAllowed('AnyTool', [skill]);
      expect(allowed).toBe(true);
    });

    it('should allow tools listed in allowedTools', () => {
      const skill: Skill = {
        name: 'restricted',
        description: 'Skill with restrictions',
        content: 'Content',
        source: 'user',
        path: '/test',
        enabled: true,
        allowedTools: ['Read', 'Write', 'Bash(git:*)']
      };

      expect(registry.isToolAllowed('Read', [skill])).toBe(true);
      expect(registry.isToolAllowed('Write', [skill])).toBe(true);
    });

    it('should deny tools not in allowedTools when enforceAllowedTools is true', () => {
      const enforcingRegistry = new SkillRegistry({
        enabled: true,
        maxSkillsPerPrompt: 3,
        paths: [],
        enforceAllowedTools: true
      });

      const skill: Skill = {
        name: 'restricted',
        description: 'Skill with restrictions',
        content: 'Content',
        source: 'user',
        path: '/test',
        enabled: true,
        allowedTools: ['Read', 'Write']
      };

      expect(enforcingRegistry.isToolAllowed('Delete', [skill])).toBe(false);
    });

    it('should match tool patterns like Bash(git:*)', () => {
      const skill: Skill = {
        name: 'git-skill',
        description: 'Git operations',
        content: 'Content',
        source: 'user',
        path: '/test',
        enabled: true,
        allowedTools: ['Bash(git:*)']
      };

      // Pattern should match Bash tool
      expect(registry.isToolAllowed('Bash', [skill])).toBe(true);
    });
  });
});

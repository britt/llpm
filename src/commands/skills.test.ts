/**
 * Integration tests for /skills command
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { skillsCommand } from './skills';
import { getSkillRegistry } from '../services/SkillRegistry';
import type { Skill } from '../types/skills';

// Mock the skill registry
vi.mock('../services/SkillRegistry', () => {
  let mockSkills = new Map<string, Skill>();

  const mockRegistry = {
    getAllSkills: () => Array.from(mockSkills.values()),
    getSkill: (name: string) => mockSkills.get(name),
    enableSkill: (name: string) => {
      const skill = mockSkills.get(name);
      if (skill) skill.enabled = true;
    },
    disableSkill: (name: string) => {
      const skill = mockSkills.get(name);
      if (skill) skill.enabled = false;
    },
    scan: vi.fn(async () => {
      // Simulate rescanning by keeping existing skills
    }),
    // Expose for test setup
    _setMockSkills: (skills: Map<string, Skill>) => {
      mockSkills = skills;
    },
    _resetMockSkills: () => {
      mockSkills = new Map();
    }
  };

  return {
    getSkillRegistry: () => mockRegistry
  };
});

describe('/skills command', () => {
  beforeEach(() => {
    // Reset mock skills before each test
    (getSkillRegistry() as any)._resetMockSkills();
  });

  // Helper to add a mock skill
  function addMockSkill(skill: Partial<Skill>) {
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

    const registry = getSkillRegistry() as any;
    const mockSkills = new Map(registry.getAllSkills().map((s: Skill) => [s.name, s]));
    mockSkills.set(fullSkill.name, fullSkill);
    registry._setMockSkills(mockSkills);
  }

  describe('list command', () => {
    it('should list all discovered skills', async () => {
      addMockSkill({
        name: 'skill-1',
        description: 'First skill',
        source: 'personal',
        enabled: true
      });
      addMockSkill({
        name: 'skill-2',
        description: 'Second skill',
        source: 'project',
        enabled: false
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('skill-1');
      expect(result.content).toContain('skill-2');
      expect(result.content).toContain('First skill');
      expect(result.content).toContain('Second skill');
      expect(result.content).toContain('Total: 2 skill(s)');
    });

    it('should show enabled/disabled status', async () => {
      addMockSkill({
        name: 'enabled-skill',
        enabled: true
      });
      addMockSkill({
        name: 'disabled-skill',
        enabled: false
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('✓ enabled');
      expect(result.content).toContain('✗ disabled');
    });

    it('should group skills by source', async () => {
      addMockSkill({
        name: 'personal-skill',
        source: 'personal'
      });
      addMockSkill({
        name: 'project-skill',
        source: 'project'
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('## Personal Skills');
      expect(result.content).toContain('## Project Skills');
    });

    it('should display tags when present', async () => {
      addMockSkill({
        name: 'tagged-skill',
        tags: ['tag1', 'tag2', 'tag3']
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('Tags: tag1, tag2, tag3');
    });

    it('should display allowed_tools when present', async () => {
      addMockSkill({
        name: 'restricted-skill',
        allowed_tools: ['github', 'shell']
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('Allowed tools: github, shell');
    });

    it('should show message when no skills discovered', async () => {
      const result = await skillsCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No skills discovered');
    });

    it('should show enabled count', async () => {
      addMockSkill({ name: 'skill-1', enabled: true });
      addMockSkill({ name: 'skill-2', enabled: true });
      addMockSkill({ name: 'skill-3', enabled: false });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('Total: 3 skill(s)');
      expect(result.content).toContain('Enabled: 2 skill(s)');
    });
  });

  describe('test command', () => {
    it('should preview a skill without activating', async () => {
      addMockSkill({
        name: 'test-skill',
        description: 'A test skill',
        content: '# Instructions\n\nFollow these steps...',
        tags: ['test', 'demo'],
        vars: { projectName: 'MyProject' },
        enabled: true
      });

      const result = await skillsCommand.execute(['test', 'test-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('test-skill');
      expect(result.content).toContain('A test skill');
      expect(result.content).toContain('**Tags:** test, demo');
      expect(result.content).toContain('{{projectName}}');
      expect(result.content).toContain('# Instructions');
    });

    it('should show allowed_tools in test output', async () => {
      addMockSkill({
        name: 'restricted-skill',
        allowed_tools: ['github', 'notes']
      });

      const result = await skillsCommand.execute(['test', 'restricted-skill']);

      expect(result.content).toContain('**Allowed Tools:** github, notes');
      expect(result.content).toContain('restrict tool usage');
    });

    it('should return error when skill not found', async () => {
      const result = await skillsCommand.execute(['test', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Skill not found: nonexistent');
    });

    it('should return error when no skill name provided', async () => {
      const result = await skillsCommand.execute(['test']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /skills test <skill-name>');
    });
  });

  describe('enable command', () => {
    it('should enable a disabled skill', async () => {
      addMockSkill({
        name: 'disabled-skill',
        enabled: false
      });

      const result = await skillsCommand.execute(['enable', 'disabled-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('✓ Enabled skill: disabled-skill');

      const skill = getSkillRegistry().getSkill('disabled-skill');
      expect(skill?.enabled).toBe(true);
    });

    it('should show message when skill already enabled', async () => {
      addMockSkill({
        name: 'enabled-skill',
        enabled: true
      });

      const result = await skillsCommand.execute(['enable', 'enabled-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('already enabled');
    });

    it('should return error when skill not found', async () => {
      const result = await skillsCommand.execute(['enable', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Skill not found: nonexistent');
    });

    it('should return error when no skill name provided', async () => {
      const result = await skillsCommand.execute(['enable']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /skills enable <skill-name>');
    });
  });

  describe('disable command', () => {
    it('should disable an enabled skill', async () => {
      addMockSkill({
        name: 'enabled-skill',
        enabled: true
      });

      const result = await skillsCommand.execute(['disable', 'enabled-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('✓ Disabled skill: enabled-skill');

      const skill = getSkillRegistry().getSkill('enabled-skill');
      expect(skill?.enabled).toBe(false);
    });

    it('should show message when skill already disabled', async () => {
      addMockSkill({
        name: 'disabled-skill',
        enabled: false
      });

      const result = await skillsCommand.execute(['disable', 'disabled-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('already disabled');
    });

    it('should return error when skill not found', async () => {
      const result = await skillsCommand.execute(['disable', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Skill not found: nonexistent');
    });

    it('should return error when no skill name provided', async () => {
      const result = await skillsCommand.execute(['disable']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /skills disable <skill-name>');
    });
  });

  describe('reload command', () => {
    it('should rescan and report success', async () => {
      addMockSkill({ name: 'skill-1' });
      addMockSkill({ name: 'skill-2' });

      const result = await skillsCommand.execute(['reload']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Skills reloaded successfully');
      expect(result.content).toContain('Discovered 2 skill(s)');
    });

    it('should call registry.scan()', async () => {
      const registry = getSkillRegistry();
      const scanSpy = vi.spyOn(registry, 'scan');

      await skillsCommand.execute(['reload']);

      expect(scanSpy).toHaveBeenCalled();
    });
  });

  describe('help command', () => {
    it('should show help message', async () => {
      const result = await skillsCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Skills Command');
      expect(result.content).toContain('Usage');
      expect(result.content).toContain('/skills list');
      expect(result.content).toContain('/skills test');
      expect(result.content).toContain('/skills enable');
      expect(result.content).toContain('/skills disable');
      expect(result.content).toContain('/skills reload');
    });

    it('should explain how skills work', async () => {
      const result = await skillsCommand.execute(['help']);

      expect(result.content).toContain('How Skills Work');
      expect(result.content).toContain('Name match');
      expect(result.content).toContain('Tag match');
      expect(result.content).toContain('Description keywords');
    });

    it('should show default when no subcommand provided', async () => {
      const result = await skillsCommand.execute([]);

      // Default is 'list', but if empty shows help
      expect(result.success).toBe(true);
    });
  });

  describe('invalid subcommand', () => {
    it('should show help for unknown subcommand', async () => {
      const result = await skillsCommand.execute(['invalid']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Skills Command');
    });
  });

  describe('command metadata', () => {
    it('should have correct name', () => {
      expect(skillsCommand.name).toBe('skills');
    });

    it('should have description', () => {
      expect(skillsCommand.description).toBeTruthy();
      expect(skillsCommand.description).toContain('Agent Skills');
    });

    it('should have execute function', () => {
      expect(typeof skillsCommand.execute).toBe('function');
    });
  });
});

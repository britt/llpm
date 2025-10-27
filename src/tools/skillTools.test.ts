/**
import * as z from 'zod';
 * Tests for skill management tools
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSkillsTool, listAvailableSkillsTool } from './skillTools';
import type { Skill } from '../types/skills';

// Mock the SkillRegistry
vi.mock('../services/SkillRegistry', () => {
  let mockSkills = new Map<string, Skill>();

  const mockRegistry = {
    getAllSkills: () => Array.from(mockSkills.values()),
    getSkill: (name: string) => mockSkills.get(name),
    generatePromptAugmentation: vi.fn(async (skills: Skill[]) => {
      return skills.map(s => `## ${s.name}\n${s.content}`).join('\n\n');
    }),
    emit: vi.fn(),
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

import { getSkillRegistry } from '../services/SkillRegistry';

describe('Skill Tools', () => {
  beforeEach(() => {
    (getSkillRegistry() as any)._resetMockSkills();
  });

  describe('load_skills', () => {
    it('should load a single skill successfully', async () => {
      const skill: Skill = {
        name: 'test-skill',
        description: 'A test skill',
        content: 'Test skill content',
        source: 'personal',
        path: '/test/path',
        enabled: true
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('test-skill', skill);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (loadSkillsTool.execute as any)({
        skill_names: ['test-skill']
      });

      expect(result.success).toBe(true);
      expect(result.loaded_count).toBe(1);
      expect(result.failed_count).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.loaded).toBe(true);
      expect(result.results[0]!.name).toBe('test-skill');
      expect(result.skills_content).toContain('test-skill');
      expect(result.skills_content).toContain('Test skill content');
    });

    it('should load multiple skills successfully', async () => {
      const skill1: Skill = {
        name: 'skill-1',
        description: 'First skill',
        content: 'Content 1',
        source: 'personal',
        path: '/test/path1',
        enabled: true
      };

      const skill2: Skill = {
        name: 'skill-2',
        description: 'Second skill',
        content: 'Content 2',
        source: 'personal',
        path: '/test/path2',
        enabled: true
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('skill-1', skill1);
      skillsMap.set('skill-2', skill2);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (loadSkillsTool.execute as any)({
        skill_names: ['skill-1', 'skill-2']
      });

      expect(result.success).toBe(true);
      expect(result.loaded_count).toBe(2);
      expect(result.failed_count).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.skills_content).toContain('skill-1');
      expect(result.skills_content).toContain('skill-2');
    });

    it('should handle skill not found', async () => {
      const result = await (loadSkillsTool.execute as any)({
        skill_names: ['nonexistent-skill']
      });

      expect(result.success).toBe(false);
      expect(result.loaded_count).toBe(0);
      expect(result.failed_count).toBe(1);
      expect(result.results[0]!.loaded).toBe(false);
      expect(result.results[0]!.error).toBe('Skill not found');
    });

    it('should handle disabled skill', async () => {
      const skill: Skill = {
        name: 'disabled-skill',
        description: 'A disabled skill',
        content: 'Content',
        source: 'personal',
        path: '/test/path',
        enabled: false
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('disabled-skill', skill);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (loadSkillsTool.execute as any)({
        skill_names: ['disabled-skill']
      });

      expect(result.success).toBe(false);
      expect(result.loaded_count).toBe(0);
      expect(result.failed_count).toBe(1);
      expect(result.results[0]!.error).toBe('Skill is disabled');
    });

    it('should include reason in output when provided', async () => {
      const skill: Skill = {
        name: 'test-skill',
        description: 'A test skill',
        content: 'Test content',
        source: 'personal',
        path: '/test/path',
        enabled: true
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('test-skill', skill);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (loadSkillsTool.execute as any)({
        skill_names: ['test-skill'],
        reason: 'Need specialized guidance for this task'
      });

      expect(result.message).toContain('Need specialized guidance for this task');
    });

    it('should emit skill.selected event for each loaded skill', async () => {
      const skill: Skill = {
        name: 'test-skill',
        description: 'A test skill',
        content: 'Content',
        source: 'personal',
        path: '/test/path',
        enabled: true
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('test-skill', skill);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const registry = getSkillRegistry();

      await (loadSkillsTool.execute as any)({
        skill_names: ['test-skill'],
        reason: 'Testing'
      });

      expect(registry.emit).toHaveBeenCalledWith('skill.selected', {
        type: 'skill.selected',
        skillName: 'test-skill',
        rationale: 'Testing'
      });
    });

    it('should handle mixed success and failure', async () => {
      const skill: Skill = {
        name: 'good-skill',
        description: 'A good skill',
        content: 'Content',
        source: 'personal',
        path: '/test/path',
        enabled: true
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('good-skill', skill);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (loadSkillsTool.execute as any)({
        skill_names: ['good-skill', 'bad-skill', 'another-bad-skill']
      });

      expect(result.success).toBe(true); // At least one succeeded
      expect(result.loaded_count).toBe(1);
      expect(result.failed_count).toBe(2);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('list_available_skills', () => {
    it('should list all enabled skills', async () => {
      const skill1: Skill = {
        name: 'skill-1',
        description: 'First skill',
        content: 'Content 1',
        source: 'personal',
        path: '/test/path1',
        enabled: true,
        tags: ['tag1', 'tag2']
      };

      const skill2: Skill = {
        name: 'skill-2',
        description: 'Second skill',
        content: 'Content 2',
        source: 'project',
        path: '/test/path2',
        enabled: true,
        tags: ['tag3']
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('skill-1', skill1);
      skillsMap.set('skill-2', skill2);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (listAvailableSkillsTool.execute as any)({});

      expect(result.success).toBe(true);
      expect(result.total_count).toBe(2);
      expect(result.enabled_count).toBe(2);
      expect(result.disabled_count).toBe(0);
      expect(result.skills).toHaveLength(2);
      expect(result.message).toContain('skill-1');
      expect(result.message).toContain('skill-2');
    });

    it('should filter skills by tags', async () => {
      const skill1: Skill = {
        name: 'diagram-skill',
        description: 'Diagram skill',
        content: 'Content',
        source: 'personal',
        path: '/test/path1',
        enabled: true,
        tags: ['diagram', 'visualization']
      };

      const skill2: Skill = {
        name: 'docs-skill',
        description: 'Documentation skill',
        content: 'Content',
        source: 'personal',
        path: '/test/path2',
        enabled: true,
        tags: ['documentation']
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('diagram-skill', skill1);
      skillsMap.set('docs-skill', skill2);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (listAvailableSkillsTool.execute as any)({
        filter_tags: ['diagram']
      });

      expect(result.total_count).toBe(1);
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0]!.name).toBe('diagram-skill');
      expect(result.message).toContain('matching tags: diagram');
    });

    it('should show disabled skills separately', async () => {
      const enabledSkill: Skill = {
        name: 'enabled-skill',
        description: 'Enabled',
        content: 'Content',
        source: 'personal',
        path: '/test/path1',
        enabled: true
      };

      const disabledSkill: Skill = {
        name: 'disabled-skill',
        description: 'Disabled',
        content: 'Content',
        source: 'personal',
        path: '/test/path2',
        enabled: false
      };

      const skillsMap = new Map<string, Skill>();
      skillsMap.set('enabled-skill', enabledSkill);
      skillsMap.set('disabled-skill', disabledSkill);
      (getSkillRegistry() as any)._setMockSkills(skillsMap);

      const result = await (listAvailableSkillsTool.execute as any)({});

      expect(result.enabled_count).toBe(1);
      expect(result.disabled_count).toBe(1);
      expect(result.message).toContain('Disabled Skills');
      expect(result.message).toContain('disabled-skill');
    });

    it('should handle no skills available', async () => {
      const result = await (listAvailableSkillsTool.execute as any)({});

      expect(result.success).toBe(true);
      expect(result.total_count).toBe(0);
      expect(result.enabled_count).toBe(0);
      expect(result.message).toContain('No skills available');
    });
  });
});

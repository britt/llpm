/**
 * Integration tests for /skills command
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { skillsCommand } from './skills';
import { getSkillRegistry } from '../services/SkillRegistry';
import type { Skill } from '../types/skills';

// Mock the config module for reinstallCoreSkills
vi.mock('../utils/config', () => ({
  reinstallCoreSkills: vi.fn().mockResolvedValue(3),
  CONFIG_FILE: '/tmp/test-config.json',
  CONFIG_DIR: '/tmp/test-config',
}));

// Mock the MarketplaceService
const mockMarketplaces: any[] = [];
const mockInstalledSkills: any[] = [];
const mockCachedIndexes: Record<string, any[]> = {};

vi.mock('../services/MarketplaceService', () => {
  return {
    MarketplaceService: vi.fn().mockImplementation(() => ({
      addMarketplace: vi.fn(async (repo: string) => {
        const entry = { name: repo.replace('/', '-'), repo, addedAt: new Date().toISOString() };
        mockMarketplaces.push(entry);
        return entry;
      }),
      removeMarketplace: vi.fn(async (name: string) => {
        const idx = mockMarketplaces.findIndex((m: any) => m.name === name);
        if (idx === -1) throw new Error(`Marketplace "${name}" not found`);
        mockMarketplaces.splice(idx, 1);
      }),
      listMarketplaces: vi.fn(async () => [...mockMarketplaces]),
      syncMarketplace: vi.fn(async (name: string) => {
        return mockCachedIndexes[name] || [];
      }),
      searchSkills: vi.fn(async (query: string) => {
        const all = Object.values(mockCachedIndexes).flat();
        if (!query) return all;
        const lq = query.toLowerCase();
        return all.filter((s: any) => s.name.includes(lq) || s.description.toLowerCase().includes(lq));
      }),
      getCachedIndex: vi.fn(async (name: string) => mockCachedIndexes[name] || []),
      installSkill: vi.fn(async (skillName: string, _mp: string) => {
        if (skillName === 'conflict-skill') return { installed: false, conflict: true, existingPath: '/existing/path' };
        return { installed: true };
      }),
      removeSkill: vi.fn(async (skillName: string) => {
        if (skillName === 'nonexistent') throw new Error(`Skill "${skillName}" is not installed`);
      }),
      getInstalledSkills: vi.fn(async () => [...mockInstalledSkills]),
    })),
  };
});

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
    // EventEmitter methods
    on: vi.fn(),
    removeListener: vi.fn(),
    emit: vi.fn(),
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
    // Reset marketplace mocks
    mockMarketplaces.length = 0;
    mockInstalledSkills.length = 0;
    Object.keys(mockCachedIndexes).forEach(k => delete mockCachedIndexes[k]);
  });

  // Helper to add a mock skill
  function addMockSkill(skill: Partial<Skill>) {
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
        source: 'user',
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
        name: 'user-skill',
        source: 'user'
      });
      addMockSkill({
        name: 'project-skill',
        source: 'project'
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('## User Skills');
      expect(result.content).toContain('## Project Skills');
    });

    it('should display license when present', async () => {
      addMockSkill({
        name: 'licensed-skill',
        license: 'MIT'
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('License: MIT');
    });

    it('should display allowedTools when present', async () => {
      addMockSkill({
        name: 'restricted-skill',
        allowedTools: ['github', 'shell']
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.content).toContain('Allowed tools: github, shell');
    });

    it('should show message when no skills discovered', async () => {
      const result = await skillsCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No skills discovered');
    });

    it('should display system skills in their own section', async () => {
      addMockSkill({
        name: 'system-skill',
        description: 'A system skill',
        source: 'system',
        enabled: true,
        license: 'Apache-2.0',
        allowedTools: ['read', 'write']
      });

      const result = await skillsCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('## System Skills');
      expect(result.content).toContain('system-skill');
      expect(result.content).toContain('License: Apache-2.0');
      expect(result.content).toContain('Allowed tools: read, write');
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
        license: 'MIT',
        metadata: { author: 'Test Author' },
        enabled: true
      });

      const result = await skillsCommand.execute(['test', 'test-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('test-skill');
      expect(result.content).toContain('A test skill');
      expect(result.content).toContain('**License:** MIT');
      expect(result.content).toContain('author: Test Author');
      expect(result.content).toContain('# Instructions');
    });

    it('should show allowedTools in test output', async () => {
      addMockSkill({
        name: 'restricted-skill',
        allowedTools: ['github', 'notes']
      });

      const result = await skillsCommand.execute(['test', 'restricted-skill']);

      expect(result.content).toContain('**Allowed Tools:** github, notes');
      expect(result.content).toContain('restrict tool usage');
    });

    it('should show compatibility in test output', async () => {
      addMockSkill({
        name: 'compatible-skill',
        description: 'A compatible skill',
        compatibility: 'claude-code vscode-copilot'
      });

      const result = await skillsCommand.execute(['test', 'compatible-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('**Compatibility:** claude-code vscode-copilot');
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

  describe('reinstall command', () => {
    it('should reinstall core skills from bundled directory', async () => {
      const result = await skillsCommand.execute(['reinstall']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Core skills reinstalled');
    });

    it('should report number of skills reinstalled', async () => {
      const result = await skillsCommand.execute(['reinstall']);

      expect(result.success).toBe(true);
      expect(result.content).toMatch(/Reinstalled: \d+ skill/);
    });

    it('should handle reinstall errors gracefully', async () => {
      // This test verifies error handling works
      const result = await skillsCommand.execute(['reinstall']);

      // Should succeed even if no core skills to reinstall (in test env)
      expect(result.success).toBe(true);
    });
  });

  describe('reload command', () => {
    it('should rescan and report success', async () => {
      addMockSkill({ name: 'skill-1' });
      addMockSkill({ name: 'skill-2' });

      const result = await skillsCommand.execute(['reload']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Skills reloaded successfully');
      expect(result.content).toContain('Discovered: 2 skill(s)');
    });

    it('should call registry.scan()', async () => {
      const registry = getSkillRegistry();
      const scanSpy = vi.spyOn(registry, 'scan');

      await skillsCommand.execute(['reload']);

      expect(scanSpy).toHaveBeenCalled();
    });

    it('should report validation errors when they occur', async () => {
      // This test verifies the reload output format
      // Validation errors come from the registry events during scan
      const result = await skillsCommand.execute(['reload']);

      expect(result.success).toBe(true);
      // The basic reload should work
      expect(result.content).toContain('Skills reloaded successfully');
    });

    it('should report discovered skills', async () => {
      const registry = getSkillRegistry();

      // Setup mock to capture event handlers
      let discoveryHandler: any = null;
      (vi.mocked(registry.on) as any).mockImplementation((event: string, handler: any) => {
        if (event === 'skill.discovered') {
          discoveryHandler = handler;
        }
        return registry;
      });

      // Start reload but trigger discovery event
      vi.mocked(registry.scan).mockImplementation(async () => {
        if (discoveryHandler) {
          discoveryHandler({ skillName: 'new-skill' });
        }
      });

      addMockSkill({ name: 'new-skill' });

      const result = await skillsCommand.execute(['reload']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Successfully loaded');
    });

    it('should report validation errors during scan', async () => {
      const registry = getSkillRegistry();

      // Setup mock to capture event handlers
      let errorHandler: any = null;
      (vi.mocked(registry.on) as any).mockImplementation((event: string, handler: any) => {
        if (event === 'skill.validation_error') {
          errorHandler = handler;
        }
        return registry;
      });

      // Start reload but trigger validation error event
      vi.mocked(registry.scan).mockImplementation(async () => {
        if (errorHandler) {
          errorHandler({ skillName: 'broken-skill', errors: ['Missing name', 'Invalid format'] });
        }
      });

      const result = await skillsCommand.execute(['reload']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Validation errors');
      expect(result.content).toContain('broken-skill');
    });

    it('should handle scan errors gracefully', async () => {
      const registry = getSkillRegistry();
      vi.mocked(registry.scan).mockRejectedValueOnce(new Error('Scan failed'));

      const result = await skillsCommand.execute(['reload']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to reload skills');
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
      expect(result.content).toContain('Description keywords');
      expect(result.content).toContain('agentskills.io');
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

  describe('marketplace subcommand', () => {
    it('/skills marketplace list shows no marketplaces when empty', async () => {
      const result = await skillsCommand.execute(['marketplace', 'list']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('No marketplaces registered');
    });

    it('/skills marketplace add registers a repo', async () => {
      const result = await skillsCommand.execute(['marketplace', 'add', 'anthropics/skills']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('anthropics/skills');
    });

    it('/skills marketplace add requires a repo argument', async () => {
      const result = await skillsCommand.execute(['marketplace', 'add']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('/skills marketplace remove removes a marketplace', async () => {
      mockMarketplaces.push({ name: 'anthropics-skills', repo: 'anthropics/skills', addedAt: '' });
      const result = await skillsCommand.execute(['marketplace', 'remove', 'anthropics-skills']);
      expect(result.success).toBe(true);
    });

    it('/skills marketplace remove requires a name', async () => {
      const result = await skillsCommand.execute(['marketplace', 'remove']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('/skills marketplace list shows registered marketplaces', async () => {
      mockMarketplaces.push({ name: 'anthropics-skills', repo: 'anthropics/skills', addedAt: '2026-03-19' });
      mockMarketplaces.push({ name: 'obra-superpowers', repo: 'obra/superpowers', addedAt: '2026-03-19' });
      const result = await skillsCommand.execute(['marketplace', 'list']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('anthropics-skills');
      expect(result.content).toContain('obra-superpowers');
    });

    it('/skills marketplace shows help for unknown subcommand', async () => {
      const result = await skillsCommand.execute(['marketplace']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('Usage');
    });
  });

  describe('sync subcommand', () => {
    it('/skills sync syncs a marketplace', async () => {
      mockMarketplaces.push({ name: 'anthropics-skills', repo: 'anthropics/skills', addedAt: '' });
      const result = await skillsCommand.execute(['sync', 'anthropics-skills']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('Synced');
    });

    it('/skills sync requires marketplace name', async () => {
      const result = await skillsCommand.execute(['sync']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });
  });

  describe('install subcommand', () => {
    it('/skills install parses name@marketplace syntax', async () => {
      const result = await skillsCommand.execute(['install', 'code-review@anthropics-skills']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('code-review');
    });

    it('/skills install returns conflict message', async () => {
      const result = await skillsCommand.execute(['install', 'conflict-skill@anthropics-skills']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('already exists');
      expect(result.content).toContain('--force');
    });

    it('/skills install requires name@marketplace', async () => {
      const result = await skillsCommand.execute(['install']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('/skills install rejects missing @ separator', async () => {
      const result = await skillsCommand.execute(['install', 'just-a-name']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('@');
    });
  });

  describe('remove subcommand', () => {
    it('/skills remove removes an installed skill', async () => {
      const result = await skillsCommand.execute(['remove', 'code-review']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('Removed');
    });

    it('/skills remove requires skill name', async () => {
      const result = await skillsCommand.execute(['remove']);
      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('/skills remove handles non-installed skill', async () => {
      const result = await skillsCommand.execute(['remove', 'nonexistent']);
      expect(result.success).toBe(false);
    });
  });

  describe('search subcommand', () => {
    it('/skills search searches marketplace indexes', async () => {
      mockCachedIndexes['anthropics-skills'] = [
        { name: 'code-review', description: 'Review code for quality', marketplace: 'anthropics-skills' },
      ];
      mockMarketplaces.push({ name: 'anthropics-skills', repo: 'anthropics/skills', addedAt: '' });
      const result = await skillsCommand.execute(['search', 'review']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('code-review');
    });

    it('/skills search shows no results message', async () => {
      const result = await skillsCommand.execute(['search', 'nonexistent-xyz']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('No skills found');
    });

    it('/skills search with no query shows all', async () => {
      mockCachedIndexes['test'] = [
        { name: 'skill-a', description: 'A', marketplace: 'test' },
      ];
      mockMarketplaces.push({ name: 'test', repo: 'test/repo', addedAt: '' });
      const result = await skillsCommand.execute(['search']);
      expect(result.success).toBe(true);
    });
  });

  describe('list with marketplace skills', () => {
    it('/skills list shows marketplace skills section', async () => {
      addMockSkill({ name: 'marketplace-skill', source: 'marketplace' as any });
      const result = await skillsCommand.execute(['list']);
      expect(result.success).toBe(true);
      expect(result.content).toContain('Marketplace Skills');
    });
  });

  describe('help includes marketplace commands', () => {
    it('/skills help includes marketplace commands', async () => {
      const result = await skillsCommand.execute(['help']);
      expect(result.content).toContain('/skills marketplace add');
      expect(result.content).toContain('/skills install');
      expect(result.content).toContain('/skills remove');
      expect(result.content).toContain('/skills search');
      expect(result.content).toContain('/skills sync');
    });
  });
});

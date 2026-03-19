import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarketplaceService } from './MarketplaceService';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MarketplaceService config', () => {
  let tempDir: string;
  let configFile: string;
  let service: MarketplaceService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'llpm-marketplace-'));
    configFile = join(tempDir, 'config.json');
    await writeFile(configFile, JSON.stringify({ projects: {} }));
    service = new MarketplaceService(configFile, join(tempDir, 'skills'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('addMarketplace registers a new marketplace', async () => {
    await service.addMarketplace('anthropics/skills');
    const list = await service.listMarketplaces();
    expect(list).toHaveLength(1);
    expect(list[0]!.repo).toBe('anthropics/skills');
    expect(list[0]!.name).toBe('anthropics-skills');
  });

  it('addMarketplace rejects duplicate repos', async () => {
    await service.addMarketplace('anthropics/skills');
    await expect(service.addMarketplace('anthropics/skills'))
      .rejects.toThrow(/already registered/);
  });

  it('removeMarketplace removes by name', async () => {
    await service.addMarketplace('anthropics/skills');
    await service.removeMarketplace('anthropics-skills');
    const list = await service.listMarketplaces();
    expect(list).toHaveLength(0);
  });

  it('removeMarketplace throws for unknown name', async () => {
    await expect(service.removeMarketplace('nonexistent'))
      .rejects.toThrow(/not found/);
  });

  it('persists marketplaces to config.json', async () => {
    await service.addMarketplace('anthropics/skills');
    const service2 = new MarketplaceService(configFile, join(tempDir, 'skills'));
    const list = await service2.listMarketplaces();
    expect(list).toHaveLength(1);
    expect(list[0]!.repo).toBe('anthropics/skills');
  });

  it('addMarketplace returns the created config', async () => {
    const result = await service.addMarketplace('obra/superpowers');
    expect(result.name).toBe('obra-superpowers');
    expect(result.repo).toBe('obra/superpowers');
    expect(result.addedAt).toBeTruthy();
  });

  it('preserves existing config data', async () => {
    await writeFile(configFile, JSON.stringify({ projects: { foo: 'bar' } }));
    await service.addMarketplace('anthropics/skills');
    const raw = JSON.parse(await (await import('fs/promises')).readFile(configFile, 'utf-8'));
    expect(raw.projects.foo).toBe('bar');
    expect(raw.marketplaces).toHaveLength(1);
  });
});

describe('MarketplaceService sync and search', () => {
  let tempDir: string;
  let configFile: string;
  let cacheDir: string;
  let service: MarketplaceService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'llpm-marketplace-'));
    configFile = join(tempDir, 'config.json');
    cacheDir = join(tempDir, 'cache', 'marketplaces');
    await writeFile(configFile, JSON.stringify({ projects: {} }));
    service = new MarketplaceService(configFile, join(tempDir, 'skills'), cacheDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('getCachedIndex returns empty array when no cache exists', async () => {
    const index = await service.getCachedIndex('nonexistent');
    expect(index).toEqual([]);
  });

  it('getCachedIndex reads cached index file', async () => {
    await service.addMarketplace('anthropics/skills');
    const indexDir = join(cacheDir, 'anthropics-skills');
    await mkdir(indexDir, { recursive: true });
    const fakeIndex = [
      { name: 'code-review', description: 'Review code', marketplace: 'anthropics-skills' },
      { name: 'tdd', description: 'Test driven dev', marketplace: 'anthropics-skills' },
    ];
    await writeFile(join(indexDir, 'index.json'), JSON.stringify(fakeIndex));

    const index = await service.getCachedIndex('anthropics-skills');
    expect(index).toHaveLength(2);
    expect(index[0]!.name).toBe('code-review');
    expect(index[1]!.name).toBe('tdd');
  });

  it('searchSkills searches across all cached indexes', async () => {
    await service.addMarketplace('anthropics/skills');
    await service.addMarketplace('phuryn/pm-skills');

    const cache1 = join(cacheDir, 'anthropics-skills');
    const cache2 = join(cacheDir, 'phuryn-pm-skills');
    await mkdir(cache1, { recursive: true });
    await mkdir(cache2, { recursive: true });

    await writeFile(join(cache1, 'index.json'), JSON.stringify([
      { name: 'code-review', description: 'Review code for quality', marketplace: 'anthropics-skills' },
    ]));
    await writeFile(join(cache2, 'index.json'), JSON.stringify([
      { name: 'sprint-planning', description: 'Plan sprints and releases', marketplace: 'phuryn-pm-skills' },
    ]));

    const results = await service.searchSkills('review');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('code-review');
  });

  it('searchSkills returns all skills with empty query', async () => {
    await service.addMarketplace('anthropics/skills');
    await service.addMarketplace('phuryn/pm-skills');

    const cache1 = join(cacheDir, 'anthropics-skills');
    const cache2 = join(cacheDir, 'phuryn-pm-skills');
    await mkdir(cache1, { recursive: true });
    await mkdir(cache2, { recursive: true });

    await writeFile(join(cache1, 'index.json'), JSON.stringify([
      { name: 'code-review', description: 'Review code', marketplace: 'anthropics-skills' },
    ]));
    await writeFile(join(cache2, 'index.json'), JSON.stringify([
      { name: 'sprint-planning', description: 'Plan sprints', marketplace: 'phuryn-pm-skills' },
    ]));

    const allResults = await service.searchSkills('');
    expect(allResults).toHaveLength(2);
  });

  it('searchSkills matches on description too', async () => {
    await service.addMarketplace('anthropics/skills');
    const indexDir = join(cacheDir, 'anthropics-skills');
    await mkdir(indexDir, { recursive: true });
    await writeFile(join(indexDir, 'index.json'), JSON.stringify([
      { name: 'code-review', description: 'Analyze pull requests for quality issues', marketplace: 'anthropics-skills' },
    ]));

    const results = await service.searchSkills('pull requests');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('code-review');
  });

  it('buildIndexFromDir parses SKILL.md frontmatter', async () => {
    const repoDir = join(tempDir, 'fake-repo');
    const skill1Dir = join(repoDir, 'my-skill');
    const skill2Dir = join(repoDir, 'another-skill');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });

    await writeFile(join(skill1Dir, 'SKILL.md'), [
      '---',
      'name: my-skill',
      'description: Does something useful',
      '---',
      '# My Skill',
    ].join('\n'));
    await writeFile(join(skill2Dir, 'SKILL.md'), [
      '---',
      'name: another-skill',
      'description: Another useful skill',
      '---',
      '# Another',
    ].join('\n'));

    const index = await service.buildIndexFromDir(repoDir, 'test-marketplace');
    expect(index).toHaveLength(2);
    expect(index.map(s => s.name).sort()).toEqual(['another-skill', 'my-skill']);
    expect(index[0]!.marketplace).toBe('test-marketplace');
  });

  it('buildIndexFromDir skips directories without SKILL.md', async () => {
    const repoDir = join(tempDir, 'fake-repo');
    await mkdir(join(repoDir, 'valid-skill'), { recursive: true });
    await mkdir(join(repoDir, 'no-skill-md'), { recursive: true });
    await mkdir(join(repoDir, '.git'), { recursive: true });

    await writeFile(join(repoDir, 'valid-skill', 'SKILL.md'), [
      '---',
      'name: valid-skill',
      'description: A valid skill',
      '---',
    ].join('\n'));

    const index = await service.buildIndexFromDir(repoDir, 'test-marketplace');
    expect(index).toHaveLength(1);
    expect(index[0]!.name).toBe('valid-skill');
  });

  it('cacheIndex writes and getCachedIndex reads', async () => {
    const entries = [
      { name: 'skill-a', description: 'A', marketplace: 'test' },
      { name: 'skill-b', description: 'B', marketplace: 'test' },
    ];
    await service.cacheIndex('test', entries);

    const cached = await service.getCachedIndex('test');
    expect(cached).toEqual(entries);

    expect(existsSync(join(cacheDir, 'test', 'index.json'))).toBe(true);
  });
});

describe('MarketplaceService install/remove', () => {
  let tempDir: string;
  let configFile: string;
  let skillsDir: string;
  let service: MarketplaceService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'llpm-marketplace-'));
    configFile = join(tempDir, 'config.json');
    skillsDir = join(tempDir, 'skills');
    await writeFile(configFile, JSON.stringify({ projects: {} }));
    service = new MarketplaceService(configFile, skillsDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('installSkillFromDir copies skill directory to skillsDir', async () => {
    const fakeRepoDir = join(tempDir, 'fake-repo');
    const skillDir = join(fakeRepoDir, 'code-review');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), [
      '---',
      'name: code-review',
      'description: Review code for quality',
      '---',
      '# Code Review',
      'Instructions here.',
    ].join('\n'));

    const result = await service.installSkillFromDir(
      'code-review', fakeRepoDir, 'anthropics-skills', 'anthropics/skills',
    );

    expect(result.installed).toBe(true);
    expect(existsSync(join(skillsDir, 'code-review', 'SKILL.md'))).toBe(true);
  });

  it('installSkillFromDir detects conflict with existing skill', async () => {
    const existingSkillDir = join(skillsDir, 'code-review');
    await mkdir(existingSkillDir, { recursive: true });
    await writeFile(join(existingSkillDir, 'SKILL.md'), '---\nname: code-review\ndescription: Existing\n---\n');

    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: New\n---\n');

    const result = await service.installSkillFromDir(
      'code-review', fakeRepoDir, 'anthropics-skills', 'anthropics/skills',
    );

    expect(result.installed).toBe(false);
    expect(result.conflict).toBe(true);
    expect(result.existingPath).toBeTruthy();
  });

  it('installSkillFromDir with force overwrites existing', async () => {
    const existingSkillDir = join(skillsDir, 'code-review');
    await mkdir(existingSkillDir, { recursive: true });
    await writeFile(join(existingSkillDir, 'SKILL.md'), '---\nname: code-review\ndescription: Existing\n---\n');

    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: New version\n---\n');

    const result = await service.installSkillFromDir(
      'code-review', fakeRepoDir, 'anthropics-skills', 'anthropics/skills',
      { force: true },
    );

    expect(result.installed).toBe(true);
  });

  it('installSkillFromDir records installed skill metadata', async () => {
    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: Review\n---\n');

    await service.installSkillFromDir(
      'code-review', fakeRepoDir, 'anthropics-skills', 'anthropics/skills',
    );

    const installed = await service.getInstalledSkills();
    expect(installed).toHaveLength(1);
    expect(installed[0]!.name).toBe('code-review');
    expect(installed[0]!.marketplace).toBe('anthropics-skills');
    expect(installed[0]!.repo).toBe('anthropics/skills');
    expect(installed[0]!.installedAt).toBeTruthy();
  });

  it('installSkillFromDir throws for missing skill in repo', async () => {
    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(fakeRepoDir, { recursive: true });

    await expect(service.installSkillFromDir(
      'nonexistent', fakeRepoDir, 'test', 'test/repo',
    )).rejects.toThrow(/not found in repository/);
  });

  it('removeSkill removes installed skill and metadata', async () => {
    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: Review\n---\n');

    await service.installSkillFromDir('code-review', fakeRepoDir, 'anthropics-skills', 'anthropics/skills');

    await service.removeSkill('code-review');
    expect(existsSync(join(skillsDir, 'code-review'))).toBe(false);

    const installed = await service.getInstalledSkills();
    expect(installed.find(s => s.name === 'code-review')).toBeUndefined();
  });

  it('removeSkill throws for non-installed skill', async () => {
    await expect(service.removeSkill('nonexistent'))
      .rejects.toThrow(/not installed/);
  });

  it('getInstalledSkills returns empty when none installed', async () => {
    const installed = await service.getInstalledSkills();
    expect(installed).toEqual([]);
  });
});

describe('MarketplaceService input validation', () => {
  let tempDir: string;
  let configFile: string;
  let skillsDir: string;
  let service: MarketplaceService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'llpm-marketplace-'));
    configFile = join(tempDir, 'config.json');
    skillsDir = join(tempDir, 'skills');
    await writeFile(configFile, JSON.stringify({ projects: {} }));
    service = new MarketplaceService(configFile, skillsDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('addMarketplace rejects repo with shell metacharacters', async () => {
    await expect(service.addMarketplace('foo/bar"; rm -rf / #'))
      .rejects.toThrow(/invalid repo/i);
  });

  it('addMarketplace rejects repo with $() subshell', async () => {
    await expect(service.addMarketplace('foo/$(malicious-cmd)'))
      .rejects.toThrow(/invalid repo/i);
  });

  it('addMarketplace rejects repo with backtick injection', async () => {
    await expect(service.addMarketplace('foo/`whoami`'))
      .rejects.toThrow(/invalid repo/i);
  });

  it('addMarketplace accepts valid owner/repo format', async () => {
    const result = await service.addMarketplace('anthropics/skills');
    expect(result.repo).toBe('anthropics/skills');
  });

  it('addMarketplace accepts repos with dots, hyphens, and underscores', async () => {
    const result = await service.addMarketplace('my-org/my_skill.repo');
    expect(result.repo).toBe('my-org/my_skill.repo');
  });

  it('addMarketplace rejects repo without slash', async () => {
    await expect(service.addMarketplace('noslash'))
      .rejects.toThrow(/invalid repo/i);
  });

  it('installSkillFromDir rejects skill name with path traversal', async () => {
    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(fakeRepoDir, { recursive: true });

    await expect(service.installSkillFromDir(
      '../../etc', fakeRepoDir, 'test', 'test/repo',
    )).rejects.toThrow(/invalid skill name/i);
  });

  it('installSkillFromDir rejects skill name with slash', async () => {
    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(fakeRepoDir, { recursive: true });

    await expect(service.installSkillFromDir(
      'foo/bar', fakeRepoDir, 'test', 'test/repo',
    )).rejects.toThrow(/invalid skill name/i);
  });

  it('removeSkill rejects skill name with path traversal', async () => {
    await expect(service.removeSkill('../../etc'))
      .rejects.toThrow(/invalid skill name/i);
  });

  it('removeSkill rejects skill name with shell metacharacters', async () => {
    await expect(service.removeSkill('skill"; rm -rf /'))
      .rejects.toThrow(/invalid skill name/i);
  });
});

describe('MarketplaceService syncMarketplace', () => {
  let tempDir: string;
  let configFile: string;
  let cacheDir: string;
  let service: MarketplaceService;
  let mockShellExec: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'llpm-marketplace-'));
    configFile = join(tempDir, 'config.json');
    cacheDir = join(tempDir, 'cache', 'marketplaces');
    await writeFile(configFile, JSON.stringify({ projects: {} }));
    mockShellExec = vi.fn();
    service = new MarketplaceService(configFile, join(tempDir, 'skills'), cacheDir, mockShellExec);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('syncMarketplace throws for unknown marketplace', async () => {
    await expect(service.syncMarketplace('nonexistent'))
      .rejects.toThrow(/not found/);
  });

  it('syncMarketplace clones repo, builds index, and caches it', async () => {
    await service.addMarketplace('anthropics/skills');

    const fakeRepoDir = join(cacheDir, 'anthropics-skills', '_repo');
    mockShellExec.mockImplementation((cmd: string) => {
      if (cmd.includes('git clone')) {
        mkdirSync(join(fakeRepoDir, 'code-review'), { recursive: true });
        writeFileSync(join(fakeRepoDir, 'code-review', 'SKILL.md'), [
          '---',
          'name: code-review',
          'description: Review code',
          '---',
        ].join('\n'));
      }
    });

    const index = await service.syncMarketplace('anthropics-skills');
    expect(index).toHaveLength(1);
    expect(index[0]!.name).toBe('code-review');

    const cached = await service.getCachedIndex('anthropics-skills');
    expect(cached).toHaveLength(1);

    expect(mockShellExec).toHaveBeenCalledTimes(3);
    const cloneCall = mockShellExec.mock.calls[0]![0] as string;
    expect(cloneCall).toContain('git clone');
    expect(cloneCall).toContain('anthropics/skills');
  });

  it('syncMarketplace cleans up temp repo dir after completion', async () => {
    await service.addMarketplace('anthropics/skills');
    const repoDir = join(cacheDir, 'anthropics-skills', '_repo');

    mockShellExec.mockImplementation(() => {});

    try {
      await service.syncMarketplace('anthropics-skills');
    } catch {
      // May fail since mock doesn't create files
    }

    expect(existsSync(repoDir)).toBe(false);
  });

  it('syncMarketplace cleans up temp repo dir on error', async () => {
    await service.addMarketplace('anthropics/skills');
    const repoDir = join(cacheDir, 'anthropics-skills', '_repo');

    mockShellExec.mockImplementation(() => {
      throw new Error('git clone failed');
    });

    await expect(service.syncMarketplace('anthropics-skills'))
      .rejects.toThrow('git clone failed');
    expect(existsSync(repoDir)).toBe(false);
  });
});

describe('MarketplaceService installSkill', () => {
  let tempDir: string;
  let configFile: string;
  let cacheDir: string;
  let skillsDir: string;
  let service: MarketplaceService;
  let mockShellExec: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'llpm-marketplace-'));
    configFile = join(tempDir, 'config.json');
    cacheDir = join(tempDir, 'cache', 'marketplaces');
    skillsDir = join(tempDir, 'skills');
    await writeFile(configFile, JSON.stringify({ projects: {} }));
    mockShellExec = vi.fn();
    service = new MarketplaceService(configFile, skillsDir, cacheDir, mockShellExec);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('installSkill throws for unknown marketplace', async () => {
    await expect(service.installSkill('some-skill', 'nonexistent'))
      .rejects.toThrow(/not found/);
  });

  it('installSkill clones repo and installs skill to skillsDir', async () => {
    await service.addMarketplace('anthropics/skills');
    const installTempDir = join(cacheDir, '_install-temp');

    mockShellExec.mockImplementation((cmd: string) => {
      if (cmd.includes('git clone')) {
        mkdirSync(join(installTempDir, 'code-review'), { recursive: true });
        writeFileSync(join(installTempDir, 'code-review', 'SKILL.md'), [
          '---',
          'name: code-review',
          'description: Review code',
          '---',
        ].join('\n'));
      }
    });

    const result = await service.installSkill('code-review', 'anthropics-skills');
    expect(result.installed).toBe(true);
    expect(existsSync(join(skillsDir, 'code-review', 'SKILL.md'))).toBe(true);

    const installed = await service.getInstalledSkills();
    expect(installed).toHaveLength(1);
    expect(installed[0]!.name).toBe('code-review');
  });

  it('installSkill cleans up temp dir after install', async () => {
    await service.addMarketplace('anthropics/skills');
    const installTempDir = join(cacheDir, '_install-temp');

    mockShellExec.mockImplementation((cmd: string) => {
      if (cmd.includes('git clone')) {
        mkdirSync(join(installTempDir, 'code-review'), { recursive: true });
        writeFileSync(join(installTempDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: Test\n---\n');
      }
    });

    await service.installSkill('code-review', 'anthropics-skills');
    expect(existsSync(installTempDir)).toBe(false);
  });

  it('installSkill detects conflict without force', async () => {
    await service.addMarketplace('anthropics/skills');
    await mkdir(join(skillsDir, 'code-review'), { recursive: true });
    await writeFile(join(skillsDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: Existing\n---\n');

    const installTempDir = join(cacheDir, '_install-temp');
    mockShellExec.mockImplementation((cmd: string) => {
      if (cmd.includes('git clone')) {
        mkdirSync(join(installTempDir, 'code-review'), { recursive: true });
        writeFileSync(join(installTempDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: New\n---\n');
      }
    });

    const result = await service.installSkill('code-review', 'anthropics-skills');
    expect(result.installed).toBe(false);
    expect(result.conflict).toBe(true);
  });

  it('installSkill rejects skill name with path traversal', async () => {
    await service.addMarketplace('anthropics/skills');
    await expect(service.installSkill('../../etc', 'anthropics-skills'))
      .rejects.toThrow(/invalid skill name/i);
  });
});

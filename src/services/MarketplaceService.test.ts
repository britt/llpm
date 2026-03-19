import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarketplaceService } from './MarketplaceService';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
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
    expect(list[0].repo).toBe('anthropics/skills');
    expect(list[0].name).toBe('anthropics-skills');
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
    // Create a new service reading same file
    const service2 = new MarketplaceService(configFile, join(tempDir, 'skills'));
    const list = await service2.listMarketplaces();
    expect(list).toHaveLength(1);
    expect(list[0].repo).toBe('anthropics/skills');
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
    expect(index[0].name).toBe('code-review');
    expect(index[1].name).toBe('tdd');
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
    expect(results[0].name).toBe('code-review');
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
    expect(results[0].name).toBe('code-review');
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
    expect(index[0].marketplace).toBe('test-marketplace');
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
    // no-skill-md has no SKILL.md, .git starts with dot

    const index = await service.buildIndexFromDir(repoDir, 'test-marketplace');
    expect(index).toHaveLength(1);
    expect(index[0].name).toBe('valid-skill');
  });

  it('cacheIndex writes and getCachedIndex reads', async () => {
    const entries = [
      { name: 'skill-a', description: 'A', marketplace: 'test' },
      { name: 'skill-b', description: 'B', marketplace: 'test' },
    ];
    await service.cacheIndex('test', entries);

    const cached = await service.getCachedIndex('test');
    expect(cached).toEqual(entries);

    // Verify file on disk
    expect(existsSync(join(cacheDir, 'test', 'index.json'))).toBe(true);
  });
});

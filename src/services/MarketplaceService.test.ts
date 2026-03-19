import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarketplaceService } from './MarketplaceService';
import { mkdtemp, rm, writeFile } from 'fs/promises';
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

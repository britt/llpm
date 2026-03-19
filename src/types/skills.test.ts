import { describe, it, expect } from 'vitest';
import type {
  MarketplaceConfig,
  MarketplaceSkillIndex,
  InstalledSkillMetadata,
  SkillSource,
} from './skills';

describe('Marketplace types', () => {
  it('MarketplaceConfig has required fields', () => {
    const config: MarketplaceConfig = {
      name: 'anthropics-skills',
      repo: 'anthropics/skills',
      addedAt: '2026-03-19T00:00:00Z',
    };
    expect(config.name).toBe('anthropics-skills');
    expect(config.repo).toBe('anthropics/skills');
    expect(config.addedAt).toBeTruthy();
  });

  it('MarketplaceSkillIndex has required fields', () => {
    const entry: MarketplaceSkillIndex = {
      name: 'code-review',
      description: 'Review code for quality',
      marketplace: 'anthropics-skills',
    };
    expect(entry.name).toBe('code-review');
    expect(entry.marketplace).toBe('anthropics-skills');
  });

  it('InstalledSkillMetadata tracks provenance', () => {
    const meta: InstalledSkillMetadata = {
      name: 'code-review',
      marketplace: 'anthropics-skills',
      repo: 'anthropics/skills',
      installedAt: '2026-03-19T00:00:00Z',
    };
    expect(meta.marketplace).toBe('anthropics-skills');
    expect(meta.installedAt).toBeTruthy();
  });

  it('SkillSource includes marketplace', () => {
    const source: SkillSource = 'marketplace';
    expect(source).toBe('marketplace');
  });
});

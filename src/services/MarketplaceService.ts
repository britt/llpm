import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import matter from 'gray-matter';
import type { MarketplaceConfig, MarketplaceSkillIndex } from '../types/skills';

export class MarketplaceService {
  constructor(
    private configFilePath: string,
    private skillsDir: string,
    private cacheDir: string = join(dirname(configFilePath), 'cache', 'marketplaces'),
  ) {}

  private async readConfig(): Promise<Record<string, unknown>> {
    try {
      const raw = await readFile(this.configFilePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private async writeConfig(config: Record<string, unknown>): Promise<void> {
    const dir = dirname(this.configFilePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(this.configFilePath, JSON.stringify(config, null, 2));
  }

  private repoToName(repo: string): string {
    return repo.replace('/', '-');
  }

  async addMarketplace(repo: string): Promise<MarketplaceConfig> {
    const config = await this.readConfig();
    const marketplaces: MarketplaceConfig[] = (config.marketplaces as MarketplaceConfig[]) || [];

    if (marketplaces.some(m => m.repo === repo)) {
      throw new Error(`Marketplace "${repo}" is already registered`);
    }

    const entry: MarketplaceConfig = {
      name: this.repoToName(repo),
      repo,
      addedAt: new Date().toISOString(),
    };

    marketplaces.push(entry);
    config.marketplaces = marketplaces;
    await this.writeConfig(config);
    return entry;
  }

  async removeMarketplace(name: string): Promise<void> {
    const config = await this.readConfig();
    const marketplaces: MarketplaceConfig[] = (config.marketplaces as MarketplaceConfig[]) || [];
    const idx = marketplaces.findIndex(m => m.name === name);

    if (idx === -1) {
      throw new Error(`Marketplace "${name}" not found`);
    }

    marketplaces.splice(idx, 1);
    config.marketplaces = marketplaces;
    await this.writeConfig(config);
  }

  async listMarketplaces(): Promise<MarketplaceConfig[]> {
    const config = await this.readConfig();
    return (config.marketplaces as MarketplaceConfig[]) || [];
  }

  async getCachedIndex(name: string): Promise<MarketplaceSkillIndex[]> {
    const indexPath = join(this.cacheDir, name, 'index.json');
    if (!existsSync(indexPath)) return [];
    const raw = await readFile(indexPath, 'utf-8');
    return JSON.parse(raw);
  }

  async cacheIndex(name: string, entries: MarketplaceSkillIndex[]): Promise<void> {
    const indexDir = join(this.cacheDir, name);
    if (!existsSync(indexDir)) {
      await mkdir(indexDir, { recursive: true });
    }
    await writeFile(join(indexDir, 'index.json'), JSON.stringify(entries, null, 2));
  }

  async buildIndexFromDir(repoDir: string, marketplaceName: string): Promise<MarketplaceSkillIndex[]> {
    const index: MarketplaceSkillIndex[] = [];
    const entries = await readdir(repoDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const skillMdPath = join(repoDir, entry.name, 'SKILL.md');
      if (!existsSync(skillMdPath)) continue;

      const content = await readFile(skillMdPath, 'utf-8');
      const { data } = matter(content);

      if (data.name && data.description) {
        index.push({
          name: data.name as string,
          description: data.description as string,
          marketplace: marketplaceName,
        });
      }
    }

    return index;
  }

  async searchSkills(query: string): Promise<MarketplaceSkillIndex[]> {
    const marketplaces = await this.listMarketplaces();
    const allSkills: MarketplaceSkillIndex[] = [];

    for (const mp of marketplaces) {
      const index = await this.getCachedIndex(mp.name);
      allSkills.push(...index);
    }

    if (!query) return allSkills;

    const lowerQuery = query.toLowerCase();
    return allSkills.filter(
      s => s.name.toLowerCase().includes(lowerQuery) ||
           s.description.toLowerCase().includes(lowerQuery)
    );
  }
}

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import type { MarketplaceConfig } from '../types/skills';

export class MarketplaceService {
  constructor(
    private configFilePath: string,
    private skillsDir: string,
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
}

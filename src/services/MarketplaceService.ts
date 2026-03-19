import { readFile, writeFile, mkdir, readdir, cp, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';
import type { MarketplaceConfig, MarketplaceSkillIndex, InstalledSkillMetadata } from '../types/skills';

export type ShellExecutor = (command: string, options?: { stdio: string }) => void;

const VALID_REPO_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
const VALID_SKILL_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export interface InstallResult {
  installed: boolean;
  conflict?: boolean;
  existingPath?: string;
}

export class MarketplaceService {
  private shellExec: ShellExecutor;

  constructor(
    private configFilePath: string,
    private skillsDir: string,
    private cacheDir: string = join(dirname(configFilePath), 'cache', 'marketplaces'),
    shellExec?: ShellExecutor,
  ) {
    this.shellExec = shellExec ?? ((cmd, opts) => execSync(cmd, opts as Parameters<typeof execSync>[1]));
  }

  private validateRepo(repo: string): void {
    if (!VALID_REPO_PATTERN.test(repo)) {
      throw new Error(`Invalid repo format: "${repo}". Must be "owner/repo" with alphanumeric characters, dots, hyphens, or underscores only.`);
    }
  }

  private validateSkillName(name: string): void {
    if (!VALID_SKILL_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid skill name: "${name}". Must contain only alphanumeric characters, dots, hyphens, or underscores.`);
    }
  }

  private validatePathWithinDir(basePath: string, targetPath: string): void {
    const resolvedBase = resolve(basePath);
    const resolvedTarget = resolve(targetPath);
    if (!resolvedTarget.startsWith(resolvedBase + '/') && resolvedTarget !== resolvedBase) {
      throw new Error(`Invalid skill name: path "${resolvedTarget}" escapes base directory "${resolvedBase}".`);
    }
  }

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
    this.validateRepo(repo);
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

  async installSkillFromDir(
    skillName: string,
    repoDir: string,
    marketplaceName: string,
    repo: string,
    options: { force?: boolean } = {},
  ): Promise<InstallResult> {
    this.validateSkillName(skillName);
    const sourcePath = join(repoDir, skillName);
    const targetPath = join(this.skillsDir, skillName);
    this.validatePathWithinDir(this.skillsDir, targetPath);

    if (!existsSync(sourcePath)) {
      throw new Error(`Skill "${skillName}" not found in repository`);
    }

    if (existsSync(targetPath) && !options.force) {
      return { installed: false, conflict: true, existingPath: targetPath };
    }

    if (!existsSync(this.skillsDir)) {
      await mkdir(this.skillsDir, { recursive: true });
    }
    await cp(sourcePath, targetPath, { recursive: true, force: true });

    await this.recordInstalledSkill({
      name: skillName,
      marketplace: marketplaceName,
      repo,
      installedAt: new Date().toISOString(),
    });

    return { installed: true };
  }

  async syncMarketplace(name: string): Promise<MarketplaceSkillIndex[]> {
    const marketplaces = await this.listMarketplaces();
    const marketplace = marketplaces.find(m => m.name === name);
    if (!marketplace) throw new Error(`Marketplace "${name}" not found`);

    const tempCloneDir = join(this.cacheDir, name, '_repo');

    try {
      if (existsSync(tempCloneDir)) {
        await rm(tempCloneDir, { recursive: true, force: true });
      }

      this.shellExec(
        `git clone --no-checkout --depth 1 https://github.com/${marketplace.repo}.git "${tempCloneDir}"`,
        { stdio: 'pipe' },
      );
      this.shellExec(
        `git -C "${tempCloneDir}" sparse-checkout set --no-cone "*/SKILL.md"`,
        { stdio: 'pipe' },
      );
      this.shellExec(
        `git -C "${tempCloneDir}" checkout`,
        { stdio: 'pipe' },
      );

      const index = await this.buildIndexFromDir(tempCloneDir, name);
      await this.cacheIndex(name, index);
      return index;
    } finally {
      if (existsSync(tempCloneDir)) {
        await rm(tempCloneDir, { recursive: true, force: true });
      }
    }
  }

  async installSkill(
    skillName: string,
    marketplaceName: string,
    options: { force?: boolean } = {},
  ): Promise<InstallResult> {
    this.validateSkillName(skillName);
    const marketplaces = await this.listMarketplaces();
    const marketplace = marketplaces.find(m => m.name === marketplaceName);
    if (!marketplace) throw new Error(`Marketplace "${marketplaceName}" not found`);

    const tempCloneDir = join(this.cacheDir, '_install-temp');
    try {
      if (existsSync(tempCloneDir)) {
        await rm(tempCloneDir, { recursive: true, force: true });
      }

      this.shellExec(
        `git clone --no-checkout --depth 1 https://github.com/${marketplace.repo}.git "${tempCloneDir}"`,
        { stdio: 'pipe' },
      );
      this.shellExec(
        `git -C "${tempCloneDir}" sparse-checkout set --no-cone "${skillName}"`,
        { stdio: 'pipe' },
      );
      this.shellExec(
        `git -C "${tempCloneDir}" checkout`,
        { stdio: 'pipe' },
      );

      return await this.installSkillFromDir(skillName, tempCloneDir, marketplaceName, marketplace.repo, options);
    } finally {
      if (existsSync(tempCloneDir)) {
        await rm(tempCloneDir, { recursive: true, force: true });
      }
    }
  }

  async removeSkill(skillName: string): Promise<void> {
    this.validateSkillName(skillName);
    const targetPath = join(this.skillsDir, skillName);
    this.validatePathWithinDir(this.skillsDir, targetPath);
    if (!existsSync(targetPath)) {
      throw new Error(`Skill "${skillName}" is not installed`);
    }
    await rm(targetPath, { recursive: true, force: true });

    const config = await this.readConfig();
    const installed: InstalledSkillMetadata[] = (config.installedSkills as InstalledSkillMetadata[]) || [];
    config.installedSkills = installed.filter(s => s.name !== skillName);
    await this.writeConfig(config);
  }

  async getInstalledSkills(): Promise<InstalledSkillMetadata[]> {
    const config = await this.readConfig();
    return (config.installedSkills as InstalledSkillMetadata[]) || [];
  }

  private async recordInstalledSkill(meta: InstalledSkillMetadata): Promise<void> {
    const config = await this.readConfig();
    const installed: InstalledSkillMetadata[] = (config.installedSkills as InstalledSkillMetadata[]) || [];
    const idx = installed.findIndex(s => s.name === meta.name);
    if (idx >= 0) {
      installed[idx] = meta;
    } else {
      installed.push(meta);
    }
    config.installedSkills = installed;
    await this.writeConfig(config);
  }
}

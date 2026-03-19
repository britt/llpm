# Skill Marketplace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a plugin marketplace system to LLPM so users can register Git-based skill repositories, install/remove skills via sparse checkout, and search across registered marketplaces.

**Architecture:** New `MarketplaceService` manages registered repos and their cached indexes. Skills install into `~/.llpm/skills/` via `git sparse-checkout`. The existing `SkillRegistry` gains a `source: 'marketplace'` variant and conflict detection. New `/skills marketplace` and `/skills install/remove/search` subcommands extend the existing command.

**Tech Stack:** Bun shell (`Bun.$`) for git operations, existing `gray-matter` for parsing, `~/.llpm/config.json` for marketplace persistence.

---

## Current State Summary

- 19 bundled skills already in SKILL.md format with YAML frontmatter (migration complete)
- `SkillRegistry` handles scan, load, enable/disable, progressive disclosure
- `/skills` command supports: list, test, enable, disable, reload, reinstall
- Config lives at `~/.llpm/config.json`
- Skills types defined in `src/types/skills.ts`
- Skill source types: `'user' | 'project' | 'system'`

## What We're Building

1. **Marketplace config** — persist registered repos in `~/.llpm/config.json`
2. **MarketplaceService** — register repos, sync indexes, install/remove skills via sparse checkout
3. **Conflict detection** — prompt user when installing a skill that conflicts with existing
4. **SkillRegistry updates** — track marketplace-installed skills with provenance
5. **Slash commands** — `/skills marketplace add/remove/list`, `/skills install/remove/search`
6. **AI tools** — `install_skill` and `search_skills` tools for LLM access

---

## Task 1: Marketplace Types

Add types for marketplace registration, skill index entries, and installed skill metadata.

**Files:**
- Modify: `src/types/skills.ts`
- Test: `src/types/skills.test.ts` (new — type validation tests)

**Step 1: Write the failing test**

```typescript
// src/types/skills.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/types/skills.test.ts`
Expected: FAIL — types don't exist yet.

**Step 3: Write minimal implementation**

Add to `src/types/skills.ts`:

```typescript
// Update SkillSource to include marketplace
export type SkillSource = 'user' | 'project' | 'system' | 'marketplace';

// Marketplace registration stored in config.json
export interface MarketplaceConfig {
  /** Display name for this marketplace */
  name: string;
  /** GitHub owner/repo (e.g., "anthropics/skills") */
  repo: string;
  /** ISO timestamp when marketplace was registered */
  addedAt: string;
}

// Lightweight skill entry from a marketplace index (cached locally)
export interface MarketplaceSkillIndex {
  /** Skill name (directory name in the repo) */
  name: string;
  /** Skill description from SKILL.md frontmatter */
  description: string;
  /** Which marketplace this skill belongs to */
  marketplace: string;
}

// Provenance metadata for an installed marketplace skill
export interface InstalledSkillMetadata {
  /** Skill name */
  name: string;
  /** Marketplace name it was installed from */
  marketplace: string;
  /** GitHub owner/repo */
  repo: string;
  /** ISO timestamp when installed */
  installedAt: string;
}
```

Also add `installedSkills` to `SkillsConfig`:

```typescript
export interface SkillsConfig {
  // ... existing fields ...
  /** Registered marketplace repos */
  marketplaces?: MarketplaceConfig[];
  /** Metadata for skills installed from marketplaces */
  installedSkills?: InstalledSkillMetadata[];
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/types/skills.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/skills.ts src/types/skills.test.ts
git commit -m "feat(skills): add marketplace types

- RED: type import tests for MarketplaceConfig, MarketplaceSkillIndex, InstalledSkillMetadata
- GREEN: added types and extended SkillSource with 'marketplace'
- Status: all tests passing, build successful"
```

---

## Task 2: Marketplace Config Persistence

Read/write marketplace registrations and installed skill metadata to `~/.llpm/config.json`.

**Files:**
- Create: `src/services/MarketplaceService.ts`
- Test: `src/services/MarketplaceService.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/MarketplaceService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarketplaceService } from './MarketplaceService';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
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
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/MarketplaceService.test.ts`
Expected: FAIL — module doesn't exist.

**Step 3: Write minimal implementation**

```typescript
// src/services/MarketplaceService.ts
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import type { MarketplaceConfig, InstalledSkillMetadata } from '../types/skills';
import { debug } from '../utils/logger';

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
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/MarketplaceService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/MarketplaceService.ts src/services/MarketplaceService.test.ts
git commit -m "feat(marketplace): add/remove/list marketplace config persistence

- RED: tests for addMarketplace, removeMarketplace, listMarketplaces, duplicates, persistence
- GREEN: MarketplaceService with config.json read/write
- Status: all tests passing, build successful"
```

---

## Task 3: Marketplace Index Sync

Sync a marketplace repo's skill index by reading SKILL.md frontmatter from the repo via sparse checkout. Cache the index locally at `~/.llpm/cache/marketplaces/<name>/index.json`.

**Files:**
- Modify: `src/services/MarketplaceService.ts`
- Test: `src/services/MarketplaceService.test.ts` (add sync tests)

**Step 1: Write the failing test**

```typescript
describe('MarketplaceService sync', () => {
  it('syncMarketplace fetches and caches skill index', async () => {
    // This test mocks the git operations
    // We test the index caching and parsing logic
    await service.addMarketplace('anthropics/skills');

    // Mock: write a fake cached index to simulate sync result
    const cacheDir = join(tempDir, 'cache', 'marketplaces', 'anthropics-skills');
    await mkdir(cacheDir, { recursive: true });
    const fakeIndex = [
      { name: 'code-review', description: 'Review code', marketplace: 'anthropics-skills' },
      { name: 'tdd', description: 'Test driven dev', marketplace: 'anthropics-skills' },
    ];
    await writeFile(join(cacheDir, 'index.json'), JSON.stringify(fakeIndex));

    const index = await service.getCachedIndex('anthropics-skills');
    expect(index).toHaveLength(2);
    expect(index[0].name).toBe('code-review');
  });

  it('searchSkills searches across all cached indexes', async () => {
    // Setup two marketplaces with cached indexes
    await service.addMarketplace('anthropics/skills');
    await service.addMarketplace('phuryn/pm-skills');

    const cache1 = join(tempDir, 'cache', 'marketplaces', 'anthropics-skills');
    const cache2 = join(tempDir, 'cache', 'marketplaces', 'phuryn-pm-skills');
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

    const allResults = await service.searchSkills('');
    expect(allResults).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/MarketplaceService.test.ts`
Expected: FAIL — `getCachedIndex` and `searchSkills` don't exist.

**Step 3: Write minimal implementation**

Add to `MarketplaceService`:

```typescript
import type { MarketplaceSkillIndex } from '../types/skills';
import { join } from 'path';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';

// Add constructor param for cacheDir
constructor(
  private configFilePath: string,
  private skillsDir: string,
  private cacheDir: string = join(dirname(configFilePath), 'cache', 'marketplaces'),
) {}

async syncMarketplace(name: string): Promise<MarketplaceSkillIndex[]> {
  const marketplaces = await this.listMarketplaces();
  const marketplace = marketplaces.find(m => m.name === name);
  if (!marketplace) throw new Error(`Marketplace "${name}" not found`);

  const tempCloneDir = join(this.cacheDir, name, 'repo');

  // Sparse checkout: clone with no checkout, then enable sparse-checkout
  // and pull only SKILL.md files to read frontmatter
  await $`git clone --no-checkout --depth 1 https://github.com/${marketplace.repo}.git ${tempCloneDir}`.quiet();
  await $`git -C ${tempCloneDir} sparse-checkout set --no-cone "*/SKILL.md"`.quiet();
  await $`git -C ${tempCloneDir} checkout`.quiet();

  // Read all SKILL.md files and extract frontmatter
  const index: MarketplaceSkillIndex[] = [];
  const entries = await readdir(tempCloneDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const skillMdPath = join(tempCloneDir, entry.name, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    const content = await readFile(skillMdPath, 'utf-8');
    const matter = (await import('gray-matter')).default;
    const { data } = matter(content);

    if (data.name && data.description) {
      index.push({
        name: data.name,
        description: data.description,
        marketplace: name,
      });
    }
  }

  // Cache the index
  const indexDir = join(this.cacheDir, name);
  await mkdir(indexDir, { recursive: true });
  await writeFile(join(indexDir, 'index.json'), JSON.stringify(index, null, 2));

  // Clean up temp clone
  await rm(tempCloneDir, { recursive: true, force: true });

  return index;
}

async getCachedIndex(name: string): Promise<MarketplaceSkillIndex[]> {
  const indexPath = join(this.cacheDir, name, 'index.json');
  if (!existsSync(indexPath)) return [];
  const raw = await readFile(indexPath, 'utf-8');
  return JSON.parse(raw);
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
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/MarketplaceService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/MarketplaceService.ts src/services/MarketplaceService.test.ts
git commit -m "feat(marketplace): index sync, caching, and search

- RED: tests for getCachedIndex, searchSkills across marketplaces
- GREEN: syncMarketplace with sparse checkout, getCachedIndex, searchSkills
- Status: all tests passing, build successful"
```

---

## Task 4: Skill Install via Sparse Checkout

Install a single skill from a marketplace repo into `~/.llpm/skills/` using git sparse-checkout. Handle conflict detection — if a skill with the same name exists, return a conflict error that the command layer will use to prompt the user.

**Files:**
- Modify: `src/services/MarketplaceService.ts`
- Test: `src/services/MarketplaceService.test.ts`

**Step 1: Write the failing test**

```typescript
describe('MarketplaceService install/remove', () => {
  it('installSkill copies skill directory to skillsDir', async () => {
    await service.addMarketplace('anthropics/skills');

    // Setup: create a fake repo clone with a skill
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

    // Mock the git clone by providing a test hook
    const result = await service.installSkillFromDir(
      'code-review',
      fakeRepoDir,
      'anthropics-skills',
      'anthropics/skills',
    );

    expect(result.installed).toBe(true);
    expect(existsSync(join(tempDir, 'skills', 'code-review', 'SKILL.md'))).toBe(true);
  });

  it('installSkill detects conflict with existing skill', async () => {
    // Create an existing skill
    const existingSkillDir = join(tempDir, 'skills', 'code-review');
    await mkdir(existingSkillDir, { recursive: true });
    await writeFile(join(existingSkillDir, 'SKILL.md'), '---\nname: code-review\ndescription: Existing\n---\n');

    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: New\n---\n');

    const result = await service.installSkillFromDir(
      'code-review',
      fakeRepoDir,
      'anthropics-skills',
      'anthropics/skills',
    );

    expect(result.installed).toBe(false);
    expect(result.conflict).toBe(true);
    expect(result.existingPath).toBeTruthy();
  });

  it('installSkill with force overwrites existing', async () => {
    const existingSkillDir = join(tempDir, 'skills', 'code-review');
    await mkdir(existingSkillDir, { recursive: true });
    await writeFile(join(existingSkillDir, 'SKILL.md'), '---\nname: code-review\ndescription: Existing\n---\n');

    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: New version\n---\n');

    const result = await service.installSkillFromDir(
      'code-review',
      fakeRepoDir,
      'anthropics-skills',
      'anthropics/skills',
      { force: true },
    );

    expect(result.installed).toBe(true);
    expect(result.conflict).toBeFalsy();
  });

  it('removeSkill removes installed skill and metadata', async () => {
    // Install a skill first
    const fakeRepoDir = join(tempDir, 'fake-repo');
    await mkdir(join(fakeRepoDir, 'code-review'), { recursive: true });
    await writeFile(join(fakeRepoDir, 'code-review', 'SKILL.md'), '---\nname: code-review\ndescription: Review\n---\n');

    await service.addMarketplace('anthropics/skills');
    await service.installSkillFromDir('code-review', fakeRepoDir, 'anthropics-skills', 'anthropics/skills');

    await service.removeSkill('code-review');
    expect(existsSync(join(tempDir, 'skills', 'code-review'))).toBe(false);

    const installed = await service.getInstalledSkills();
    expect(installed.find(s => s.name === 'code-review')).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/MarketplaceService.test.ts`
Expected: FAIL — `installSkillFromDir`, `removeSkill`, `getInstalledSkills` don't exist.

**Step 3: Write minimal implementation**

Add to `MarketplaceService`:

```typescript
import { cp, rm } from 'fs/promises';

interface InstallResult {
  installed: boolean;
  conflict?: boolean;
  existingPath?: string;
}

async installSkillFromDir(
  skillName: string,
  repoDir: string,
  marketplaceName: string,
  repo: string,
  options: { force?: boolean } = {},
): Promise<InstallResult> {
  const sourcePath = join(repoDir, skillName);
  const targetPath = join(this.skillsDir, skillName);

  if (!existsSync(sourcePath)) {
    throw new Error(`Skill "${skillName}" not found in repository`);
  }

  // Conflict detection
  if (existsSync(targetPath) && !options.force) {
    return { installed: false, conflict: true, existingPath: targetPath };
  }

  // Copy skill directory
  if (!existsSync(this.skillsDir)) {
    await mkdir(this.skillsDir, { recursive: true });
  }
  await cp(sourcePath, targetPath, { recursive: true, force: true });

  // Record installed skill metadata
  await this.recordInstalledSkill({
    name: skillName,
    marketplace: marketplaceName,
    repo,
    installedAt: new Date().toISOString(),
  });

  return { installed: true };
}

async installSkill(
  skillName: string,
  marketplaceName: string,
): Promise<InstallResult> {
  const marketplaces = await this.listMarketplaces();
  const marketplace = marketplaces.find(m => m.name === marketplaceName);
  if (!marketplace) throw new Error(`Marketplace "${marketplaceName}" not found`);

  // Sparse checkout just the skill directory
  const tempCloneDir = join(this.cacheDir, '_install-temp');
  try {
    await $`git clone --no-checkout --depth 1 https://github.com/${marketplace.repo}.git ${tempCloneDir}`.quiet();
    await $`git -C ${tempCloneDir} sparse-checkout set --no-cone "${skillName}"`.quiet();
    await $`git -C ${tempCloneDir} checkout`.quiet();

    return await this.installSkillFromDir(skillName, tempCloneDir, marketplaceName, marketplace.repo);
  } finally {
    if (existsSync(tempCloneDir)) {
      await rm(tempCloneDir, { recursive: true, force: true });
    }
  }
}

async removeSkill(skillName: string): Promise<void> {
  const targetPath = join(this.skillsDir, skillName);
  if (!existsSync(targetPath)) {
    throw new Error(`Skill "${skillName}" is not installed`);
  }
  await rm(targetPath, { recursive: true, force: true });

  // Remove from installed skills metadata
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
  // Replace if already exists
  const idx = installed.findIndex(s => s.name === meta.name);
  if (idx >= 0) {
    installed[idx] = meta;
  } else {
    installed.push(meta);
  }
  config.installedSkills = installed;
  await this.writeConfig(config);
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/MarketplaceService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/MarketplaceService.ts src/services/MarketplaceService.test.ts
git commit -m "feat(marketplace): install/remove skills with conflict detection

- RED: tests for installSkillFromDir, conflict detection, force install, removeSkill
- GREEN: sparse checkout install, conflict return, force overwrite, metadata tracking
- Status: all tests passing, build successful"
```

---

## Task 5: SkillRegistry — Marketplace Source Support

Update `SkillRegistry` to display marketplace-installed skills with their provenance (which marketplace they came from).

**Files:**
- Modify: `src/services/SkillRegistry.ts`
- Modify: `src/services/SkillRegistry.test.ts`

**Step 1: Write the failing test**

```typescript
describe('SkillRegistry marketplace source', () => {
  it('skills from ~/.llpm/skills installed by marketplace show source "marketplace"', async () => {
    // Create a skill in the temp skills dir that has matching installed metadata
    // The registry should consult MarketplaceService to determine if a user-dir skill
    // is actually marketplace-installed
    // ... (test that SkillSource 'marketplace' is assigned based on installedSkills metadata)
  });
});
```

> **Note:** The exact approach here is to have the `SkillRegistry.scan()` method optionally accept installed skill metadata, and if a skill's name appears in the installed list, set its `source` to `'marketplace'` instead of `'user'`. This keeps the registry decoupled from MarketplaceService — the command layer passes the metadata in.

**Step 2-5:** Follow standard RED-GREEN-REFACTOR cycle. The key change is small: after loading a skill from the user path, check if its name is in a provided `installedSkillNames: Set<string>` and if so, set `source = 'marketplace'`.

**Commit message:**

```
feat(skills): registry recognizes marketplace-installed skills

- RED: test that skills in user dir with marketplace metadata get source 'marketplace'
- GREEN: scan() accepts optional installedSkillNames set
- Status: all tests passing, build successful
```

---

## Task 6: `/skills marketplace` Subcommands

Add `/skills marketplace add/remove/list` subcommands and `/skills sync` to the existing skills command.

**Files:**
- Modify: `src/commands/skills.ts`
- Modify: `src/commands/skills.test.ts`

**Step 1: Write the failing test**

```typescript
describe('/skills marketplace commands', () => {
  it('/skills marketplace list shows registered marketplaces', async () => {
    // Mock MarketplaceService
    const result = await skillsCommand.execute(['marketplace', 'list']);
    expect(result.success).toBe(true);
    expect(result.content).toContain('No marketplaces registered');
  });

  it('/skills marketplace add registers a repo', async () => {
    const result = await skillsCommand.execute(['marketplace', 'add', 'anthropics/skills']);
    expect(result.success).toBe(true);
    expect(result.content).toContain('anthropics/skills');
  });

  it('/skills marketplace remove removes a marketplace', async () => {
    await skillsCommand.execute(['marketplace', 'add', 'anthropics/skills']);
    const result = await skillsCommand.execute(['marketplace', 'remove', 'anthropics-skills']);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/commands/skills.test.ts`
Expected: FAIL — marketplace subcommand not handled.

**Step 3: Write minimal implementation**

Add to the switch in `skillsCommand.execute`:

```typescript
case 'marketplace':
  return await handleMarketplace(args.slice(1));

case 'install':
  return await handleInstall(args.slice(1));

case 'remove':
  return await handleRemove(args.slice(1));

case 'search':
  return await handleSearch(args.slice(1));

case 'sync':
  return await handleSync(args.slice(1));
```

Implement each handler function:

- `handleMarketplace(['add', 'owner/repo'])` — calls `MarketplaceService.addMarketplace()`, then auto-syncs
- `handleMarketplace(['remove', 'name'])` — calls `MarketplaceService.removeMarketplace()`
- `handleMarketplace(['list'])` — calls `MarketplaceService.listMarketplaces()`

**Step 4: Run test to verify it passes**

Run: `bun run test src/commands/skills.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/skills.ts src/commands/skills.test.ts
git commit -m "feat(skills): /skills marketplace add/remove/list commands

- RED: tests for marketplace subcommands
- GREEN: marketplace handlers delegating to MarketplaceService
- Status: all tests passing, build successful"
```

---

## Task 7: `/skills install` and `/skills remove` Commands

Add install/remove commands that handle the `<skill-name>@<marketplace>` syntax and conflict prompting.

**Files:**
- Modify: `src/commands/skills.ts`
- Modify: `src/commands/skills.test.ts`

**Step 1: Write the failing test**

```typescript
describe('/skills install', () => {
  it('parses skill-name@marketplace syntax', async () => {
    // Setup: register a marketplace, cache its index
    const result = await skillsCommand.execute(['install', 'code-review@anthropics-skills']);
    // The test should verify parsing and delegation to MarketplaceService.installSkill
    expect(result.content).toContain('code-review');
  });

  it('returns conflict message when skill exists', async () => {
    // Setup: existing skill + attempted install
    const result = await skillsCommand.execute(['install', 'existing-skill@marketplace']);
    expect(result.content).toContain('already exists');
    expect(result.content).toContain('--force');
  });

  it('install --force overwrites existing', async () => {
    const result = await skillsCommand.execute(['install', '--force', 'existing-skill@marketplace']);
    expect(result.success).toBe(true);
  });
});

describe('/skills remove', () => {
  it('removes an installed skill', async () => {
    const result = await skillsCommand.execute(['remove', 'code-review']);
    expect(result.success).toBe(true);
  });
});
```

**Step 2-5:** Standard TDD cycle. Parse `name@marketplace` syntax, delegate to `MarketplaceService.installSkill()`, handle conflict result by returning a message suggesting `--force`.

**Commit message:**

```
feat(skills): /skills install and /skills remove commands

- RED: tests for install parsing, conflict messaging, force flag, remove
- GREEN: install/remove handlers with conflict detection and --force support
- Status: all tests passing, build successful
```

---

## Task 8: `/skills search` Command

Search across cached marketplace indexes.

**Files:**
- Modify: `src/commands/skills.ts`
- Modify: `src/commands/skills.test.ts`

**Step 1: Write the failing test**

```typescript
describe('/skills search', () => {
  it('searches cached indexes and displays results', async () => {
    // Setup: cached indexes with known skills
    const result = await skillsCommand.execute(['search', 'review']);
    expect(result.success).toBe(true);
    expect(result.content).toContain('code-review');
  });

  it('shows no results message for empty search', async () => {
    const result = await skillsCommand.execute(['search', 'nonexistent-xyz']);
    expect(result.success).toBe(true);
    expect(result.content).toContain('No skills found');
  });

  it('shows all skills with no query', async () => {
    const result = await skillsCommand.execute(['search']);
    expect(result.success).toBe(true);
  });
});
```

**Step 2-5:** Standard TDD cycle. Delegate to `MarketplaceService.searchSkills()`, format results with marketplace name, description, and install command hint.

**Commit message:**

```
feat(skills): /skills search across marketplace indexes

- RED: tests for search results, empty results, no-query browsing
- GREEN: search handler delegating to MarketplaceService.searchSkills
- Status: all tests passing, build successful
```

---

## Task 9: `/skills list` — Show Source and Provenance

Update `/skills list` to show marketplace-installed skills separately with their provenance.

**Files:**
- Modify: `src/commands/skills.ts`
- Modify: `src/commands/skills.test.ts`

**Step 1: Write the failing test**

```typescript
describe('/skills list with marketplace skills', () => {
  it('groups marketplace-installed skills separately', async () => {
    // Setup: registry with mixed source skills
    const result = await skillsCommand.execute(['list']);
    expect(result.content).toContain('Marketplace Skills');
    // Should show which marketplace each skill came from
  });
});
```

**Step 2-5:** Standard TDD cycle. Add a `## Marketplace Skills` section to the list output for skills with `source === 'marketplace'`, showing the marketplace name from installed metadata.

**Commit message:**

```
feat(skills): /skills list shows marketplace provenance

- RED: test for marketplace skills grouping in list output
- GREEN: added marketplace section with provenance display
- Status: all tests passing, build successful
```

---

## Task 10: AI Tools — `install_skill` and `search_marketplace_skills`

Add LLM-accessible tools so the AI can install skills and search marketplaces on behalf of the user.

**Files:**
- Modify: `src/tools/skillTools.ts`
- Modify: `src/tools/skillTools.test.ts`
- Modify: `src/tools/registry.ts` (register new tools)

**Step 1: Write the failing test**

```typescript
describe('install_skill tool', () => {
  it('has correct inputSchema', () => {
    expect(installSkillTool.inputSchema).toBeDefined();
  });

  it('installs a skill from a marketplace', async () => {
    // Mock MarketplaceService
    const result = await installSkillTool.execute({
      skill_name: 'code-review',
      marketplace: 'anthropics-skills',
    });
    expect(result.success).toBe(true);
  });
});

describe('search_marketplace_skills tool', () => {
  it('has correct inputSchema', () => {
    expect(searchMarketplaceSkillsTool.inputSchema).toBeDefined();
  });

  it('searches across marketplaces', async () => {
    const result = await searchMarketplaceSkillsTool.execute({ query: 'review' });
    expect(result.success).toBe(true);
  });
});
```

**Step 2-5:** Standard TDD cycle.

Tool definitions:

```typescript
export const installSkillTool = tool({
  name: 'install_skill',
  description: 'Install a skill from a registered marketplace into the user\'s skill library.',
  inputSchema: z.object({
    skill_name: z.string().describe('Name of the skill to install'),
    marketplace: z.string().describe('Name of the marketplace to install from'),
    force: z.boolean().optional().describe('Overwrite existing skill if conflict'),
  }),
  execute: async ({ skill_name, marketplace, force }) => { /* ... */ },
});

export const searchMarketplaceSkillsTool = tool({
  name: 'search_marketplace_skills',
  description: 'Search for skills across registered marketplaces.',
  inputSchema: z.object({
    query: z.string().describe('Search query to match against skill names and descriptions'),
  }),
  execute: async ({ query }) => { /* ... */ },
});
```

**Commit message:**

```
feat(skills): AI tools for install_skill and search_marketplace_skills

- RED: tests for tool schemas and execution
- GREEN: tools delegating to MarketplaceService
- Status: all tests passing, build successful
```

---

## Task 11: Update Help Text

Update `/skills help` to document all new subcommands.

**Files:**
- Modify: `src/commands/skills.ts`
- Modify: `src/commands/skills.test.ts`

**Step 1: Write the failing test**

```typescript
it('/skills help includes marketplace commands', async () => {
  const result = await skillsCommand.execute(['help']);
  expect(result.content).toContain('/skills marketplace add');
  expect(result.content).toContain('/skills install');
  expect(result.content).toContain('/skills remove');
  expect(result.content).toContain('/skills search');
  expect(result.content).toContain('/skills sync');
});
```

**Step 2-5:** Update the `showHelp()` function with new command documentation.

**Commit message:**

```
docs(skills): update /skills help with marketplace commands

- RED: test for marketplace commands in help output
- GREEN: updated showHelp with install/remove/search/marketplace/sync docs
- Status: all tests passing, build successful
```

---

## Task 12: Integration Test — End-to-End Marketplace Flow

Write an integration test that exercises the full flow: register marketplace → sync → search → install → list → remove.

**Files:**
- Create: `src/services/MarketplaceService.integration.test.ts`

**Step 1: Write the test**

```typescript
describe('Marketplace end-to-end flow', () => {
  it('full lifecycle: register → sync → search → install → list → remove', async () => {
    // 1. Register marketplace
    // 2. Sync (mocked git, real file operations)
    // 3. Search cached index
    // 4. Install skill (from fixture dir)
    // 5. Verify skill appears in registry
    // 6. Remove skill
    // 7. Verify skill is gone
    // 8. Remove marketplace
  });
});
```

**Step 2-5:** Standard TDD cycle using filesystem fixtures instead of real git operations.

**Commit message:**

```
test(marketplace): end-to-end integration test for full lifecycle

- RED: integration test covering register/sync/search/install/list/remove
- GREEN: all lifecycle steps verified
- Status: all tests passing, build successful
```

---

## Task 13: Final Verification

Run full test suite, build, lint, typecheck, and coverage.

**Steps:**

```bash
bun run test --coverage
bun run build
bun run lint
bun run typecheck
```

Verify:
- All tests pass
- Build succeeds with zero errors
- No linter errors
- Coverage meets 90%+ thresholds
- New marketplace features work in manual testing

**Commit message:**

```
chore: verify marketplace implementation — all checks green

- Status: all tests passing, build successful, lint clean, coverage 90%+
```

---

## Summary of New/Modified Files

| File | Action | Purpose |
|------|--------|---------|
| `src/types/skills.ts` | Modify | Add marketplace types, extend SkillSource |
| `src/services/MarketplaceService.ts` | Create | Marketplace config, sync, install, search |
| `src/services/MarketplaceService.test.ts` | Create | Unit tests for MarketplaceService |
| `src/services/MarketplaceService.integration.test.ts` | Create | E2E integration test |
| `src/services/SkillRegistry.ts` | Modify | Recognize marketplace source |
| `src/services/SkillRegistry.test.ts` | Modify | Test marketplace source detection |
| `src/commands/skills.ts` | Modify | Add marketplace/install/remove/search/sync subcommands |
| `src/commands/skills.test.ts` | Modify | Tests for new subcommands |
| `src/tools/skillTools.ts` | Modify | Add install_skill and search_marketplace_skills tools |
| `src/tools/skillTools.test.ts` | Modify | Tests for new AI tools |
| `src/tools/registry.ts` | Modify | Register new tools |

## Dependency Order

```
Task 1 (types) → Task 2 (config) → Task 3 (sync) → Task 4 (install)
                                                          ↓
Task 5 (registry) ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
     ↓
Task 6 (marketplace cmds) → Task 7 (install cmd) → Task 8 (search cmd) → Task 9 (list update)
     ↓
Task 10 (AI tools) → Task 11 (help) → Task 12 (integration) → Task 13 (verify)
```

import { existsSync } from 'fs';
import { mkdir, cp, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import { debug } from './logger';

// Allow override for testing
function getBaseConfigDir(): string {
  // Check for test environment variable
  if (process.env.LLPM_CONFIG_DIR) {
    return process.env.LLPM_CONFIG_DIR;
  }
  
  // In test environment, use temporary directory
  // Check for various test environment indicators
  const isTest = process.env.NODE_ENV === 'test' || 
                 process.env.BUN_TEST === 'true' ||
                 (process.argv.includes('test') || process.argv.some(arg => arg.endsWith('.test.ts') || arg.endsWith('.test.js'))) ||
                 process.title?.includes('bun test');
                 
  if (isTest && !process.env.LLPM_USE_REAL_CONFIG) {
    // Create a unique temp dir for this test session
    const testDir = join(tmpdir(), `llpm-test-${process.pid}-${Date.now()}`);
    debug('Using temporary config directory for tests:', testDir);
    return testDir;
  }
  
  return join(homedir(), '.llpm');
}

export const CONFIG_DIR = getBaseConfigDir();
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const SYSTEM_PROMPT_FILE = join(CONFIG_DIR, 'system_prompt.txt');

/**
 * Install core skills from the bundled skills directory to user's config
 */
async function installCoreSkills(): Promise<void> {
  const skillsDir = join(CONFIG_DIR, 'skills');

  // Create skills directory if it doesn't exist
  if (!existsSync(skillsDir)) {
    await mkdir(skillsDir, { recursive: true });
  }

  // Path to bundled core skills (relative to project root)
  const coreSkillsPath = join(process.cwd(), 'skills', 'core');

  if (!existsSync(coreSkillsPath)) {
    debug('Core skills directory not found:', coreSkillsPath);
    return;
  }

  try {
    // Read all core skill directories
    const entries = await readdir(coreSkillsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;
      const sourcePath = join(coreSkillsPath, skillName);
      const targetPath = join(skillsDir, skillName);

      // Only install if not already present
      if (!existsSync(targetPath)) {
        debug('Installing core skill:', skillName);
        await cp(sourcePath, targetPath, { recursive: true });
        debug('Installed core skill:', skillName);
      }
    }

    // Install user skills directory with README
    const userSkillsSourcePath = join(process.cwd(), 'skills', 'user');
    const userSkillsTargetPath = join(skillsDir, 'user');

    if (existsSync(userSkillsSourcePath) && !existsSync(userSkillsTargetPath)) {
      debug('Installing user skills directory with README');
      await mkdir(userSkillsTargetPath, { recursive: true });

      // Copy README.md if it exists
      const readmePath = join(userSkillsSourcePath, 'README.md');
      const targetReadmePath = join(userSkillsTargetPath, 'README.md');

      if (existsSync(readmePath)) {
        await cp(readmePath, targetReadmePath);
        debug('Installed user skills README');
      }
    }
  } catch (error) {
    debug('Error installing core skills:', error);
    // Don't fail config creation if skills installation fails
  }
}

export async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    debug('Creating config directory:', CONFIG_DIR);
    await mkdir(CONFIG_DIR, { recursive: true });
    debug('Config directory created successfully');

    // Install core skills on first run
    await installCoreSkills();
  }
}

export function getConfigPath(): string {
  return CONFIG_DIR;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

/**
 * Get the agents.yaml file path for a specific project
 */
export function getProjectAgentsYamlPath(projectId: string): string {
  return join(CONFIG_DIR, 'projects', projectId, 'agents.yaml');
}

/**
 * Ensure a project's directory exists
 */
export async function ensureProjectDir(projectId: string): Promise<void> {
  const projectDir = join(CONFIG_DIR, 'projects', projectId);
  if (!existsSync(projectDir)) {
    debug('Creating project directory:', projectDir);
    await mkdir(projectDir, { recursive: true });
    debug('Project directory created successfully');
  }
}

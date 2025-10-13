import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import { debug } from './logger';
import { ensureDefaultSystemPromptFile } from './systemPrompt';
import { loadProjectConfig } from './projectConfig';

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

export async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    debug('Creating config directory:', CONFIG_DIR);
    await mkdir(CONFIG_DIR, { recursive: true });
    debug('Config directory created successfully');
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

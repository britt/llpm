import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { debug } from './logger';
import { ensureDefaultSystemPromptFile } from './systemPrompt';
import { loadProjectConfig } from './projectConfig';

export const CONFIG_DIR = join(homedir(), '.llpm');
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

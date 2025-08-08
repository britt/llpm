import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { debug } from './logger';

export const CONFIG_DIR = join(homedir(), '.claude-pm');
export const CHAT_HISTORY_FILE = join(CONFIG_DIR, 'chat-history.json');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function ensureConfigDir(): Promise<void> {
  debug('Ensuring config directory exists:', CONFIG_DIR);
  
  if (!existsSync(CONFIG_DIR)) {
    debug('Creating config directory:', CONFIG_DIR);
    await mkdir(CONFIG_DIR, { recursive: true });
    debug('Config directory created successfully');
  } else {
    debug('Config directory already exists');
  }
}

export function getConfigPath(): string {
  return CONFIG_DIR;
}

export function getChatHistoryPath(): string {
  return CHAT_HISTORY_FILE;
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
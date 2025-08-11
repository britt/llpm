import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir, ensureConfigDir } from './config';
import { debug } from './logger';

const INPUT_HISTORY_FILE = 'input-history.json';

export async function loadInputHistory(): Promise<string[]> {
  debug('Loading input history');
  
  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const historyPath = join(configDir, INPUT_HISTORY_FILE);
    
    if (!existsSync(historyPath)) {
      debug('No input history file found');
      return [];
    }
    
    const data = await readFile(historyPath, 'utf-8');
    const history = JSON.parse(data);
    
    if (Array.isArray(history)) {
      debug('Loaded', history.length, 'input history items');
      return history;
    } else {
      debug('Invalid input history format, returning empty array');
      return [];
    }
  } catch (error) {
    debug('Error loading input history:', error);
    return [];
  }
}

export async function saveInputHistory(history: string[]): Promise<void> {
  debug('Saving input history with', history.length, 'items');
  
  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const historyPath = join(configDir, INPUT_HISTORY_FILE);
    
    // Keep only the last 100 items
    const limitedHistory = history.slice(0, 100);
    
    await writeFile(historyPath, JSON.stringify(limitedHistory, null, 2), 'utf-8');
    debug('Input history saved successfully');
  } catch (error) {
    debug('Error saving input history:', error);
    // Don't throw error as this is not critical functionality
  }
}
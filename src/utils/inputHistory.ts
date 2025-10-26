import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir, ensureConfigDir } from './config';

const INPUT_HISTORY_FILE = 'input-history.json';

export async function loadInputHistory(): Promise<string[]> {
  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const historyPath = join(configDir, INPUT_HISTORY_FILE);

    if (!existsSync(historyPath)) {
      return [];
    }

    const data = await readFile(historyPath, 'utf-8');
    const history = JSON.parse(data);

    if (Array.isArray(history)) {
      return history.slice(0, 100);
    } else {
      return [];
    }
  } catch {
    return [];
  }
}

export async function saveInputHistory(history: string[]): Promise<void> {
  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const historyPath = join(configDir, INPUT_HISTORY_FILE);

    // Keep only the last 100 items
    const limitedHistory = history.slice(0, 100);

    await writeFile(historyPath, JSON.stringify(limitedHistory, null, 2), 'utf-8');
  } catch {
    // Don't throw error as this is not critical functionality
  }
}

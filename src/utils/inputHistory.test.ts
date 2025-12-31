import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import { loadInputHistory, saveInputHistory } from './inputHistory';

// Mock modules
vi.mock('fs/promises');
vi.mock('fs');
vi.mock('./config', () => ({
  getConfigDir: vi.fn(() => '/mock/config'),
  ensureConfigDir: vi.fn()
}));

describe('inputHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadInputHistory', () => {
    it('should return empty array when history file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await loadInputHistory();

      expect(result).toEqual([]);
    });

    it('should load history from file when it exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(['command1', 'command2']));

      const result = await loadInputHistory();

      expect(result).toEqual(['command1', 'command2']);
    });

    it('should limit history to 100 items', async () => {
      const largeHistory = Array(150).fill(0).map((_, i) => `command${i}`);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(largeHistory));

      const result = await loadInputHistory();

      expect(result.length).toBe(100);
    });

    it('should return empty array for invalid JSON', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue('not valid json');

      const result = await loadInputHistory();

      expect(result).toEqual([]);
    });

    it('should return empty array when file contains non-array data', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify({ not: 'array' }));

      const result = await loadInputHistory();

      expect(result).toEqual([]);
    });

    it('should return empty array on read error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const result = await loadInputHistory();

      expect(result).toEqual([]);
    });
  });

  describe('saveInputHistory', () => {
    it('should save history to file', async () => {
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      await saveInputHistory(['command1', 'command2']);

      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        '/mock/config/input-history.json',
        expect.any(String),
        'utf-8'
      );
    });

    it('should limit saved history to 100 items', async () => {
      const largeHistory = Array(150).fill(0).map((_, i) => `command${i}`);
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

      await saveInputHistory(largeHistory);

      expect(fsPromises.writeFile).toHaveBeenCalled();
      const savedData = vi.mocked(fsPromises.writeFile).mock.calls[0]![1] as string;
      const parsed = JSON.parse(savedData);
      expect(parsed.length).toBe(100);
    });

    it('should not throw on write error', async () => {
      vi.mocked(fsPromises.writeFile).mockRejectedValue(new Error('Write error'));

      // Should not throw
      await expect(saveInputHistory(['command'])).resolves.not.toThrow();
    });
  });
});

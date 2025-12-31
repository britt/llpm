/**
 * Model Cache Tests
 *
 * Tests for modelCache.ts functions including I/O
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  copyFileSync: vi.fn(),
  unlinkSync: vi.fn()
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    ...mockFs,
    default: {
      ...actual,
      ...mockFs
    }
  };
});

vi.mock('./logger', () => ({
  debug: vi.fn()
}));

import {
  createEmptyCache,
  formatCacheAge,
  getCachedModelsForProvider,
  getRecommendedModels,
  getModelCachePath,
  getModelCacheBackupPath,
  readModelCache,
  writeModelCache,
  hasCachedModels,
  getCacheAge,
  type CachedModels,
  type NormalizedModel,
} from './modelCache';

describe('modelCache', () => {
  describe('createEmptyCache', () => {
    it('should create empty cache structure', () => {
      const cache = createEmptyCache();

      expect(cache.version).toBe('1.0.0');
      expect(cache.fetchedAt).toBeDefined();
      expect(cache.sourceUrls).toEqual({});
      expect(cache.providerCounts).toEqual({});
      expect(cache.models).toEqual([]);
    });

    it('should have valid ISO date string', () => {
      const cache = createEmptyCache();

      const date = new Date(cache.fetchedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('formatCacheAge', () => {
    it('should return "just now" for less than a minute', () => {
      expect(formatCacheAge(30 * 1000)).toBe('just now');
      expect(formatCacheAge(59 * 1000)).toBe('just now');
    });

    it('should format minutes correctly', () => {
      expect(formatCacheAge(5 * 60 * 1000)).toBe('5 minutes ago');
      expect(formatCacheAge(30 * 60 * 1000)).toBe('30 minutes ago');
    });

    it('should format hours correctly', () => {
      expect(formatCacheAge(2 * 60 * 60 * 1000)).toBe('2 hours ago');
      expect(formatCacheAge(12 * 60 * 60 * 1000)).toBe('12 hours ago');
    });

    it('should format days correctly', () => {
      expect(formatCacheAge(3 * 24 * 60 * 60 * 1000)).toBe('3 days ago');
      expect(formatCacheAge(7 * 24 * 60 * 60 * 1000)).toBe('7 days ago');
    });

    it('should handle singular forms', () => {
      expect(formatCacheAge(1 * 60 * 1000)).toBe('1 minute ago');
      expect(formatCacheAge(1 * 60 * 60 * 1000)).toBe('1 hour ago');
      expect(formatCacheAge(1 * 24 * 60 * 60 * 1000)).toBe('1 day ago');
    });

    it('should prioritize larger units', () => {
      // 1 day and 2 hours should show days
      expect(formatCacheAge(26 * 60 * 60 * 1000)).toBe('1 day ago');
      // 2 hours and 30 minutes should show hours
      expect(formatCacheAge(150 * 60 * 1000)).toBe('2 hours ago');
    });
  });

  describe('getModelCachePath', () => {
    it('should return path ending with models.json', () => {
      const path = getModelCachePath();
      expect(path).toContain('models.json');
    });
  });

  describe('getModelCacheBackupPath', () => {
    it('should return path ending with models.json.bak', () => {
      const path = getModelCacheBackupPath();
      expect(path).toContain('models.json.bak');
    });
  });

  describe('getCachedModelsForProvider', () => {
    it('should return models for specific provider', () => {
      const cache: CachedModels = {
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        sourceUrls: {},
        providerCounts: {},
        models: [
          { provider: 'openai', id: 'gpt-4', displayName: 'GPT-4', recommendedRank: 1, supportsChat: true },
          { provider: 'openai', id: 'gpt-3.5', displayName: 'GPT-3.5', recommendedRank: 2, supportsChat: true },
          { provider: 'anthropic', id: 'claude-3', displayName: 'Claude 3', recommendedRank: 1, supportsChat: true },
        ]
      };

      const openaiModels = getCachedModelsForProvider(cache, 'openai');
      expect(openaiModels).toHaveLength(2);
      expect(openaiModels.every(m => m.provider === 'openai')).toBe(true);
    });

    it('should sort models by recommendedRank', () => {
      const cache: CachedModels = {
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        sourceUrls: {},
        providerCounts: {},
        models: [
          { provider: 'openai', id: 'gpt-3.5', displayName: 'GPT-3.5', recommendedRank: 3, supportsChat: true },
          { provider: 'openai', id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', recommendedRank: 1, supportsChat: true },
          { provider: 'openai', id: 'gpt-4', displayName: 'GPT-4', recommendedRank: 2, supportsChat: true },
        ]
      };

      const models = getCachedModelsForProvider(cache, 'openai');
      expect(models[0].recommendedRank).toBe(1);
      expect(models[1].recommendedRank).toBe(2);
      expect(models[2].recommendedRank).toBe(3);
    });

    it('should return empty array for provider with no models', () => {
      const cache: CachedModels = {
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        sourceUrls: {},
        providerCounts: {},
        models: [
          { provider: 'openai', id: 'gpt-4', displayName: 'GPT-4', recommendedRank: 1, supportsChat: true },
        ]
      };

      const groqModels = getCachedModelsForProvider(cache, 'groq');
      expect(groqModels).toHaveLength(0);
    });
  });

  describe('getRecommendedModels', () => {
    it('should return top models from each provider', () => {
      const cache: CachedModels = {
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        sourceUrls: {},
        providerCounts: {},
        models: [
          { provider: 'openai', id: 'gpt-4', displayName: 'GPT-4', recommendedRank: 1, supportsChat: true },
          { provider: 'openai', id: 'gpt-3.5', displayName: 'GPT-3.5', recommendedRank: 2, supportsChat: true },
          { provider: 'anthropic', id: 'claude-3', displayName: 'Claude 3', recommendedRank: 1, supportsChat: true },
          { provider: 'anthropic', id: 'claude-2', displayName: 'Claude 2', recommendedRank: 2, supportsChat: true },
        ]
      };

      const recommended = getRecommendedModels(cache, 1);

      // Should have 1 model per provider (only openai and anthropic have models)
      const openaiModels = recommended.filter(m => m.provider === 'openai');
      const anthropicModels = recommended.filter(m => m.provider === 'anthropic');

      expect(openaiModels).toHaveLength(1);
      expect(anthropicModels).toHaveLength(1);
      expect(openaiModels[0].id).toBe('gpt-4');
      expect(anthropicModels[0].id).toBe('claude-3');
    });

    it('should return multiple models per provider when maxPerProvider > 1', () => {
      const cache: CachedModels = {
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        sourceUrls: {},
        providerCounts: {},
        models: [
          { provider: 'openai', id: 'gpt-4', displayName: 'GPT-4', recommendedRank: 1, supportsChat: true },
          { provider: 'openai', id: 'gpt-3.5', displayName: 'GPT-3.5', recommendedRank: 2, supportsChat: true },
          { provider: 'openai', id: 'davinci', displayName: 'Davinci', recommendedRank: 3, supportsChat: true },
        ]
      };

      const recommended = getRecommendedModels(cache, 2);
      const openaiModels = recommended.filter(m => m.provider === 'openai');

      expect(openaiModels).toHaveLength(2);
    });

    it('should return empty array for empty cache', () => {
      const cache = createEmptyCache();
      const recommended = getRecommendedModels(cache);

      expect(recommended).toHaveLength(0);
    });
  });

  describe('readModelCache', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return null when cache file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = readModelCache();

      expect(result).toBeNull();
    });

    it('should return parsed cache when valid', () => {
      const validCache: CachedModels = {
        version: '1.0.0',
        fetchedAt: '2024-01-01T00:00:00Z',
        sourceUrls: { openai: 'https://api.openai.com/v1/models' },
        providerCounts: { openai: 1 },
        models: [
          { provider: 'openai', id: 'gpt-4', displayName: 'GPT-4', recommendedRank: 1, supportsChat: true }
        ]
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(validCache));

      const result = readModelCache();

      expect(result).toEqual(validCache);
    });

    it('should return null for invalid JSON', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json{');

      const result = readModelCache();

      expect(result).toBeNull();
    });

    it('should return null for invalid cache structure', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        // Missing required fields
        version: '1.0.0'
      }));

      const result = readModelCache();

      expect(result).toBeNull();
    });

    it('should return null for invalid model in cache', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        fetchedAt: '2024-01-01',
        sourceUrls: {},
        providerCounts: {},
        models: [{ id: 'missing-provider' }] // Missing required model fields
      }));

      const result = readModelCache();

      expect(result).toBeNull();
    });

    it('should return null when cache is null', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('null');

      const result = readModelCache();

      expect(result).toBeNull();
    });
  });

  describe('writeModelCache', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should write cache atomically', () => {
      mockFs.existsSync.mockReturnValue(false);

      const data: CachedModels = {
        version: '1.0.0',
        fetchedAt: '2024-01-01T00:00:00Z',
        sourceUrls: {},
        providerCounts: {},
        models: []
      };

      writeModelCache(data);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('should create backup when existing file exists', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.endsWith('models.json') && !path.endsWith('.tmp');
      });

      const data: CachedModels = {
        version: '1.0.0',
        fetchedAt: '2024-01-01T00:00:00Z',
        sourceUrls: {},
        providerCounts: {},
        models: []
      };

      writeModelCache(data);

      expect(mockFs.copyFileSync).toHaveBeenCalled();
    });

    it('should throw error on write failure', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const data: CachedModels = {
        version: '1.0.0',
        fetchedAt: '2024-01-01T00:00:00Z',
        sourceUrls: {},
        providerCounts: {},
        models: []
      };

      expect(() => writeModelCache(data)).toThrow('Write failed');
    });
  });

  describe('hasCachedModels', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when valid cache exists', () => {
      const validCache: CachedModels = {
        version: '1.0.0',
        fetchedAt: '2024-01-01',
        sourceUrls: {},
        providerCounts: {},
        models: []
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(validCache));

      expect(hasCachedModels()).toBe(true);
    });

    it('should return false when no cache exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(hasCachedModels()).toBe(false);
    });
  });

  describe('getCacheAge', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return age in milliseconds', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const validCache: CachedModels = {
        version: '1.0.0',
        fetchedAt: fiveMinutesAgo,
        sourceUrls: {},
        providerCounts: {},
        models: []
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(validCache));

      const age = getCacheAge();

      expect(age).toBeGreaterThanOrEqual(5 * 60 * 1000 - 1000);
      expect(age).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);
    });

    it('should return null when no cache exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(getCacheAge()).toBeNull();
    });
  });
});

/**
 * Model Cache Tests
 *
 * Tests for pure functions in modelCache.ts
 * File I/O functions are tested via integration tests
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyCache,
  formatCacheAge,
  getCachedModelsForProvider,
  getRecommendedModels,
  getModelCachePath,
  getModelCacheBackupPath,
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
});

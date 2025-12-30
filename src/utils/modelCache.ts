/**
 * Model Cache - Manages cached model data from provider APIs
 *
 * Stores normalized model information in ~/.llpm/models.json
 * with atomic writes and single backup support.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, copyFileSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR } from './config';
import { debug } from './logger';
import type { ModelProvider } from '../types/models';

/**
 * Normalized model from provider API
 */
export interface NormalizedModel {
  provider: ModelProvider;
  id: string;
  displayName: string;
  family?: string;
  recommendedRank: number;
  supportsChat: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Cached models file structure
 */
export interface CachedModels {
  version: string;
  fetchedAt: string;
  sourceUrls: Record<string, string>;
  providerCounts: Record<string, number>;
  models: NormalizedModel[];
}

const CACHE_VERSION = '1.0.0';
const CACHE_FILENAME = 'models.json';
const BACKUP_FILENAME = 'models.json.bak';

/**
 * Get the path to the models cache file
 */
export function getModelCachePath(): string {
  return join(CONFIG_DIR, CACHE_FILENAME);
}

/**
 * Get the path to the backup file
 */
export function getModelCacheBackupPath(): string {
  return join(CONFIG_DIR, BACKUP_FILENAME);
}

/**
 * Validate cache structure
 */
function isValidCache(data: unknown): data is CachedModels {
  if (!data || typeof data !== 'object') return false;

  const cache = data as Record<string, unknown>;

  if (typeof cache.version !== 'string') return false;
  if (typeof cache.fetchedAt !== 'string') return false;
  if (!cache.sourceUrls || typeof cache.sourceUrls !== 'object') return false;
  if (!cache.providerCounts || typeof cache.providerCounts !== 'object') return false;
  if (!Array.isArray(cache.models)) return false;

  // Validate at least some models have required fields
  for (const model of cache.models) {
    if (!model || typeof model !== 'object') return false;
    if (typeof model.provider !== 'string') return false;
    if (typeof model.id !== 'string') return false;
    if (typeof model.displayName !== 'string') return false;
    if (typeof model.recommendedRank !== 'number') return false;
  }

  return true;
}

/**
 * Read and validate the model cache
 * Returns null if cache is missing, corrupt, or invalid
 */
export function readModelCache(): CachedModels | null {
  const cachePath = getModelCachePath();

  if (!existsSync(cachePath)) {
    debug('Model cache not found at:', cachePath);
    return null;
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    const data = JSON.parse(content);

    if (!isValidCache(data)) {
      debug('Model cache validation failed - invalid structure');
      return null;
    }

    debug('Model cache loaded successfully with', data.models.length, 'models');
    return data;
  } catch (error) {
    debug('Error reading model cache:', error);
    return null;
  }
}

/**
 * Write the model cache atomically with backup
 *
 * Strategy:
 * 1. Write to temp file
 * 2. Backup existing cache (if any)
 * 3. Rename temp to cache
 */
export function writeModelCache(data: CachedModels): void {
  const cachePath = getModelCachePath();
  const backupPath = getModelCacheBackupPath();
  const tempPath = `${cachePath}.tmp`;

  try {
    // 1. Write to temp file
    const content = JSON.stringify(data, null, 2);
    writeFileSync(tempPath, content, 'utf-8');
    debug('Wrote temp cache file:', tempPath);

    // 2. Backup existing cache if it exists
    if (existsSync(cachePath)) {
      copyFileSync(cachePath, backupPath);
      debug('Created backup at:', backupPath);
    }

    // 3. Rename temp to cache (atomic on most filesystems)
    renameSync(tempPath, cachePath);
    debug('Model cache updated at:', cachePath);
  } catch (error) {
    // Clean up temp file if it exists
    if (existsSync(tempPath)) {
      try {
        const fs = require('fs');
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

/**
 * Create an empty cache structure
 */
export function createEmptyCache(): CachedModels {
  return {
    version: CACHE_VERSION,
    fetchedAt: new Date().toISOString(),
    sourceUrls: {},
    providerCounts: {},
    models: [],
  };
}

/**
 * Get models for a specific provider from cache
 */
export function getCachedModelsForProvider(
  cache: CachedModels,
  provider: ModelProvider
): NormalizedModel[] {
  return cache.models
    .filter((m) => m.provider === provider)
    .sort((a, b) => a.recommendedRank - b.recommendedRank);
}

/**
 * Get top N recommended models per provider
 */
export function getRecommendedModels(
  cache: CachedModels,
  maxPerProvider: number = 1
): NormalizedModel[] {
  const providers: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex'];
  const recommended: NormalizedModel[] = [];

  for (const provider of providers) {
    const providerModels = getCachedModelsForProvider(cache, provider);
    recommended.push(...providerModels.slice(0, maxPerProvider));
  }

  return recommended;
}

/**
 * Check if cache exists and is valid
 */
export function hasCachedModels(): boolean {
  return readModelCache() !== null;
}

/**
 * Get cache age in milliseconds (or null if no cache)
 */
export function getCacheAge(): number | null {
  const cache = readModelCache();
  if (!cache) return null;

  const fetchedAt = new Date(cache.fetchedAt).getTime();
  return Date.now() - fetchedAt;
}

/**
 * Format cache age as human-readable string
 */
export function formatCacheAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return 'just now';
}

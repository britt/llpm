import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectConfig, Project } from '../types/project';

// Import functions - use real implementations with temp files
import {
  loadProjectConfig,
  saveProjectConfig,
  getProjectConfigCacheStats
} from './projectConfig';

describe('Project Config Caching', () => {
  it('should cache project config after first load', async () => {
    // Load config twice
    const config1 = await loadProjectConfig();
    const stats1 = getProjectConfigCacheStats();

    const config2 = await loadProjectConfig();
    const stats2 = getProjectConfigCacheStats();

    // Second load should be a cache hit
    expect(stats2.hits).toBeGreaterThan(stats1.hits);
    expect(config1).toBe(config2); // Same object reference from cache
  });

  it('should invalidate cache after save', async () => {
    // Load and cache config
    const config1 = await loadProjectConfig();
    const stats1 = getProjectConfigCacheStats();
    const initialMisses = stats1.misses;

    // Modify and save config
    await saveProjectConfig(config1);

    // Next load should be a cache miss (cache was invalidated)
    const config2 = await loadProjectConfig();
    const stats2 = getProjectConfigCacheStats();

    expect(stats2.misses).toBeGreaterThan(initialMisses);
  });

  it('should track cache statistics correctly', async () => {
    const stats1 = getProjectConfigCacheStats();
    const initialHits = stats1.hits;
    const initialMisses = stats1.misses;

    // First load - may be hit or miss depending on previous tests
    await loadProjectConfig();
    const stats2 = getProjectConfigCacheStats();

    // Either hits or misses should have increased
    expect(stats2.hits + stats2.misses).toBeGreaterThan(initialHits + initialMisses);

    // Second load = hit (already cached from first load above)
    await loadProjectConfig();
    const stats3 = getProjectConfigCacheStats();
    expect(stats3.hits).toBeGreaterThan(stats2.hits);

    // Hit rate should be calculable
    expect(stats3.hitRate).toBeGreaterThanOrEqual(0);
    expect(stats3.hitRate).toBeLessThanOrEqual(1);
  });

  it('should deduplicate concurrent loads', async () => {
    // Start multiple concurrent loads
    const promises = [
      loadProjectConfig(),
      loadProjectConfig(),
      loadProjectConfig()
    ];

    const results = await Promise.all(promises);

    // All should return the same result
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);

    // Should only count as 1 or 2 cache misses (1 for initial load, 1 for cache)
    // not 3 separate filesystem reads
    const stats = getProjectConfigCacheStats();
    expect(stats.misses).toBeLessThan(3);
  });

  it('should demonstrate performance improvement with caching', async () => {
    // Invalidate cache to start fresh
    const config = await loadProjectConfig();
    await saveProjectConfig(config);

    // Measure time for cache miss (filesystem read)
    const missStart = performance.now();
    await loadProjectConfig();
    const missDuration = performance.now() - missStart;

    // Measure time for cache hit (memory read)
    const hitStart = performance.now();
    await loadProjectConfig();
    const hitDuration = performance.now() - hitStart;

    // Cache hit should be significantly faster than cache miss
    // Typically 10-100x faster for in-memory vs filesystem
    expect(hitDuration).toBeLessThan(missDuration);

    // Cache hit should be very fast (< 1ms typically)
    expect(hitDuration).toBeLessThan(10);
  });
});
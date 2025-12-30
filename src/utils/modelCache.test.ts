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
});

/**
 * HistorySearchBar Tests
 *
 * Tests the match info display logic without rendering with ink.
 * Rendering tests are not included due to yoga-layout WASM compilation issues in CI.
 */

import { describe, it, expect } from 'vitest';

// Replicate the match info logic from HistorySearchBar for testing
function getMatchInfo(query: string, matchCount: number, currentMatch: number): string {
  if (query.length === 0) return '';
  if (matchCount > 0) return `${currentMatch + 1} of ${matchCount}`;
  return 'No matches';
}

describe('HistorySearchBar Logic', () => {
  describe('match info display', () => {
    it('should return empty string when query is empty', () => {
      expect(getMatchInfo('', 0, 0)).toBe('');
    });

    it('should show current match position when there are matches', () => {
      expect(getMatchInfo('test', 5, 2)).toBe('3 of 5');
    });

    it('should show first match position', () => {
      expect(getMatchInfo('test', 3, 0)).toBe('1 of 3');
    });

    it('should show "No matches" when query has no results', () => {
      expect(getMatchInfo('xyz', 0, 0)).toBe('No matches');
    });

    it('should show single match correctly', () => {
      expect(getMatchInfo('unique', 1, 0)).toBe('1 of 1');
    });
  });
});

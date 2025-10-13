import { describe, it, expect } from 'vitest';
import {
  normalizeAnthropicModel,
  isValidAnthropicModel,
  getModelAliases,
  listAnthropicModels,
  ANTHROPIC_MODEL_MAPPING
} from './modelMapping';

describe('modelMapping', () => {
  describe('normalizeAnthropicModel', () => {
    it('should normalize Vercel AI SDK format to canonical ID', () => {
      expect(normalizeAnthropicModel('anthropic/claude-sonnet-4.5')).toBe('claude-sonnet-4-5-20250929');
      expect(normalizeAnthropicModel('anthropic/claude-opus-4.1')).toBe('claude-opus-4-1-20250805');
      expect(normalizeAnthropicModel('anthropic/claude-sonnet-4')).toBe('claude-sonnet-4-20250514');
    });

    it('should normalize Anthropic aliases to canonical ID', () => {
      expect(normalizeAnthropicModel('claude-sonnet-4-5')).toBe('claude-sonnet-4-5-20250929');
      expect(normalizeAnthropicModel('claude-opus-4-1')).toBe('claude-opus-4-1-20250805');
      expect(normalizeAnthropicModel('claude-sonnet-4')).toBe('claude-sonnet-4-20250514');
      expect(normalizeAnthropicModel('claude-3-5-haiku')).toBe('claude-3-5-haiku-20241022');
    });

    it('should return canonical ID unchanged', () => {
      expect(normalizeAnthropicModel('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5-20250929');
      expect(normalizeAnthropicModel('claude-opus-4-1-20250805')).toBe('claude-opus-4-1-20250805');
      expect(normalizeAnthropicModel('claude-3-haiku-20240307')).toBe('claude-3-haiku-20240307');
    });

    it('should be case-insensitive', () => {
      expect(normalizeAnthropicModel('CLAUDE-SONNET-4-5')).toBe('claude-sonnet-4-5-20250929');
      expect(normalizeAnthropicModel('Anthropic/Claude-Sonnet-4.5')).toBe('claude-sonnet-4-5-20250929');
    });

    it('should handle whitespace', () => {
      expect(normalizeAnthropicModel(' claude-sonnet-4-5 ')).toBe('claude-sonnet-4-5-20250929');
      expect(normalizeAnthropicModel('  anthropic/claude-opus-4.1  ')).toBe('claude-opus-4-1-20250805');
    });

    it('should return original name if not recognized', () => {
      expect(normalizeAnthropicModel('claude-unknown-model')).toBe('claude-unknown-model');
      expect(normalizeAnthropicModel('gpt-4')).toBe('gpt-4');
    });

    it('should handle all documented snapshot IDs', () => {
      const snapshots = [
        'claude-sonnet-4-5-20250929',
        'claude-opus-4-1-20250805',
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307'
      ];

      snapshots.forEach(snapshot => {
        expect(normalizeAnthropicModel(snapshot)).toBe(snapshot);
      });
    });
  });

  describe('isValidAnthropicModel', () => {
    it('should return true for canonical IDs', () => {
      expect(isValidAnthropicModel('claude-sonnet-4-5-20250929')).toBe(true);
      expect(isValidAnthropicModel('claude-opus-4-1-20250805')).toBe(true);
    });

    it('should return true for aliases', () => {
      expect(isValidAnthropicModel('claude-sonnet-4-5')).toBe(true);
      expect(isValidAnthropicModel('claude-opus-4-1')).toBe(true);
      expect(isValidAnthropicModel('claude-3-5-haiku')).toBe(true);
    });

    it('should return true for Vercel AI SDK format', () => {
      expect(isValidAnthropicModel('anthropic/claude-sonnet-4.5')).toBe(true);
      expect(isValidAnthropicModel('anthropic/claude-opus-4.1')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isValidAnthropicModel('CLAUDE-SONNET-4-5')).toBe(true);
      expect(isValidAnthropicModel('Anthropic/Claude-Opus-4.1')).toBe(true);
    });

    it('should return false for unknown models', () => {
      expect(isValidAnthropicModel('claude-unknown')).toBe(false);
      expect(isValidAnthropicModel('gpt-4')).toBe(false);
      expect(isValidAnthropicModel('')).toBe(false);
    });
  });

  describe('getModelAliases', () => {
    it('should return all aliases for a canonical ID', () => {
      const aliases = getModelAliases('claude-sonnet-4-5-20250929');
      expect(aliases).toContain('claude-sonnet-4-5');
      expect(aliases).toContain('claude-sonnet-4.5');
      expect(aliases).toContain('anthropic/claude-sonnet-4.5');
      expect(aliases).toContain('anthropic/claude-sonnet-4-5');
    });

    it('should return empty array for unknown ID', () => {
      expect(getModelAliases('unknown-model')).toEqual([]);
    });

    it('should return all documented aliases', () => {
      const sonnet45Aliases = getModelAliases('claude-sonnet-4-5-20250929');
      expect(sonnet45Aliases.length).toBeGreaterThan(0);

      const opus41Aliases = getModelAliases('claude-opus-4-1-20250805');
      expect(opus41Aliases.length).toBeGreaterThan(0);
    });
  });

  describe('listAnthropicModels', () => {
    it('should return all canonical model IDs', () => {
      const models = listAnthropicModels();
      expect(models).toContain('claude-sonnet-4-5-20250929');
      expect(models).toContain('claude-opus-4-1-20250805');
      expect(models).toContain('claude-sonnet-4-20250514');
      expect(models).toContain('claude-opus-4-20250514');
      expect(models).toContain('claude-3-7-sonnet-20250219');
      expect(models).toContain('claude-3-5-haiku-20241022');
      expect(models).toContain('claude-3-haiku-20240307');
    });

    it('should return non-empty array', () => {
      const models = listAnthropicModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('should match keys in ANTHROPIC_MODEL_MAPPING', () => {
      const models = listAnthropicModels();
      const mappingKeys = Object.keys(ANTHROPIC_MODEL_MAPPING);
      expect(models.sort()).toEqual(mappingKeys.sort());
    });
  });

  describe('ANTHROPIC_MODEL_MAPPING', () => {
    it('should have Claude Sonnet 4.5 entry', () => {
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-sonnet-4-5-20250929');
      const entry = ANTHROPIC_MODEL_MAPPING['claude-sonnet-4-5-20250929'];
      expect(entry.canonical).toBe('claude-sonnet-4-5-20250929');
      expect(entry.aliases).toContain('claude-sonnet-4-5');
    });

    it('should have all documented Claude 4 models', () => {
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-opus-4-1-20250805');
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-sonnet-4-20250514');
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-opus-4-20250514');
    });

    it('should have all documented Claude 3.x models', () => {
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-3-7-sonnet-20250219');
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-3-5-haiku-20241022');
      expect(ANTHROPIC_MODEL_MAPPING).toHaveProperty('claude-3-haiku-20240307');
    });

    it('should have Vercel AI SDK format aliases', () => {
      const sonnet45 = ANTHROPIC_MODEL_MAPPING['claude-sonnet-4-5-20250929'];
      expect(sonnet45.aliases).toContain('anthropic/claude-sonnet-4.5');
    });
  });
});

/**
 * Tests for Model Provider Factory
 */
import { describe, it, expect } from 'vitest';
import {
  getProviderAdapter,
  getAllProviderAdapters
} from './index';
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { GroqAdapter } from './groq';
import { GoogleVertexAdapter } from './googleVertex';

describe('Model Provider Factory', () => {
  describe('getProviderAdapter', () => {
    it('should return OpenAI adapter for openai provider', () => {
      const adapter = getProviderAdapter('openai');
      expect(adapter).toBeInstanceOf(OpenAIAdapter);
      expect(adapter.provider).toBe('openai');
    });

    it('should return Anthropic adapter for anthropic provider', () => {
      const adapter = getProviderAdapter('anthropic');
      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.provider).toBe('anthropic');
    });

    it('should return Groq adapter for groq provider', () => {
      const adapter = getProviderAdapter('groq');
      expect(adapter).toBeInstanceOf(GroqAdapter);
      expect(adapter.provider).toBe('groq');
    });

    it('should return Google Vertex adapter for google-vertex provider', () => {
      const adapter = getProviderAdapter('google-vertex');
      expect(adapter).toBeInstanceOf(GoogleVertexAdapter);
      expect(adapter.provider).toBe('google-vertex');
    });

    it('should throw error for unknown provider', () => {
      expect(() => getProviderAdapter('unknown' as any)).toThrow('Unknown provider: unknown');
    });
  });

  describe('getAllProviderAdapters', () => {
    it('should return all available provider adapters', () => {
      const adapters = getAllProviderAdapters();

      expect(adapters).toHaveLength(4);

      // Check each adapter type is present
      expect(adapters.some(a => a instanceof OpenAIAdapter)).toBe(true);
      expect(adapters.some(a => a instanceof AnthropicAdapter)).toBe(true);
      expect(adapters.some(a => a instanceof GroqAdapter)).toBe(true);
      expect(adapters.some(a => a instanceof GoogleVertexAdapter)).toBe(true);
    });

    it('should return adapters with correct provider names', () => {
      const adapters = getAllProviderAdapters();
      const providerNames = adapters.map(a => a.provider);

      expect(providerNames).toContain('openai');
      expect(providerNames).toContain('anthropic');
      expect(providerNames).toContain('groq');
      expect(providerNames).toContain('google-vertex');
    });

    it('should return new instances each time', () => {
      const adapters1 = getAllProviderAdapters();
      const adapters2 = getAllProviderAdapters();

      // Each call should create new instances
      expect(adapters1[0]).not.toBe(adapters2[0]);
    });

    it('should return adapters with getSourceUrl method', () => {
      const adapters = getAllProviderAdapters();

      for (const adapter of adapters) {
        expect(typeof adapter.getSourceUrl).toBe('function');
        expect(typeof adapter.getSourceUrl()).toBe('string');
      }
    });

    it('should return adapters with fetchModels method', () => {
      const adapters = getAllProviderAdapters();

      for (const adapter of adapters) {
        expect(typeof adapter.fetchModels).toBe('function');
      }
    });
  });
});

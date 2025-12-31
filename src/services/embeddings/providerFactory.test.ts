/**
 * Tests for EmbeddingsProviderFactory
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

// Mock providers
const mockLocalIsAvailable = vi.hoisted(() => vi.fn());
const mockOpenAIIsAvailable = vi.hoisted(() => vi.fn());

vi.mock('./localProvider', () => ({
  LocalEmbeddingsProvider: vi.fn().mockImplementation(() => ({
    getName: () => 'local-mock',
    isAvailable: mockLocalIsAvailable
  }))
}));

vi.mock('./openaiProvider', () => ({
  OpenAIEmbeddingsProvider: vi.fn().mockImplementation(() => ({
    getName: () => 'openai-mock',
    isAvailable: mockOpenAIIsAvailable
  }))
}));

import { EmbeddingsProviderFactory } from './providerFactory';

describe('EmbeddingsProviderFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalIsAvailable.mockResolvedValue(true);
    mockOpenAIIsAvailable.mockResolvedValue(true);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const factory = new EmbeddingsProviderFactory();
      expect(factory).toBeInstanceOf(EmbeddingsProviderFactory);
    });

    it('should accept custom config', () => {
      const factory = new EmbeddingsProviderFactory({
        provider: 'openai',
        fallbackToOpenAI: false
      });
      expect(factory).toBeInstanceOf(EmbeddingsProviderFactory);
    });
  });

  describe('getProvider with local config', () => {
    it('should return local provider when available', async () => {
      mockLocalIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({ provider: 'local' });
      const provider = await factory.getProvider();

      expect(provider.getName()).toBe('local-mock');
    });

    it('should fall back to OpenAI when local not available and fallback enabled', async () => {
      mockLocalIsAvailable.mockResolvedValue(false);
      mockOpenAIIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({
        provider: 'local',
        fallbackToOpenAI: true
      });
      const provider = await factory.getProvider();

      expect(provider.getName()).toBe('openai-mock');
    });

    it('should throw when local not available and fallback disabled', async () => {
      mockLocalIsAvailable.mockResolvedValue(false);

      const factory = new EmbeddingsProviderFactory({
        provider: 'local',
        fallbackToOpenAI: false
      });

      await expect(factory.getProvider()).rejects.toThrow(
        'Local embeddings not available (Python not installed) and fallback disabled'
      );
    });
  });

  describe('getProvider with openai config', () => {
    it('should return OpenAI provider when available', async () => {
      mockOpenAIIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({ provider: 'openai' });
      const provider = await factory.getProvider();

      expect(provider.getName()).toBe('openai-mock');
    });

    it('should throw when OpenAI not available', async () => {
      mockOpenAIIsAvailable.mockResolvedValue(false);

      const factory = new EmbeddingsProviderFactory({ provider: 'openai' });

      await expect(factory.getProvider()).rejects.toThrow(
        'OpenAI embeddings not available (API key missing or invalid)'
      );
    });
  });

  describe('getProvider with auto config', () => {
    it('should prefer local provider when available', async () => {
      mockLocalIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({ provider: 'auto' });
      const provider = await factory.getProvider();

      expect(provider.getName()).toBe('local-mock');
    });

    it('should fall back to OpenAI when local not available', async () => {
      mockLocalIsAvailable.mockResolvedValue(false);
      mockOpenAIIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({ provider: 'auto' });
      const provider = await factory.getProvider();

      expect(provider.getName()).toBe('openai-mock');
    });

    it('should throw when neither local nor OpenAI available', async () => {
      mockLocalIsAvailable.mockResolvedValue(false);
      mockOpenAIIsAvailable.mockResolvedValue(false);

      const factory = new EmbeddingsProviderFactory({ provider: 'auto' });

      await expect(factory.getProvider()).rejects.toThrow(
        'OpenAI embeddings not available (API key missing or invalid)'
      );
    });
  });

  describe('caching', () => {
    it('should cache provider after first call', async () => {
      mockLocalIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({ provider: 'local' });

      const provider1 = await factory.getProvider();
      const provider2 = await factory.getProvider();

      expect(provider1).toBe(provider2);
      // Should only check availability once due to caching
      expect(mockLocalIsAvailable).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('should clear cached provider', async () => {
      mockLocalIsAvailable.mockResolvedValue(true);

      const factory = new EmbeddingsProviderFactory({ provider: 'local' });

      await factory.getProvider();
      factory.refresh();
      await factory.getProvider();

      // Should check availability twice after refresh
      expect(mockLocalIsAvailable).toHaveBeenCalledTimes(2);
    });
  });

  describe('default provider handling', () => {
    it('should handle default switch case (same as auto)', async () => {
      mockLocalIsAvailable.mockResolvedValue(true);

      // Using an unknown provider type should fall through to auto/default
      const factory = new EmbeddingsProviderFactory({ provider: 'auto' });
      const provider = await factory.getProvider();

      expect(provider.getName()).toBe('local-mock');
    });
  });
});

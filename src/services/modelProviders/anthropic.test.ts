import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from './anthropic';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new AnthropicAdapter();
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('provider', () => {
    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('anthropic');
    });
  });

  describe('getSourceUrl', () => {
    it('should return Anthropic models URL', () => {
      const url = adapter.getSourceUrl();
      expect(url).toBe('https://api.anthropic.com/v1/models');
    });
  });

  describe('fetchModels', () => {
    it('should return error when API key is missing', async () => {
      const result = await adapter.fetchModels({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing ANTHROPIC_API_KEY');
      expect(result.models).toEqual([]);
    });

    it('should fetch and normalize models successfully', async () => {
      const mockModels = {
        data: [
          { id: 'claude-3-5-sonnet-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet', created_at: '2024-10-22' },
          { id: 'claude-3-opus-20240229', type: 'model', display_name: 'Claude 3 Opus', created_at: '2024-02-29' },
          { id: 'claude-3-haiku-20240307', type: 'model', display_name: 'Claude 3 Haiku', created_at: '2024-03-07' }
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(3);

      // Check that all models are included
      const sonnet = result.models.find(m => m.id.includes('sonnet'));
      expect(sonnet).toBeDefined();
      expect(sonnet?.provider).toBe('anthropic');
      expect(sonnet?.supportsChat).toBe(true);

      // Check fetch was called with correct headers
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01'
          })
        })
      );
    });

    it('should handle 401 authentication error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key')
      });

      const result = await adapter.fetchModels({ apiKey: 'invalid-key' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Anthropic API key');
    });

    it('should handle 429 rate limit error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limited')
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit exceeded');
    });

    it('should handle other API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should filter to only model type entries', async () => {
      const mockModels = {
        data: [
          { id: 'claude-3-5-sonnet-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet' },
          { id: 'some-other-thing', type: 'not_model', display_name: 'Not a model' }
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(1);
      expect(result.models[0].id).toContain('claude');
    });

    it('should deduplicate models by family, preferring non-dated versions', async () => {
      const mockModels = {
        data: [
          { id: 'claude-3-5-sonnet-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet', created_at: '2024-10-22' },
          { id: 'claude-3-5-sonnet', type: 'model', display_name: 'Claude 3.5 Sonnet Latest', created_at: '2024-11-01' }
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Should have deduplicated to one model
      const sonnetModels = result.models.filter(m => m.family.includes('claude-3-5-sonnet'));
      expect(sonnetModels.length).toBe(1);
      // Should prefer the non-dated version
      expect(sonnetModels[0].id).toBe('claude-3-5-sonnet');
    });

    it('should sort models by family ranking', async () => {
      const mockModels = {
        data: [
          { id: 'claude-3-haiku-20240307', type: 'model', display_name: 'Claude 3 Haiku' },
          { id: 'claude-3-5-sonnet-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-opus-20240229', type: 'model', display_name: 'Claude 3 Opus' }
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Claude 3.5 Sonnet should come before Claude 3 Opus which should come before Claude 3 Haiku
      const sonnetIndex = result.models.findIndex(m => m.id.includes('3-5-sonnet'));
      const opusIndex = result.models.findIndex(m => m.id.includes('opus'));
      const haikuIndex = result.models.findIndex(m => m.id.includes('haiku'));

      expect(sonnetIndex).toBeLessThan(opusIndex);
      expect(opusIndex).toBeLessThan(haikuIndex);
    });

    it('should format display names correctly', async () => {
      const mockModels = {
        data: [
          { id: 'claude-3-5-sonnet-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet' },
          { id: 'claude-3-opus-20240229', type: 'model' } // No display_name
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);

      const sonnet = result.models.find(m => m.id.includes('sonnet'));
      expect(sonnet?.displayName).toBe('Claude 3.5 Sonnet');

      const opus = result.models.find(m => m.id.includes('opus'));
      expect(opus?.displayName).toBe('Claude 3 Opus');
    });

    it('should handle partial family matching for model ranking', async () => {
      // A model whose family starts with a known key but has additional suffix
      const mockModels = {
        data: [
          { id: 'claude-3-5-sonnet-extended-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet Extended' },
          { id: 'claude-unknown-model', type: 'model', display_name: 'Unknown Model' }
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Extended model should have a rank (partial match)
      const extendedModel = result.models.find(m => m.id.includes('extended'));
      expect(extendedModel?.recommendedRank).toBeDefined();
      // Unknown model should have default rank of 100
      const unknownModel = result.models.find(m => m.id.includes('unknown'));
      expect(unknownModel?.recommendedRank).toBe(100);
    });

    it('should deduplicate by created_at when both models have dates', async () => {
      // Two dated models in the same family - should prefer the newer one
      const mockModels = {
        data: [
          { id: 'claude-3-5-sonnet-20240101', type: 'model', display_name: 'Claude 3.5 Sonnet Old', created_at: '2024-01-01T00:00:00Z' },
          { id: 'claude-3-5-sonnet-20241122', type: 'model', display_name: 'Claude 3.5 Sonnet New', created_at: '2024-11-22T00:00:00Z' }
        ],
        has_more: false
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Should have deduplicated to one model
      const sonnetModels = result.models.filter(m => m.family.includes('claude-3-5-sonnet'));
      expect(sonnetModels.length).toBe(1);
      // Should prefer the newer dated version (by created_at)
      expect(sonnetModels[0].id).toBe('claude-3-5-sonnet-20241122');
    });
  });
});

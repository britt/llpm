import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIAdapter } from './openai';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new OpenAIAdapter();
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('provider', () => {
    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('openai');
    });
  });

  describe('getSourceUrl', () => {
    it('should return OpenAI models URL', () => {
      const url = adapter.getSourceUrl();
      expect(url).toBe('https://api.openai.com/v1/models');
    });
  });

  describe('fetchModels', () => {
    it('should return error when API key is missing', async () => {
      const result = await adapter.fetchModels({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing OPENAI_API_KEY');
      expect(result.models).toEqual([]);
    });

    it('should fetch and normalize models successfully', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4o-2024-08-06', object: 'model', created: 1722988800, owned_by: 'openai' },
          { id: 'gpt-4o-mini', object: 'model', created: 1722902400, owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' },
          { id: 'dall-e-3', object: 'model', created: 1698785189, owned_by: 'openai' } // Non-chat model
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBeGreaterThan(0);

      // Check that dall-e-3 was filtered out
      const dallE = result.models.find(m => m.id.includes('dall-e'));
      expect(dallE).toBeUndefined();

      // Check that GPT models are included
      const gpt4o = result.models.find(m => m.id.includes('gpt-4o'));
      expect(gpt4o).toBeDefined();
      expect(gpt4o?.provider).toBe('openai');
      expect(gpt4o?.supportsChat).toBe(true);

      // Check fetch was called with correct headers
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-key'
          }
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
      expect(result.error).toContain('Invalid OpenAI API key');
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

    it('should deduplicate models by base ID keeping latest version', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4o-2024-05-01', object: 'model', created: 1714521600, owned_by: 'openai' },
          { id: 'gpt-4o-2024-08-06', object: 'model', created: 1722988800, owned_by: 'openai' }, // Later
          { id: 'gpt-4o', object: 'model', created: 1710000000, owned_by: 'openai' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Should only have one gpt-4o entry (the latest version)
      const gpt4oModels = result.models.filter(m => m.id.includes('gpt-4o'));
      expect(gpt4oModels.length).toBe(1);
      expect(gpt4oModels[0].id).toBe('gpt-4o-2024-08-06');
    });

    it('should sort models by family ranking', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' },
          { id: 'gpt-4o-mini', object: 'model', created: 1722902400, owned_by: 'openai' },
          { id: 'o1-mini', object: 'model', created: 1725494400, owned_by: 'openai' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // GPT-4o should come before o1 which should come before GPT-3.5
      const gpt4oIndex = result.models.findIndex(m => m.id.includes('gpt-4o'));
      const o1Index = result.models.findIndex(m => m.id.includes('o1'));
      const gpt35Index = result.models.findIndex(m => m.id.includes('gpt-3.5'));

      expect(gpt4oIndex).toBeLessThan(o1Index);
      expect(o1Index).toBeLessThan(gpt35Index);
    });

    it('should format display names correctly', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4o-2024-08-06', object: 'model', created: 1722988800, owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);

      const gpt4o = result.models.find(m => m.id.includes('gpt-4o'));
      expect(gpt4o?.displayName).toBe('GPT-4o');

      const gpt35 = result.models.find(m => m.id.includes('gpt-3.5'));
      expect(gpt35?.displayName).toBe('GPT-3.5 Turbo');
    });

    it('should handle unknown model families with fallback pattern', async () => {
      const mockModels = {
        data: [
          // Model that passes chat filter (gpt-) but doesn't match known families
          // This forces the fallback regex pattern to be used
          { id: 'gpt-next-turbo-2024', object: 'model', created: 1722988800, owned_by: 'openai' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(1);
      expect(result.models[0].id).toBe('gpt-next-turbo-2024');
      // Should have a family extracted via fallback regex (non-greedy match)
      expect(result.models[0].family).toBeDefined();
      // Unknown family should get default rank of 100
      expect(result.models[0].recommendedRank).toBe(100);
    });
  });
});

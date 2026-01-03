import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CerebrasAdapter } from './cerebras';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

describe('CerebrasAdapter', () => {
  let adapter: CerebrasAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new CerebrasAdapter();
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('provider', () => {
    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('cerebras');
    });
  });

  describe('getSourceUrl', () => {
    it('should return Cerebras models URL', () => {
      const url = adapter.getSourceUrl();
      expect(url).toBe('https://api.cerebras.ai/v1/models');
    });
  });

  describe('fetchModels', () => {
    it('should return error when API key is missing', async () => {
      const result = await adapter.fetchModels({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing CEREBRAS_API_KEY');
      expect(result.models).toEqual([]);
    });

    it('should fetch and normalize models successfully', async () => {
      const mockModels = {
        data: [
          { id: 'qwen-3-235b-a22b-instruct-2507', object: 'model', created: 1750000000, owned_by: 'alibaba' },
          { id: 'llama-3.3-70b', object: 'model', created: 1733443200, owned_by: 'meta' },
          { id: 'llama3.1-8b', object: 'model', created: 1721692800, owned_by: 'meta' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(3);

      // Check that Qwen model is included
      const qwen = result.models.find(m => m.id.includes('qwen'));
      expect(qwen).toBeDefined();
      expect(qwen?.provider).toBe('cerebras');
      expect(qwen?.supportsChat).toBe(true);

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
      expect(result.error).toContain('Invalid Cerebras API key');
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

    it('should sort models by family ranking with qwen-3 first', async () => {
      const mockModels = {
        data: [
          { id: 'llama3.1-8b', object: 'model', created: 1721692800, owned_by: 'meta' },
          { id: 'qwen-3-235b-a22b-instruct-2507', object: 'model', created: 1750000000, owned_by: 'alibaba' },
          { id: 'llama-3.3-70b', object: 'model', created: 1733443200, owned_by: 'meta' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Qwen should come first (target model for issue #179)
      expect(result.models[0].id).toContain('qwen');
    });

    it('should format display names correctly', async () => {
      const mockModels = {
        data: [
          { id: 'qwen-3-235b-a22b-instruct-2507', object: 'model', created: 1750000000, owned_by: 'alibaba' },
          { id: 'llama-3.3-70b', object: 'model', created: 1733443200, owned_by: 'meta' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);

      const qwen = result.models.find(m => m.id.includes('qwen'));
      expect(qwen?.displayName).toBeTruthy();

      const llama = result.models.find(m => m.id.includes('llama-3.3'));
      expect(llama?.displayName).toBeTruthy();
    });

    it('should include owned_by in metadata', async () => {
      const mockModels = {
        data: [
          { id: 'qwen-3-235b-a22b-instruct-2507', object: 'model', created: 1750000000, owned_by: 'alibaba' }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models[0].metadata?.owned_by).toBe('alibaba');
    });
  });
});

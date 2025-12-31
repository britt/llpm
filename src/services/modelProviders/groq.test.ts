import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqAdapter } from './groq';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

describe('GroqAdapter', () => {
  let adapter: GroqAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new GroqAdapter();
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('provider', () => {
    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('groq');
    });
  });

  describe('getSourceUrl', () => {
    it('should return Groq models URL', () => {
      const url = adapter.getSourceUrl();
      expect(url).toBe('https://api.groq.com/openai/v1/models');
    });
  });

  describe('fetchModels', () => {
    it('should return error when API key is missing', async () => {
      const result = await adapter.fetchModels({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing GROQ_API_KEY');
      expect(result.models).toEqual([]);
    });

    it('should fetch and normalize models successfully', async () => {
      const mockModels = {
        data: [
          { id: 'llama-3.3-70b-versatile', object: 'model', created: 1730592000, owned_by: 'meta', active: true, context_window: 131072 },
          { id: 'llama-3.1-8b-instant', object: 'model', created: 1721001600, owned_by: 'meta', active: true, context_window: 8192 },
          { id: 'mixtral-8x7b-32768', object: 'model', created: 1706140800, owned_by: 'mistral', active: true, context_window: 32768 }
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

      // Check that Llama model is included
      const llama = result.models.find(m => m.id.includes('llama-3.3'));
      expect(llama).toBeDefined();
      expect(llama?.provider).toBe('groq');
      expect(llama?.supportsChat).toBe(true);

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
      expect(result.error).toContain('Invalid Groq API key');
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

    it('should filter out inactive models', async () => {
      const mockModels = {
        data: [
          { id: 'llama-3.3-70b-versatile', object: 'model', created: 1730592000, owned_by: 'meta', active: true },
          { id: 'old-model', object: 'model', created: 1700000000, owned_by: 'deprecated', active: false }
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
      expect(result.models[0].id).toBe('llama-3.3-70b-versatile');
    });

    it('should sort models by family ranking', async () => {
      const mockModels = {
        data: [
          { id: 'gemma2-9b-it', object: 'model', created: 1700000000, owned_by: 'google', active: true },
          { id: 'llama-3.3-70b-versatile', object: 'model', created: 1730592000, owned_by: 'meta', active: true },
          { id: 'mixtral-8x7b-32768', object: 'model', created: 1706140800, owned_by: 'mistral', active: true }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      // Llama 3.3 should come before Mixtral which should come before Gemma
      const llamaIndex = result.models.findIndex(m => m.id.includes('llama'));
      const mixtralIndex = result.models.findIndex(m => m.id.includes('mixtral'));
      const gemmaIndex = result.models.findIndex(m => m.id.includes('gemma'));

      expect(llamaIndex).toBeLessThan(mixtralIndex);
      expect(mixtralIndex).toBeLessThan(gemmaIndex);
    });

    it('should format display names correctly', async () => {
      const mockModels = {
        data: [
          { id: 'llama-3.3-70b-versatile', object: 'model', created: 1730592000, owned_by: 'meta', active: true },
          { id: 'mixtral-8x7b-32768', object: 'model', created: 1706140800, owned_by: 'mistral', active: true },
          { id: 'unknown-model-123', object: 'model', created: 1706140800, owned_by: 'unknown', active: true }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);

      const llama = result.models.find(m => m.id.includes('llama'));
      expect(llama?.displayName).toBe('Llama 3.3 70B');

      const mixtral = result.models.find(m => m.id.includes('mixtral'));
      expect(mixtral?.displayName).toBe('Mixtral 8x7B');

      // Unknown model should get a generated display name
      const unknown = result.models.find(m => m.id.includes('unknown'));
      expect(unknown?.displayName).toBeTruthy();
    });

    it('should include context window in metadata', async () => {
      const mockModels = {
        data: [
          { id: 'llama-3.3-70b-versatile', object: 'model', created: 1730592000, owned_by: 'meta', active: true, context_window: 131072 }
        ],
        object: 'list'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ apiKey: 'test-key' });

      expect(result.success).toBe(true);
      expect(result.models[0].metadata?.context_window).toBe(131072);
    });
  });
});

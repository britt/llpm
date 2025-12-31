import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleVertexAdapter } from './googleVertex';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

// Mock child_process for gcloud auth
const mockExec = vi.fn();
vi.mock('child_process', () => ({
  exec: (...args: unknown[]) => mockExec(...args)
}));

// Mock util.promisify to return a promise-based exec
vi.mock('util', () => ({
  promisify: (fn: unknown) => {
    return async (...args: unknown[]) => {
      return new Promise((resolve, reject) => {
        (fn as ((...args: unknown[]) => void))(...args, (error: Error | null, stdout: string) => {
          if (error) reject(error);
          else resolve({ stdout, stderr: '' });
        });
      });
    };
  }
}));

describe('GoogleVertexAdapter', () => {
  let adapter: GoogleVertexAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new GoogleVertexAdapter();
    originalFetch = global.fetch;
    vi.clearAllMocks();

    // Default mock for gcloud auth - returns token successfully
    mockExec.mockImplementation((_cmd: string, _opts: unknown, callback: (err: null, stdout: string) => void) => {
      callback(null, 'mock-access-token\n');
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('provider', () => {
    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('google-vertex');
    });
  });

  describe('getSourceUrl', () => {
    it('should return Google Vertex AI docs URL', () => {
      const url = adapter.getSourceUrl();
      expect(url).toBe('https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini');
    });
  });

  describe('fetchModels', () => {
    it('should return error when project ID is missing', async () => {
      const result = await adapter.fetchModels({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing GOOGLE_VERTEX_PROJECT_ID');
      expect(result.models).toEqual([]);
    });

    it('should use default location when not specified', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] })
      });

      await adapter.fetchModels({ projectId: 'test-project' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('us-central1'),
        expect.any(Object)
      );
    });

    it('should use custom location when specified', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] })
      });

      await adapter.fetchModels({ projectId: 'test-project', location: 'europe-west1' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('europe-west1'),
        expect.any(Object)
      );
    });

    it('should fetch and normalize models successfully', async () => {
      const mockModels = {
        models: [
          { name: 'projects/123/locations/us/publishers/google/models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'projects/123/locations/us/publishers/google/models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportedGenerationMethods: ['generateContent', 'chat'] },
          { name: 'projects/123/locations/us/publishers/google/models/gemini-1.0-pro', displayName: 'Gemini 1.0 Pro', supportedGenerationMethods: ['generateContent'] }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(3);

      // Check that all models are normalized correctly
      const gemini20 = result.models.find(m => m.id.includes('gemini-2.0'));
      expect(gemini20).toBeDefined();
      expect(gemini20?.provider).toBe('google-vertex');
      expect(gemini20?.supportsChat).toBe(true);

      // Check fetch was called with correct headers
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('aiplatform.googleapis.com'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-access-token'
          }
        })
      );
    });

    it('should handle 401 authentication error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Unauthorized')
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Google Cloud authentication failed');
    });

    it('should handle 403 permission error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Permission denied')
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Google Cloud authentication failed');
    });

    it('should handle 404 project not found error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Project not found')
      });

      const result = await adapter.fetchModels({ projectId: 'missing-project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing-project');
      expect(result.error).toContain('not found');
    });

    it('should handle other API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle failed access token retrieval', async () => {
      // Mock gcloud auth to fail
      mockExec.mockImplementation((_cmd: string, _opts: unknown, callback: (err: Error) => void) => {
        callback(new Error('gcloud not found'));
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get Google Cloud access token');
    });

    it('should filter to generative models only', async () => {
      const mockModels = {
        models: [
          { name: 'gemini-1.5-pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          { name: 'gemini-1.0-pro', supportedGenerationMethods: ['chat'] }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      // Should only include models with generateContent or chat methods
      expect(result.models.length).toBe(2);
      expect(result.models.every(m => m.id.includes('gemini'))).toBe(true);
    });

    it('should fallback to gemini name check when no generation methods', async () => {
      const mockModels = {
        models: [
          { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' }, // No supportedGenerationMethods
          { name: 'some-other-model', displayName: 'Other' } // Not Gemini
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      // Should only include the gemini model based on name fallback
      expect(result.models.length).toBe(1);
      expect(result.models[0].id).toContain('gemini');
    });

    it('should deduplicate models by family', async () => {
      const mockModels = {
        models: [
          { name: 'gemini-1.5-pro-001', supportedGenerationMethods: ['generateContent'] },
          { name: 'gemini-1.5-pro-002', supportedGenerationMethods: ['generateContent'] },
          { name: 'gemini-1.5-pro-latest', supportedGenerationMethods: ['generateContent'] }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      // Should deduplicate to one gemini-1.5-pro entry
      expect(result.models.length).toBe(1);
      expect(result.models[0].family).toBe('gemini-1.5-pro');
    });

    it('should sort models by family ranking', async () => {
      const mockModels = {
        models: [
          { name: 'gemini-1.0-pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      // Gemini 2.5 Pro should come first (rank 1), then 1.5 Flash (rank 6), then 1.0 Pro (rank 7)
      expect(result.models[0].id).toContain('gemini-2.5-pro');
      expect(result.models[1].id).toContain('gemini-1.5-flash');
      expect(result.models[2].id).toContain('gemini-1.0-pro');
    });

    it('should format display names correctly', async () => {
      const mockModels = {
        models: [
          { name: 'gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
          { name: 'gemini-1.5-flash', displayName: 'Custom Display Name', supportedGenerationMethods: ['generateContent'] },
          { name: 'unknown-model-123', supportedGenerationMethods: ['generateContent'] }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);

      const gemini25 = result.models.find(m => m.id === 'gemini-2.5-pro');
      expect(gemini25?.displayName).toBe('Gemini 2.5 Pro');

      const gemini15 = result.models.find(m => m.id === 'gemini-1.5-flash');
      expect(gemini15?.displayName).toBe('Custom Display Name');
    });

    it('should handle publisherModels response format', async () => {
      const mockModels = {
        publisherModels: [
          { name: 'gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      expect(result.models.length).toBe(1);
      expect(result.models[0].id).toContain('gemini-2.0');
    });

    it('should include metadata in normalized models', async () => {
      const mockModels = {
        models: [
          {
            name: 'projects/123/locations/us/publishers/google/models/gemini-1.5-pro',
            displayName: 'Gemini 1.5 Pro',
            description: 'Advanced multimodal model',
            supportedGenerationMethods: ['generateContent']
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      expect(result.models[0].metadata?.fullName).toBe('projects/123/locations/us/publishers/google/models/gemini-1.5-pro');
      expect(result.models[0].metadata?.description).toBe('Advanced multimodal model');
    });

    it('should handle empty model list', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] })
      });

      const result = await adapter.fetchModels({ projectId: 'test-project' });

      expect(result.success).toBe(true);
      expect(result.models).toEqual([]);
    });
  });
});

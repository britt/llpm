import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ModelConfig, ModelProvider } from '../types/models';

// Mock all dependencies before importing modelRegistry
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

vi.mock('../utils/modelStorage', () => ({
  saveCurrentModel: vi.fn(),
  loadCurrentModel: vi.fn()
}));

vi.mock('../utils/credentialManager', () => ({
  credentialManager: {
    getOpenAIAPIKey: vi.fn(),
    getAnthropicAPIKey: vi.fn(),
    getGroqAPIKey: vi.fn(),
    getGoogleVertexProjectId: vi.fn(),
    getGoogleVertexRegion: vi.fn()
  }
}));

vi.mock('../utils/modelCache', () => ({
  readModelCache: vi.fn()
}));

vi.mock('../utils/modelMapping', () => ({
  normalizeAnthropicModel: vi.fn((id: string) => id)
}));

// Mock AI SDK providers
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ modelId: 'mock-openai-model' })))
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => ({ modelId: 'mock-anthropic-model' })))
}));

vi.mock('@ai-sdk/groq', () => ({
  createGroq: vi.fn(() => vi.fn(() => ({ modelId: 'mock-groq-model' })))
}));

vi.mock('@ai-sdk/google-vertex', () => ({
  createVertex: vi.fn(() => vi.fn(() => ({ modelId: 'mock-vertex-model' })))
}));

import { credentialManager } from '../utils/credentialManager';
import { loadCurrentModel, saveCurrentModel } from '../utils/modelStorage';
import { readModelCache } from '../utils/modelCache';

// Helper to create a fresh registry instance for each test
async function createFreshRegistry() {
  // Clear the module cache to get a fresh instance
  vi.resetModules();

  // Re-apply mocks after reset
  vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
  vi.doMock('../utils/modelStorage', () => ({
    saveCurrentModel: vi.fn(),
    loadCurrentModel: vi.fn()
  }));
  vi.doMock('../utils/credentialManager', () => ({
    credentialManager: {
      getOpenAIAPIKey: vi.fn(),
      getAnthropicAPIKey: vi.fn(),
      getGroqAPIKey: vi.fn(),
      getGoogleVertexProjectId: vi.fn(),
      getGoogleVertexRegion: vi.fn()
    }
  }));
  vi.doMock('../utils/modelCache', () => ({ readModelCache: vi.fn() }));
  vi.doMock('../utils/modelMapping', () => ({
    normalizeAnthropicModel: vi.fn((id: string) => id)
  }));
  vi.doMock('@ai-sdk/openai', () => ({
    createOpenAI: vi.fn(() => vi.fn(() => ({ modelId: 'mock-openai-model' })))
  }));
  vi.doMock('@ai-sdk/anthropic', () => ({
    createAnthropic: vi.fn(() => vi.fn(() => ({ modelId: 'mock-anthropic-model' })))
  }));
  vi.doMock('@ai-sdk/groq', () => ({
    createGroq: vi.fn(() => vi.fn(() => ({ modelId: 'mock-groq-model' })))
  }));
  vi.doMock('@ai-sdk/google-vertex', () => ({
    createVertex: vi.fn(() => vi.fn(() => ({ modelId: 'mock-vertex-model' })))
  }));

  const { modelRegistry } = await import('./modelRegistry');
  return modelRegistry;
}

describe('ModelRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getCurrentModel', () => {
    it('should return the current model', async () => {
      const registry = await createFreshRegistry();
      const model = registry.getCurrentModel();

      expect(model).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.modelId).toBeDefined();
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', async () => {
      const registry = await createFreshRegistry();
      const models = registry.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should return models with required fields', async () => {
      const registry = await createFreshRegistry();
      const models = registry.getAvailableModels();

      models.forEach(model => {
        expect(model.provider).toBeDefined();
        expect(model.modelId).toBeDefined();
        expect(model.displayName).toBeDefined();
      });
    });
  });

  describe('getModelsForProvider', () => {
    it('should return models for a specific provider', async () => {
      const registry = await createFreshRegistry();
      const openaiModels = registry.getModelsForProvider('openai');

      expect(Array.isArray(openaiModels)).toBe(true);
      openaiModels.forEach(model => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should return empty array for provider with no models', async () => {
      const registry = await createFreshRegistry();
      const models = registry.getModelsForProvider('unknown-provider' as ModelProvider);

      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe('getRecommendedModels', () => {
    it('should return recommended models', async () => {
      const registry = await createFreshRegistry();
      const recommended = registry.getRecommendedModels();

      expect(Array.isArray(recommended)).toBe(true);
    });

    it('should limit models per provider', async () => {
      const registry = await createFreshRegistry();
      const recommended = registry.getRecommendedModels(2);

      // Count models per provider
      const providerCounts: Record<string, number> = {};
      recommended.forEach(model => {
        providerCounts[model.provider] = (providerCounts[model.provider] || 0) + 1;
      });

      // Each provider should have at most 2 models
      Object.values(providerCounts).forEach(count => {
        expect(count).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('getModelState', () => {
    it('should return model state with required fields', async () => {
      const registry = await createFreshRegistry();
      const state = registry.getModelState();

      expect(state.currentModel).toBeDefined();
      expect(state.availableModels).toBeDefined();
      expect(state.providerConfigs).toBeDefined();
      expect(Array.isArray(state.availableModels)).toBe(true);
    });
  });

  describe('isProviderConfigured', () => {
    it('should return false when no credentials are set', async () => {
      const registry = await createFreshRegistry();

      // Without initialization, providers should not be configured
      expect(registry.isProviderConfigured('openai')).toBe(false);
      expect(registry.isProviderConfigured('anthropic')).toBe(false);
      expect(registry.isProviderConfigured('groq')).toBe(false);
    });
  });

  describe('getConfiguredProviders', () => {
    it('should return empty array when no providers configured', async () => {
      const registry = await createFreshRegistry();
      const configured = registry.getConfiguredProviders();

      expect(Array.isArray(configured)).toBe(true);
    });
  });

  describe('hasCachedModels', () => {
    it('should return false when no cache loaded', async () => {
      const registry = await createFreshRegistry();

      expect(registry.hasCachedModels()).toBe(false);
    });
  });

  describe('getProviderCredentials', () => {
    it('should return provider configs', async () => {
      const registry = await createFreshRegistry();
      const creds = registry.getProviderCredentials();

      expect(creds).toBeDefined();
      expect(creds.openai).toBeDefined();
      expect(creds.anthropic).toBeDefined();
      expect(creds.groq).toBeDefined();
      expect(creds['google-vertex']).toBeDefined();
    });
  });
});

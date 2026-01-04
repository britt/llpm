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
    getGoogleVertexRegion: vi.fn(),
    getCerebrasAPIKey: vi.fn()
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
      getGoogleVertexRegion: vi.fn(),
      getCerebrasAPIKey: vi.fn()
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
      expect(registry.isProviderConfigured('cerebras')).toBe(false);
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
      expect(creds.cerebras).toBeDefined();
    });
  });

  describe('setCurrentModel', () => {
    it('should update the current model', async () => {
      const registry = await createFreshRegistry();
      const newModel: ModelConfig = {
        provider: 'anthropic',
        modelId: 'claude-3-opus',
        displayName: 'Claude 3 Opus'
      };

      await registry.setCurrentModel(newModel);

      expect(registry.getCurrentModel()).toEqual(newModel);
    });

    it('should save model to storage', async () => {
      const registry = await createFreshRegistry();

      // Re-import the mocked saveCurrentModel
      const { saveCurrentModel } = await import('../utils/modelStorage');

      const newModel: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-4',
        displayName: 'GPT-4'
      };

      await registry.setCurrentModel(newModel);

      expect(saveCurrentModel).toHaveBeenCalledWith(newModel);
    });
  });

  describe('init', () => {
    it('should load provider credentials during initialization', async () => {
      // Set up mocks with credentials
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue('test-openai-key'),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      await modelRegistry.init();

      expect(modelRegistry.isProviderConfigured('openai')).toBe(true);
      expect(modelRegistry.isProviderConfigured('anthropic')).toBe(false);
    });

    it('should load stored model if available and valid', async () => {
      // Use a model ID that exists in defaults (gpt-5.2 is in FALLBACK_MODELS)
      const storedModel: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-5.2',
        displayName: 'GPT-5.2'
      };

      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(storedModel)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue('test-key'),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      await modelRegistry.init();

      const current = modelRegistry.getCurrentModel();
      expect(current.modelId).toBe('gpt-5.2');
    });

    it('should load models from cache when available', async () => {
      const cachedModels = [
        { provider: 'openai' as const, id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', recommendedRank: 1, supportsChat: true }
      ];

      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue('test-key'),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
        }
      }));
      vi.doMock('../utils/modelCache', () => ({
        readModelCache: vi.fn().mockReturnValue({
          models: cachedModels
        })
      }));
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
      await modelRegistry.init();

      expect(modelRegistry.hasCachedModels()).toBe(true);
    });

    it('should only initialize once', async () => {
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      const mockGetOpenAI = vi.fn().mockResolvedValue('test-key');
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: mockGetOpenAI,
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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

      await modelRegistry.init();
      await modelRegistry.init();

      // Should only be called once
      expect(mockGetOpenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('createLanguageModel', () => {
    it('should throw when OpenAI is not configured', async () => {
      const registry = await createFreshRegistry();
      await registry.init();

      const model: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-4',
        displayName: 'GPT-4'
      };

      await expect(registry.createLanguageModel(model)).rejects.toThrow('OpenAI API key not configured');
    });

    it('should throw when Anthropic is not configured', async () => {
      const registry = await createFreshRegistry();
      await registry.init();

      const model: ModelConfig = {
        provider: 'anthropic',
        modelId: 'claude-3-opus',
        displayName: 'Claude 3 Opus'
      };

      await expect(registry.createLanguageModel(model)).rejects.toThrow('Anthropic API key not configured');
    });

    it('should throw when Groq is not configured', async () => {
      const registry = await createFreshRegistry();
      await registry.init();

      const model: ModelConfig = {
        provider: 'groq',
        modelId: 'llama-3-70b',
        displayName: 'Llama 3 70B'
      };

      await expect(registry.createLanguageModel(model)).rejects.toThrow('Groq API key not configured');
    });

    it('should throw when Google Vertex is not configured', async () => {
      const registry = await createFreshRegistry();
      await registry.init();

      const model: ModelConfig = {
        provider: 'google-vertex',
        modelId: 'gemini-pro',
        displayName: 'Gemini Pro'
      };

      await expect(registry.createLanguageModel(model)).rejects.toThrow('Google Vertex project ID not configured');
    });

    it('should throw when Cerebras is not configured', async () => {
      const registry = await createFreshRegistry();
      await registry.init();

      const model: ModelConfig = {
        provider: 'cerebras',
        modelId: 'qwen-3-235b-a22b-instruct-2507',
        displayName: 'Qwen 3 235B Instruct'
      };

      await expect(registry.createLanguageModel(model)).rejects.toThrow('Cerebras API key not configured');
    });

    it('should create OpenAI model when configured', async () => {
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue('test-openai-key'),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
        }
      }));
      vi.doMock('../utils/modelCache', () => ({ readModelCache: vi.fn() }));
      vi.doMock('../utils/modelMapping', () => ({
        normalizeAnthropicModel: vi.fn((id: string) => id)
      }));

      const mockModelFn = vi.fn(() => ({ modelId: 'mock-openai-model' }));
      vi.doMock('@ai-sdk/openai', () => ({
        createOpenAI: vi.fn(() => mockModelFn)
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

      const model: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-4',
        displayName: 'GPT-4'
      };

      const result = await modelRegistry.createLanguageModel(model);

      expect(result).toBeDefined();
      expect(mockModelFn).toHaveBeenCalledWith('gpt-4');
    });

    it('should throw for unsupported provider', async () => {
      const registry = await createFreshRegistry();
      await registry.init();

      const model: ModelConfig = {
        provider: 'unknown' as ModelProvider,
        modelId: 'some-model',
        displayName: 'Some Model'
      };

      // The code throws because it can't access apiKey on undefined provider config
      await expect(registry.createLanguageModel(model)).rejects.toThrow();
    });

    it('should create Groq model when configured', async () => {
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue('test-groq-key'),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
        }
      }));
      vi.doMock('../utils/modelCache', () => ({ readModelCache: vi.fn() }));
      vi.doMock('../utils/modelMapping', () => ({
        normalizeAnthropicModel: vi.fn((id: string) => id)
      }));

      const mockModelFn = vi.fn(() => ({ modelId: 'mock-groq-model' }));
      vi.doMock('@ai-sdk/openai', () => ({
        createOpenAI: vi.fn(() => vi.fn(() => ({ modelId: 'mock-openai-model' })))
      }));
      vi.doMock('@ai-sdk/anthropic', () => ({
        createAnthropic: vi.fn(() => vi.fn(() => ({ modelId: 'mock-anthropic-model' })))
      }));
      vi.doMock('@ai-sdk/groq', () => ({
        createGroq: vi.fn(() => mockModelFn)
      }));
      vi.doMock('@ai-sdk/google-vertex', () => ({
        createVertex: vi.fn(() => vi.fn(() => ({ modelId: 'mock-vertex-model' })))
      }));

      const { modelRegistry } = await import('./modelRegistry');

      const model: ModelConfig = {
        provider: 'groq',
        modelId: 'llama-3-70b',
        displayName: 'Llama 3 70B'
      };

      const result = await modelRegistry.createLanguageModel(model);

      expect(result).toBeDefined();
      expect(mockModelFn).toHaveBeenCalledWith('llama-3-70b');
    });

    it('should create Google Vertex model when configured', async () => {
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue('test-project-id'),
          getGoogleVertexRegion: vi.fn().mockResolvedValue('us-central1'),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
        }
      }));
      vi.doMock('../utils/modelCache', () => ({ readModelCache: vi.fn() }));
      vi.doMock('../utils/modelMapping', () => ({
        normalizeAnthropicModel: vi.fn((id: string) => id)
      }));

      const mockModelFn = vi.fn(() => ({ modelId: 'mock-vertex-model' }));
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
        createVertex: vi.fn(() => mockModelFn)
      }));

      const { modelRegistry } = await import('./modelRegistry');

      const model: ModelConfig = {
        provider: 'google-vertex',
        modelId: 'gemini-pro',
        displayName: 'Gemini Pro'
      };

      const result = await modelRegistry.createLanguageModel(model);

      expect(result).toBeDefined();
      expect(mockModelFn).toHaveBeenCalledWith('gemini-pro');
    });

    it('should create Cerebras model when configured', async () => {
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue('test-cerebras-key')
        }
      }));
      vi.doMock('../utils/modelCache', () => ({ readModelCache: vi.fn() }));
      vi.doMock('../utils/modelMapping', () => ({
        normalizeAnthropicModel: vi.fn((id: string) => id)
      }));

      const mockModelFn = vi.fn(() => ({ modelId: 'mock-cerebras-model' }));
      vi.doMock('@ai-sdk/openai', () => ({
        createOpenAI: vi.fn(() => mockModelFn)
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

      const model: ModelConfig = {
        provider: 'cerebras',
        modelId: 'qwen-3-235b-a22b-instruct-2507',
        displayName: 'Qwen 3 235B Instruct'
      };

      const result = await modelRegistry.createLanguageModel(model);

      expect(result).toBeDefined();
      expect(mockModelFn).toHaveBeenCalledWith('qwen-3-235b-a22b-instruct-2507');
    });
  });

  describe('reloadModelsFromCache', () => {
    it('should reload models from cache', async () => {
      const registry = await createFreshRegistry();

      // Initially no cached models
      expect(registry.hasCachedModels()).toBe(false);

      // Reload doesn't throw even if no cache
      await expect(registry.reloadModelsFromCache()).resolves.not.toThrow();
    });
  });

  /**
   * Tests for Issue #176: Model provider appears as active in footer while missing
   * from model selector when API key not configured
   *
   * Bug: When a provider's API key is removed after a model was selected,
   * the stored model can still appear in the footer even though it's not
   * available in the model selector.
   */
  describe('Issue #176: Unconfigured provider model handling', () => {
    it('should NOT return stored model when its provider is unconfigured', async () => {
      // Scenario: User previously selected an OpenAI model, then removed the API key
      const storedModel: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o'
      };

      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        // Stored model is from OpenAI
        loadCurrentModel: vi.fn().mockResolvedValue(storedModel)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          // OpenAI is NOT configured (API key removed)
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          // But Anthropic IS configured
          getAnthropicAPIKey: vi.fn().mockResolvedValue('test-anthropic-key'),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      await modelRegistry.init();

      const currentModel = modelRegistry.getCurrentModel();

      // The current model should NOT be the stored OpenAI model
      // because OpenAI is not configured
      expect(currentModel.provider).not.toBe('openai');
      // It should fall back to a configured provider (Anthropic)
      expect(currentModel.provider).toBe('anthropic');
    });

    it('should return stored model when its provider IS configured', async () => {
      // Scenario: User selected an OpenAI model and OpenAI is still configured
      const storedModel: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-5.2',
        displayName: 'GPT-5.2'
      };

      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(storedModel)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          // OpenAI IS configured
          getOpenAIAPIKey: vi.fn().mockResolvedValue('test-openai-key'),
          getAnthropicAPIKey: vi.fn().mockResolvedValue(null),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      await modelRegistry.init();

      const currentModel = modelRegistry.getCurrentModel();

      // The current model SHOULD be the stored OpenAI model
      // because OpenAI is configured
      expect(currentModel.provider).toBe('openai');
      expect(currentModel.modelId).toBe('gpt-5.2');
    });

    it('should only include configured providers in getConfiguredProviders', async () => {
      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(null)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          // Only Anthropic and Groq are configured
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          getAnthropicAPIKey: vi.fn().mockResolvedValue('test-anthropic-key'),
          getGroqAPIKey: vi.fn().mockResolvedValue('test-groq-key'),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      await modelRegistry.init();

      const configuredProviders = modelRegistry.getConfiguredProviders();

      // Only Anthropic and Groq should be in the list
      expect(configuredProviders).toContain('anthropic');
      expect(configuredProviders).toContain('groq');
      expect(configuredProviders).not.toContain('openai');
      expect(configuredProviders).not.toContain('google-vertex');
      expect(configuredProviders).not.toContain('cerebras');
    });

    it('getCurrentModel provider should always be in getConfiguredProviders list', async () => {
      // This is the KEY test for Issue #176
      // The bug: footer shows a model whose provider is NOT in the selector list
      const storedModel: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o'
      };

      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: vi.fn().mockResolvedValue(storedModel)
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          // OpenAI NOT configured, Anthropic IS
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          getAnthropicAPIKey: vi.fn().mockResolvedValue('test-anthropic-key'),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      await modelRegistry.init();

      const currentModel = modelRegistry.getCurrentModel();
      const configuredProviders = modelRegistry.getConfiguredProviders();

      // CRITICAL: The current model's provider MUST be in the configured list
      // This ensures the footer model is always selectable in the model selector
      expect(configuredProviders).toContain(currentModel.provider);
    });

    it('BUG DEMONSTRATION: loadCurrentModel can return model from unconfigured provider', async () => {
      // This test demonstrates the actual bug in Issue #176
      // ChatInterface.tsx uses loadCurrentModel() directly, which doesn't validate
      // against configured providers. This causes the footer to show a model
      // that doesn't appear in the model selector.
      const storedModel: ModelConfig = {
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o'
      };

      vi.resetModules();
      vi.doMock('../utils/logger', () => ({ debug: vi.fn() }));

      // Mock loadCurrentModel to return the stored model directly
      const mockLoadCurrentModel = vi.fn().mockResolvedValue(storedModel);
      vi.doMock('../utils/modelStorage', () => ({
        saveCurrentModel: vi.fn(),
        loadCurrentModel: mockLoadCurrentModel
      }));
      vi.doMock('../utils/credentialManager', () => ({
        credentialManager: {
          // OpenAI NOT configured
          getOpenAIAPIKey: vi.fn().mockResolvedValue(null),
          getAnthropicAPIKey: vi.fn().mockResolvedValue('test-anthropic-key'),
          getGroqAPIKey: vi.fn().mockResolvedValue(null),
          getGoogleVertexProjectId: vi.fn().mockResolvedValue(null),
          getGoogleVertexRegion: vi.fn().mockResolvedValue(null),
          getCerebrasAPIKey: vi.fn().mockResolvedValue(null)
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
      const { loadCurrentModel } = await import('../utils/modelStorage');
      await modelRegistry.init();

      // What the footer would show (directly from storage)
      const footerModel = await loadCurrentModel();

      // What the model selector shows (configured providers only)
      const configuredProviders = modelRegistry.getConfiguredProviders();

      // What modelRegistry.getCurrentModel() returns (validated)
      const validatedModel = modelRegistry.getCurrentModel();

      // THE BUG: loadCurrentModel returns OpenAI model even though OpenAI is not configured
      // This is what ChatInterface.tsx uses for the footer
      expect(footerModel?.provider).toBe('openai');

      // But OpenAI is NOT in configured providers (what model selector shows)
      expect(configuredProviders).not.toContain('openai');

      // The CORRECT behavior: modelRegistry.getCurrentModel() falls back properly
      expect(validatedModel.provider).toBe('anthropic');
      expect(configuredProviders).toContain(validatedModel.provider);

      // This demonstrates the inconsistency:
      // - Footer shows: GPT-4o (OpenAI) - from loadCurrentModel()
      // - Model selector shows: only Anthropic models
      // - The footer model is NOT selectable in the model selector!
    });
  });
});

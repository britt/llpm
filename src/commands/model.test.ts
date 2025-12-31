import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../services/modelRegistry');
vi.mock('../services/modelProviders');
vi.mock('../utils/modelCache');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { modelCommand } from './model';
import { modelRegistry } from '../services/modelRegistry';
import { getProviderAdapter } from '../services/modelProviders';
import { readModelCache, writeModelCache, getCacheAge, formatCacheAge, createEmptyCache } from '../utils/modelCache';

describe('Model Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    vi.mocked(modelRegistry.getCurrentModel).mockReturnValue({
      provider: 'openai',
      modelId: 'gpt-4o',
      displayName: 'GPT-4o',
      description: 'OpenAI GPT-4o model'
    });

    vi.mocked(modelRegistry.getModelState).mockReturnValue({
      currentModel: {
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        description: 'OpenAI GPT-4o model'
      },
      availableModels: []
    });

    vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue(['openai', 'anthropic']);
    vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
      { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' }
    ]);
    vi.mocked(modelRegistry.getAvailableModels).mockReturnValue([
      { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o' }
    ]);
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(modelCommand.name).toBe('model');
      expect(modelCommand.description).toBeDefined();
    });
  });

  describe('No arguments (model info)', () => {
    it('should show model info when no arguments', async () => {
      const result = await modelCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Current Model');
      expect(result.content).toContain('GPT-4o');
      expect(result.content).toContain('Available Providers');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      const result = await modelCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Model Management Commands');
      expect(result.content).toContain('/model list');
      expect(result.content).toContain('/model switch');
      expect(result.content).toContain('/model update');
    });
  });

  describe('List subcommand', () => {
    it('should list available models', async () => {
      vi.mocked(modelRegistry.getModelsForProvider).mockImplementation((provider) => {
        if (provider === 'openai') {
          return [
            { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' },
            { provider: 'openai', modelId: 'gpt-4', displayName: 'GPT-4', family: 'gpt-4' }
          ];
        }
        return [];
      });

      const result = await modelCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Available Models');
    });

    it('should handle ls alias', async () => {
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([]);

      const result = await modelCommand.execute(['ls']);

      expect(result.success).toBe(true);
    });

    it('should show all models with --all flag', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue(['openai']);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
        { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' }
      ]);

      const result = await modelCommand.execute(['list', '--all']);

      expect(result.success).toBe(true);
    });

    it('should work with -a shorthand', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue(['openai']);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([]);

      const result = await modelCommand.execute(['list', '-a']);

      expect(result.success).toBe(true);
    });
  });

  describe('Current subcommand', () => {
    it('should show current model details', async () => {
      const result = await modelCommand.execute(['current']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Current Model');
      expect(result.content).toContain('openai');
      expect(result.content).toContain('gpt-4o');
      expect(result.content).toContain('GPT-4o');
    });

    it('should show model without description', async () => {
      vi.mocked(modelRegistry.getCurrentModel).mockReturnValue({
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o'
      });

      const result = await modelCommand.execute(['current']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('GPT-4o');
    });
  });

  describe('Switch subcommand', () => {
    it('should show interactive selector when no model specified', async () => {
      const result = await modelCommand.execute(['switch']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Select a model');
      expect(result.interactive).toBeDefined();
      expect(result.interactive?.type).toBe('model-select');
    });

    it('should return error when no providers configured for interactive selector', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue([]);

      const result = await modelCommand.execute(['switch']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No providers are configured');
    });

    it('should show interactive selector for set without model', async () => {
      const result = await modelCommand.execute(['set']);

      expect(result.success).toBe(true);
      expect(result.interactive).toBeDefined();
    });

  });

  describe('Providers subcommand', () => {
    it('should show provider configuration status', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue(['openai']);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
        { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' }
      ]);

      const result = await modelCommand.execute(['providers']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Provider Configuration');
    });
  });

  describe('List with no configured providers', () => {
    it('should fail list when no providers configured', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue([]);

      const result = await modelCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No providers are configured');
    });
  });

  describe('Switch subcommand with model spec', () => {
    it('should switch to model with provider/model format', async () => {
      vi.mocked(modelRegistry.isProviderConfigured).mockReturnValue(true);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
        { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' }
      ]);
      vi.mocked(modelRegistry.createLanguageModel).mockResolvedValue({} as any);
      vi.mocked(modelRegistry.setCurrentModel).mockResolvedValue(undefined);

      const result = await modelCommand.execute(['switch', 'openai/gpt-4o']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Switched to GPT-4o');
    });

    it('should switch to model by display name', async () => {
      vi.mocked(modelRegistry.getAvailableModels).mockReturnValue([
        { provider: 'anthropic', modelId: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' }
      ]);
      vi.mocked(modelRegistry.isProviderConfigured).mockReturnValue(true);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
        { provider: 'anthropic', modelId: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet', family: 'claude-3.5' }
      ]);
      vi.mocked(modelRegistry.createLanguageModel).mockResolvedValue({} as any);
      vi.mocked(modelRegistry.setCurrentModel).mockResolvedValue(undefined);

      const result = await modelCommand.execute(['claude 3.5 sonnet']);

      expect(result.success).toBe(true);
    });

    it('should fail when model not found', async () => {
      vi.mocked(modelRegistry.getAvailableModels).mockReturnValue([]);

      const result = await modelCommand.execute(['nonexistent-model']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });

    it('should fail when provider not configured', async () => {
      vi.mocked(modelRegistry.isProviderConfigured).mockReturnValue(false);

      const result = await modelCommand.execute(['switch', 'groq/llama']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not configured');
    });

    it('should fail when model not found for provider', async () => {
      vi.mocked(modelRegistry.isProviderConfigured).mockReturnValue(true);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([]);

      const result = await modelCommand.execute(['switch', 'openai/nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found for provider');
    });

    it('should handle create model error', async () => {
      vi.mocked(modelRegistry.isProviderConfigured).mockReturnValue(true);
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
        { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' }
      ]);
      vi.mocked(modelRegistry.createLanguageModel).mockRejectedValue(new Error('API error'));

      const result = await modelCommand.execute(['switch', 'openai/gpt-4o']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to switch');
    });
  });

  describe('Update subcommand', () => {
    beforeEach(() => {
      vi.mocked(getCacheAge).mockReturnValue(3600);
      vi.mocked(formatCacheAge).mockReturnValue('1 hour ago');
      vi.mocked(createEmptyCache).mockReturnValue({
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        models: [],
        sourceUrls: {},
        providerCounts: {}
      });
      vi.mocked(readModelCache).mockReturnValue(null);
      vi.mocked(writeModelCache).mockImplementation(() => {});
      vi.mocked(modelRegistry.reloadModelsFromCache).mockResolvedValue(undefined);
      vi.mocked(modelRegistry.getProviderCredentials).mockReturnValue({
        openai: { apiKey: 'test-key' },
        anthropic: { apiKey: 'test-key' }
      });
    });

    it('should update models from configured providers', async () => {
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          models: [{ provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o' }],
          sourceUrl: 'https://api.openai.com/v1/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);

      const result = await modelCommand.execute(['update']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Cache Updated');
    });

    it('should fail when no providers configured', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue([]);

      const result = await modelCommand.execute(['update']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No providers to update');
    });

    it('should fail with invalid provider', async () => {
      const result = await modelCommand.execute(['update', '--providers', 'invalid-provider']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid provider');
    });

    it('should handle --dry-run flag', async () => {
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          models: [{ provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o' }],
          sourceUrl: 'https://api.openai.com/v1/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);

      const result = await modelCommand.execute(['update', '--dry-run']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Dry Run');
      expect(writeModelCache).not.toHaveBeenCalled();
    });

    it('should handle specific providers', async () => {
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          models: [{ provider: 'anthropic', modelId: 'claude-3', displayName: 'Claude 3' }],
          sourceUrl: 'https://api.anthropic.com/v1/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);

      const result = await modelCommand.execute(['update', '--providers', 'anthropic']);

      expect(result.success).toBe(true);
      expect(getProviderAdapter).toHaveBeenCalledWith('anthropic');
    });

    it('should handle fetch failure from all providers', async () => {
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: false,
          models: [],
          error: 'API error',
          sourceUrl: 'https://api.openai.com/v1/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);

      const result = await modelCommand.execute(['update']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('All providers failed');
    });

    it('should handle write cache error', async () => {
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          models: [{ provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o' }],
          sourceUrl: 'https://api.openai.com/v1/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);
      vi.mocked(writeModelCache).mockImplementation(() => { throw new Error('Write error'); });

      const result = await modelCommand.execute(['update']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to write cache');
    });

    it('should handle --project and --location flags for google-vertex', async () => {
      vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue(['google-vertex']);
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          models: [{ provider: 'google-vertex', modelId: 'gemini-pro', displayName: 'Gemini Pro' }],
          sourceUrl: 'https://vertex.ai/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);

      const result = await modelCommand.execute(['update', '--project', 'my-project', '--location', 'us-east1']);

      expect(result.success).toBe(true);
      expect(mockAdapter.fetchModels).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'my-project',
        location: 'us-east1'
      }));
    });

    it('should show no existing cache message when cache is null', async () => {
      vi.mocked(getCacheAge).mockReturnValue(null);
      const mockAdapter = {
        fetchModels: vi.fn().mockResolvedValue({
          success: true,
          models: [{ provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o' }],
          sourceUrl: 'https://api.openai.com/v1/models'
        })
      };
      vi.mocked(getProviderAdapter).mockReturnValue(mockAdapter as any);

      const result = await modelCommand.execute(['update']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No existing cache');
    });
  });

  describe('Model info with description', () => {
    it('should show description when model has one', async () => {
      vi.mocked(modelRegistry.getModelState).mockReturnValue({
        currentModel: {
          provider: 'openai',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          description: 'OpenAI flagship model'
        },
        availableModels: []
      });
      vi.mocked(modelRegistry.getCurrentModel).mockReturnValue({
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        description: 'OpenAI flagship model'
      });

      const result = await modelCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('OpenAI flagship model');
    });
  });

  describe('List with multiple generations', () => {
    it('should show models grouped by generation', async () => {
      vi.mocked(modelRegistry.getModelsForProvider).mockImplementation((provider) => {
        if (provider === 'openai') {
          return [
            { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o', recommendedRank: 1 },
            { provider: 'openai', modelId: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', family: 'gpt-4', recommendedRank: 2 },
            { provider: 'openai', modelId: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', family: 'gpt-3.5', recommendedRank: 3 }
          ];
        }
        return [];
      });

      const result = await modelCommand.execute(['list', '--all']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('OPENAI');
    });

    it('should show current model marker', async () => {
      vi.mocked(modelRegistry.getCurrentModel).mockReturnValue({
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o'
      });
      vi.mocked(modelRegistry.getModelsForProvider).mockImplementation((provider) => {
        if (provider === 'openai') {
          return [
            { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' }
          ];
        }
        return [];
      });

      const result = await modelCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('👉');
    });
  });

  describe('Interactive model selector sorting', () => {
    it('should sort models by recommended rank within provider', async () => {
      vi.mocked(modelRegistry.getModelsForProvider).mockReturnValue([
        { provider: 'openai', modelId: 'gpt-3.5', displayName: 'GPT-3.5', family: 'gpt-3.5', recommendedRank: 100 },
        { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o', recommendedRank: 1 }
      ]);

      const result = await modelCommand.execute(['switch']);

      expect(result.success).toBe(true);
      expect(result.interactive?.models).toBeDefined();
      // Models should be sorted by recommendedRank
      expect(result.interactive?.models[0].id).toContain('gpt-4o');
    });
  });
});

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import { createVertex } from '@ai-sdk/google-vertex';
import type { LanguageModel } from 'ai';
import { DEFAULT_MODELS as DEFAULT_MODEL_CONFIGS, type ModelProvider, type ModelConfig, type ModelProviderConfig, type ModelState } from '../types/models';
import { debug } from '../utils/logger';
import { saveCurrentModel, loadCurrentModel } from '../utils/modelStorage';
import { credentialManager } from '../utils/credentialManager';
import { normalizeAnthropicModel } from '../utils/modelMapping';
import { readModelCache, type NormalizedModel } from '../utils/modelCache';

// Fallback models when cache is unavailable
const FALLBACK_MODELS: ModelConfig[] = [
  { provider: 'openai', modelId: 'gpt-5.2', displayName: 'GPT-5.2', description: 'Latest GPT model', family: 'gpt-5.2' },
  { provider: 'anthropic', modelId: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', description: 'Latest Claude model', family: 'claude-sonnet-4-5' },
  { provider: 'groq', modelId: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B', description: 'Large Llama model on Groq', family: 'llama-3.3-70b' },
  { provider: 'google-vertex', modelId: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', description: 'Most capable Gemini model', family: 'gemini-2.5-pro' },
  { provider: 'cerebras', modelId: 'qwen-3-235b-a22b-instruct-2507', displayName: 'Qwen 3 235B Instruct', description: 'Qwen 3 on Cerebras', family: 'qwen-3' },
];

class ModelRegistry {
  private currentModel: ModelConfig;
  private providerConfigs: Record<ModelProvider, ModelProviderConfig>;
  private cachedModels: ModelConfig[] | null = null;
  private initialized: boolean = false;

  constructor() {
    // Default to GPT-4o, but will be overridden by init()
    this.currentModel = FALLBACK_MODELS[0]!;

    // Provider configs will be populated during init() using credential manager
    this.providerConfigs = {
      openai: { provider: 'openai' },
      anthropic: { provider: 'anthropic' },
      groq: { provider: 'groq' },
      'google-vertex': { provider: 'google-vertex' },
      cerebras: { provider: 'cerebras' }
    };
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    debug('Initializing model registry');

    // Load credentials using credential manager
    await this.loadProviderCredentials();

    // Try to load cached models
    this.loadModelsFromCache();

    // Try to load stored model
    const storedModel = await loadCurrentModel();
    
    if (storedModel && this.isProviderConfigured(storedModel.provider)) {
      // Validate the stored model still exists in our configs
      const availableModels = this.getAvailableModels();
      const foundModel = availableModels.find(m => 
        m.provider === storedModel.provider && m.modelId === storedModel.modelId
      );
      
      if (foundModel) {
        debug('Loaded stored model:', storedModel.displayName);
        this.currentModel = storedModel;
      } else {
        debug('Stored model no longer available, using default');
      }
    } else {
      // Find first configured provider
      const configuredProviders = this.getConfiguredProviders();
      if (configuredProviders.length > 0) {
        const firstProvider = configuredProviders[0]!;
        const models = this.getModelsForProvider(firstProvider);
        if (models.length > 0) {
          this.currentModel = models[0]!;
          debug('Using default model for first configured provider:', this.currentModel.displayName);
        }
      }
    }
    
    this.initialized = true;
  }

  public getCurrentModel(): ModelConfig {
    return this.currentModel;
  }

  public async setCurrentModel(model: ModelConfig): Promise<void> {
    debug('Switching model to:', model.displayName);
    this.currentModel = model;
    
    // Save to storage
    await saveCurrentModel(model);
  }

  public getAvailableModels(): ModelConfig[] {
    // Use cached models if available, otherwise fallback to static defaults
    if (this.cachedModels && this.cachedModels.length > 0) {
      return this.cachedModels;
    }
    return Object.values(DEFAULT_MODEL_CONFIGS).flat();
  }

  public getModelsForProvider(provider: ModelProvider): ModelConfig[] {
    // Use cached models if available
    if (this.cachedModels && this.cachedModels.length > 0) {
      return this.cachedModels.filter(m => m.provider === provider);
    }
    return DEFAULT_MODEL_CONFIGS[provider] || [];
  }

  /**
   * Get recommended models (top N per provider)
   */
  public getRecommendedModels(maxPerProvider: number = 1): ModelConfig[] {
    const providers: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex', 'cerebras'];
    const recommended: ModelConfig[] = [];

    for (const provider of providers) {
      const models = this.getModelsForProvider(provider);
      recommended.push(...models.slice(0, maxPerProvider));
    }

    return recommended;
  }

  public getModelState(): ModelState {
    return {
      currentModel: this.currentModel,
      availableModels: this.getAvailableModels(),
      providerConfigs: this.providerConfigs
    };
  }

  public async createLanguageModel(modelConfig?: ModelConfig): Promise<LanguageModel> {
    await this.init(); // Ensure initialized

    const config = modelConfig || this.currentModel;
    const providerConfig = this.providerConfigs[config.provider];

    debug('Creating language model for provider:', config.provider, 'model:', config.modelId);
    debug('Provider config:', { hasApiKey: !!providerConfig.apiKey, hasProjectId: !!providerConfig.projectId });

    switch (config.provider) {
      case 'openai': {
        if (!providerConfig.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        debug('Creating OpenAI provider with API key');
        const openaiProvider = createOpenAI({
          apiKey: providerConfig.apiKey
        });
        debug('OpenAI provider created, creating model instance');
        const openaiModel = openaiProvider(config.modelId);
        debug('OpenAI model instance created');
        return openaiModel;
      }

      case 'anthropic': {
        if (!providerConfig.apiKey) {
          throw new Error('Anthropic API key not configured');
        }
        // Normalize model ID to canonical snapshot format
        const normalizedModelId = normalizeAnthropicModel(config.modelId);
        debug('Normalized Anthropic model ID:', config.modelId, '->', normalizedModelId);
        const anthropicProvider = createAnthropic({
          apiKey: providerConfig.apiKey
        });
        return anthropicProvider(normalizedModelId);
      }

      case 'groq': {
        if (!providerConfig.apiKey) {
          throw new Error('Groq API key not configured');
        }
        const groqProvider = createGroq({
          apiKey: providerConfig.apiKey
        });
        return groqProvider(config.modelId);
      }

      case 'google-vertex': {
        if (!providerConfig.projectId) {
          throw new Error('Google Vertex project ID not configured');
        }
        const vertexProvider = createVertex({
          project: providerConfig.projectId,
          location: providerConfig.region || 'us-central1'
        });
        return vertexProvider(config.modelId);
      }

      case 'cerebras': {
        if (!providerConfig.apiKey) {
          throw new Error('Cerebras API key not configured');
        }
        // Cerebras uses an OpenAI-compatible API
        const cerebrasProvider = createOpenAI({
          apiKey: providerConfig.apiKey,
          baseURL: 'https://api.cerebras.ai/v1'
        });
        return cerebrasProvider(config.modelId);
      }

      default:
        throw new Error(`Unsupported model provider: ${config.provider}`);
    }
  }

  public isProviderConfigured(provider: ModelProvider): boolean {
    const config = this.providerConfigs[provider];

    switch (provider) {
      case 'openai':
      case 'anthropic':
      case 'groq':
      case 'cerebras':
        return !!config.apiKey;
      case 'google-vertex':
        return !!config.projectId;
      default:
        return false;
    }
  }

  public getConfiguredProviders(): ModelProvider[] {
    return (Object.keys(this.providerConfigs) as ModelProvider[]).filter(provider => 
      this.isProviderConfigured(provider)
    );
  }

  private async loadProviderCredentials(): Promise<void> {
    debug('Loading provider credentials');

    // Load OpenAI credentials
    const openaiKey = await credentialManager.getOpenAIAPIKey();
    if (openaiKey) {
      this.providerConfigs.openai.apiKey = openaiKey;
    }

    // Load Anthropic credentials
    const anthropicKey = await credentialManager.getAnthropicAPIKey();
    if (anthropicKey) {
      this.providerConfigs.anthropic.apiKey = anthropicKey;
    }

    // Load Groq credentials
    const groqKey = await credentialManager.getGroqAPIKey();
    if (groqKey) {
      this.providerConfigs.groq.apiKey = groqKey;
    }

    // Load Google Vertex credentials
    const vertexProjectId = await credentialManager.getGoogleVertexProjectId();
    const vertexRegion = await credentialManager.getGoogleVertexRegion();
    if (vertexProjectId) {
      this.providerConfigs['google-vertex'].projectId = vertexProjectId;
      this.providerConfigs['google-vertex'].region = vertexRegion;
    }

    // Load Cerebras credentials
    const cerebrasKey = await credentialManager.getCerebrasAPIKey();
    if (cerebrasKey) {
      this.providerConfigs.cerebras.apiKey = cerebrasKey;
    }

    debug('Provider credentials loaded');
  }

  /**
   * Load models from cache file
   */
  private loadModelsFromCache(): void {
    const cache = readModelCache();
    if (cache && cache.models.length > 0) {
      debug('Loading models from cache:', cache.models.length, 'models');
      this.cachedModels = cache.models.map(this.normalizedToModelConfig);
    } else {
      debug('No cached models found, using static defaults');
      this.cachedModels = null;
    }
  }

  /**
   * Reload models from cache (called after /model update)
   */
  public async reloadModelsFromCache(): Promise<void> {
    this.loadModelsFromCache();
    debug('Models reloaded from cache');
  }

  /**
   * Convert NormalizedModel to ModelConfig
   */
  private normalizedToModelConfig(model: NormalizedModel): ModelConfig {
    return {
      provider: model.provider,
      modelId: model.id,
      displayName: model.displayName,
      description: model.family ? `${model.family} family` : undefined,
      recommendedRank: model.recommendedRank,
      family: model.family,
    };
  }

  /**
   * Get provider credentials for external use (e.g., model update)
   */
  public getProviderCredentials(): Record<ModelProvider, ModelProviderConfig> {
    return { ...this.providerConfigs };
  }

  /**
   * Check if models are loaded from cache
   */
  public hasCachedModels(): boolean {
    return this.cachedModels !== null && this.cachedModels.length > 0;
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();
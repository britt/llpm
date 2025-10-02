import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import { createVertex } from '@ai-sdk/google-vertex';
import type { LanguageModel } from 'ai';
import type { ModelProvider, ModelConfig, ModelProviderConfig, ModelState, DEFAULT_MODELS } from '../types/models';
import { DEFAULT_MODELS as DEFAULT_MODEL_CONFIGS } from '../types/models';
import { debug } from '../utils/logger';
import { saveCurrentModel, loadCurrentModel } from '../utils/modelStorage';
import { credentialManager } from '../utils/credentialManager';

class ModelRegistry {
  private currentModel: ModelConfig;
  private providerConfigs: Record<ModelProvider, ModelProviderConfig>;
  private initialized: boolean = false;

  constructor() {
    // Default to GPT-4.1 mini, but will be overridden by init()
    this.currentModel = DEFAULT_MODEL_CONFIGS.openai.find(m => m.modelId === 'gpt-4.1-mini')!;
    
    // Provider configs will be populated during init() using credential manager
    this.providerConfigs = {
      openai: { provider: 'openai' },
      anthropic: { provider: 'anthropic' },
      groq: { provider: 'groq' },
      'google-vertex': { provider: 'google-vertex' }
    };
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    
    debug('Initializing model registry');
    
    // Load credentials using credential manager
    await this.loadProviderCredentials();
    
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
    return Object.values(DEFAULT_MODEL_CONFIGS).flat();
  }

  public getModelsForProvider(provider: ModelProvider): ModelConfig[] {
    return DEFAULT_MODEL_CONFIGS[provider] || [];
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
      case 'openai':
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

      case 'anthropic':
        if (!providerConfig.apiKey) {
          throw new Error('Anthropic API key not configured');
        }
        const anthropicProvider = createAnthropic({
          apiKey: providerConfig.apiKey
        });
        return anthropicProvider(config.modelId);

      case 'groq':
        if (!providerConfig.apiKey) {
          throw new Error('Groq API key not configured');
        }
        const groqProvider = createGroq({
          apiKey: providerConfig.apiKey
        });
        return groqProvider(config.modelId);

      case 'google-vertex':
        if (!providerConfig.projectId) {
          throw new Error('Google Vertex project ID not configured');
        }
        const vertexProvider = createVertex({
          project: providerConfig.projectId,
          location: providerConfig.region || 'us-central1'
        });
        return vertexProvider(config.modelId);

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

    debug('Provider credentials loaded');
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';
import { vertex } from '@ai-sdk/google-vertex';
import type { LanguageModel } from 'ai';
import type { ModelProvider, ModelConfig, ModelProviderConfig, ModelState, DEFAULT_MODELS } from '../types/models';
import { DEFAULT_MODELS as DEFAULT_MODEL_CONFIGS } from '../types/models';
import { debug } from '../utils/logger';
import { saveCurrentModel, loadCurrentModel } from '../utils/modelStorage';

class ModelRegistry {
  private currentModel: ModelConfig;
  private providerConfigs: Record<ModelProvider, ModelProviderConfig>;
  private initialized: boolean = false;

  constructor() {
    // Default to GPT-4o mini, but will be overridden by init()
    this.currentModel = DEFAULT_MODEL_CONFIGS.openai[1]!;
    
    this.providerConfigs = {
      openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      },
      anthropic: {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY
      },
      groq: {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY
      },
      'google-vertex': {
        provider: 'google-vertex',
        projectId: process.env.GOOGLE_VERTEX_PROJECT_ID,
        region: process.env.GOOGLE_VERTEX_REGION || 'us-central1'
      }
    };
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    
    debug('Initializing model registry');
    
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

    switch (config.provider) {
      case 'openai':
        if (!providerConfig.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        return openai(config.modelId);

      case 'anthropic':
        if (!providerConfig.apiKey) {
          throw new Error('Anthropic API key not configured');
        }
        return anthropic(config.modelId);

      case 'groq':
        if (!providerConfig.apiKey) {
          throw new Error('Groq API key not configured');
        }
        return groq(config.modelId);

      case 'google-vertex':
        if (!providerConfig.projectId) {
          throw new Error('Google Vertex project ID not configured');
        }
        return vertex(config.modelId);

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
}

// Singleton instance
export const modelRegistry = new ModelRegistry();
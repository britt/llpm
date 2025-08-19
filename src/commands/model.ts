import type { Command, CommandResult } from './types';
import { modelRegistry } from '../services/modelRegistry';
import type { ModelProvider } from '../types/models';
import { debug } from '../utils/logger';

function showInteractiveModelSelector(): CommandResult {
  const configuredProviders = modelRegistry.getConfiguredProviders();
  
  if (configuredProviders.length === 0) {
    return {
      content: '❌ No providers are configured. Please check your API keys in .env file.\n\n💡 Use `/model providers` to see configuration requirements.',
      success: false
    };
  }
  
  const models: Array<{id: string, label: string, value: string}> = [];
  const currentModel = modelRegistry.getCurrentModel();
  
  for (const provider of configuredProviders) {
    const providerModels = modelRegistry.getModelsForProvider(provider);
    for (const model of providerModels) {
      const isCurrent = currentModel.modelId === model.modelId && currentModel.provider === model.provider;
      const currentMarker = isCurrent ? ' 👉 ' : '   ';
      
      models.push({
        id: `${model.provider}/${model.modelId}`,
        label: `${currentMarker}${model.displayName} (${model.provider})`,
        value: `${model.provider}/${model.modelId}`
      });
    }
  }
  
  return {
    content: 'Select a model to switch to:',
    success: true,
    interactive: {
      type: 'model-select',
      models
    }
  };
}

export const modelCommand: Command = {
  name: 'model',
  description: 'Switch between AI models or view current model info',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Model command called with args:', args);

    // No arguments - show current model and available models
    if (args.length === 0) {
      return showModelInfo();
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'list':
      case 'ls':
        const showAll = args.includes('--all') || args.includes('-a');
        return listAvailableModels(showAll);
      
      case 'current':
        return showCurrentModel();
      
      case 'providers':
        return showProviders();
      
      case 'switch':
      case 'set':
        if (args.length < 2) {
          // Show interactive model selector for configured providers
          return showInteractiveModelSelector();
        }
        return await switchModel(args[1]!);
      
      default:
        // Try to interpret the first arg as a model switch
        return await switchModel(args[0]!);
    }
  }
};

function showModelInfo(): CommandResult {
  const state = modelRegistry.getModelState();
  const current = state.currentModel;
  const configuredProviders = modelRegistry.getConfiguredProviders();
  
  let content = `🤖 **Current Model**\n`;
  content += `   ${current.displayName} (${current.provider}/${current.modelId})\n`;
  if (current.description) {
    content += `   ${current.description}\n`;
  }
  
  content += `\n📊 **Available Providers**\n`;
  const allProviders: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex'];
  
  for (const provider of allProviders) {
    const isConfigured = configuredProviders.includes(provider);
    const status = isConfigured ? '✅' : '❌';
    const models = modelRegistry.getModelsForProvider(provider);
    content += `   ${status} ${provider} (${models.length} models)\n`;
  }
  
  content += `\n💡 **Commands**\n`;
  content += `   /model list        - Show configured models only\n`;
  content += `   /model list --all  - Show all models (including unconfigured)\n`;
  content += `   /model providers   - Show provider configuration status\n`;
  content += `   /model switch <provider>/<model> - Switch to a specific model\n`;
  
  return {
    content,
    success: true
  };
}

function showCurrentModel(): CommandResult {
  const current = modelRegistry.getCurrentModel();
  
  let content = `🤖 **Current Model**\n`;
  content += `   Provider: ${current.provider}\n`;
  content += `   Model ID: ${current.modelId}\n`;
  content += `   Display Name: ${current.displayName}\n`;
  if (current.description) {
    content += `   Description: ${current.description}\n`;
  }
  
  return {
    content,
    success: true
  };
}

function listAvailableModels(showAll: boolean = false): CommandResult {
  const configuredProviders = modelRegistry.getConfiguredProviders();
  const allProviders: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex'];
  
  if (!showAll && configuredProviders.length === 0) {
    return {
      content: '❌ No providers are configured. Please check your API keys in .env file.\n\n💡 Use `/model list --all` to see all available models regardless of configuration.',
      success: false
    };
  }
  
  let content = `🤖 **Available Models**${showAll ? ' (All)' : ' (Configured Only)'}\n\n`;
  
  const providersToShow = showAll ? allProviders : configuredProviders;
  
  for (const provider of providersToShow) {
    const models = modelRegistry.getModelsForProvider(provider);
    const isConfigured = configuredProviders.includes(provider);
    const providerStatus = isConfigured ? '✅' : '❌';
    
    content += `**${provider.toUpperCase()}** ${providerStatus}\n`;
    
    for (const model of models) {
      const currentModel = modelRegistry.getCurrentModel();
      const isCurrent = currentModel.modelId === model.modelId && currentModel.provider === model.provider;
      const currentMarker = isCurrent ? '👉 ' : '   ';
      const usableStatus = isConfigured ? '🟢' : '🔴';
      
      content += `${currentMarker}${usableStatus} ${model.displayName} (${model.modelId})`;
      
      if (!isConfigured) {
        content += ' - Not configured';
      }
      
      content += '\n';
      
      if (model.description) {
        content += `      ${model.description}\n`;
      }
    }
    content += '\n';
  }
  
  if (showAll) {
    content += `💡 Legend: 🟢 = Usable, 🔴 = Needs configuration\n`;
    content += `💡 Configure providers in .env file (see /model providers)\n`;
  }
  content += `💡 Switch with: /model switch <provider>/<model-id>`;
  
  return {
    content,
    success: true
  };
}

function showProviders(): CommandResult {
  const configuredProviders = modelRegistry.getConfiguredProviders();
  const allProviders: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex'];
  
  let content = `📊 **Provider Configuration Status**\n\n`;
  
  for (const provider of allProviders) {
    const isConfigured = configuredProviders.includes(provider);
    const status = isConfigured ? '✅ Configured' : '❌ Not configured';
    const models = modelRegistry.getModelsForProvider(provider);
    
    content += `**${provider.toUpperCase()}** - ${status}\n`;
    content += `   Models available: ${models.length}\n`;
    
    // Show required env vars
    switch (provider) {
      case 'openai':
        content += `   Required: OPENAI_API_KEY\n`;
        break;
      case 'anthropic':
        content += `   Required: ANTHROPIC_API_KEY\n`;
        break;
      case 'groq':
        content += `   Required: GROQ_API_KEY\n`;
        break;
      case 'google-vertex':
        content += `   Required: GOOGLE_VERTEX_PROJECT_ID\n`;
        content += `   Optional: GOOGLE_VERTEX_REGION (default: us-central1)\n`;
        break;
    }
    content += '\n';
  }
  
  return {
    content,
    success: true
  };
}

async function switchModel(modelSpec: string): Promise<CommandResult> {
  debug('Switching to model:', modelSpec);
  
  // Parse model spec: provider/model-id or just model-id
  let provider: string;
  let modelId: string;
  
  if (modelSpec.includes('/')) {
    const parts = modelSpec.split('/', 2);
    provider = parts[0]!;
    modelId = parts[1]!;
  } else {
    // Try to find model by ID across all providers
    const availableModels = modelRegistry.getAvailableModels();
    const foundModel = availableModels.find(m => 
      m.modelId === modelSpec || 
      m.displayName.toLowerCase() === modelSpec.toLowerCase()
    );
    
    if (foundModel) {
      provider = foundModel.provider;
      modelId = foundModel.modelId;
    } else {
      return {
        content: `❌ Model "${modelSpec}" not found.\nUse /model list to see available models.`,
        success: false
      };
    }
  }
  
  // Check if provider is configured
  if (!modelRegistry.isProviderConfigured(provider as ModelProvider)) {
    return {
      content: `❌ Provider "${provider}" is not configured.\nUse /model providers to see configuration requirements.`,
      success: false
    };
  }
  
  // Find the model config
  const models = modelRegistry.getModelsForProvider(provider as ModelProvider);
  const targetModel = models.find(m => m.modelId === modelId);
  
  if (!targetModel) {
    return {
      content: `❌ Model "${modelId}" not found for provider "${provider}".\nUse /model list to see available models.`,
      success: false
    };
  }
  
  // Test the model by creating it
  try {
    await modelRegistry.createLanguageModel(targetModel);
    await modelRegistry.setCurrentModel(targetModel);
    
    return {
      content: `✅ Switched to ${targetModel.displayName} (${targetModel.provider}/${targetModel.modelId})`,
      success: true
    };
  } catch (error) {
    debug('Error creating model:', error);
    return {
      content: `❌ Failed to switch to model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false
    };
  }
}
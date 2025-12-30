import type { Command, CommandResult } from './types';
import { modelRegistry } from '../services/modelRegistry';
import type { ModelProvider, ModelConfig } from '../types/models';
import { debug } from '../utils/logger';
import {
  readModelCache,
  writeModelCache,
  createEmptyCache,
  getCacheAge,
  formatCacheAge,
  type CachedModels,
} from '../utils/modelCache';
import {
  getProviderAdapter,
  type ProviderCredentials,
} from '../services/modelProviders';

function showInteractiveModelSelector(): CommandResult {
  const configuredProviders = modelRegistry.getConfiguredProviders();

  if (configuredProviders.length === 0) {
    return {
      content: '❌ No providers are configured. Please check your API keys in .env file.\n\n💡 Use `/model providers` to see configuration requirements.',
      success: false
    };
  }

  const models: Array<{id: string, label: string, value: string, provider: ModelProvider, recommendedRank: number}> = [];
  const currentModel = modelRegistry.getCurrentModel();

  for (const provider of configuredProviders) {
    const providerModels = modelRegistry.getModelsForProvider(provider);
    for (const model of providerModels) {
      const isCurrent = currentModel.modelId === model.modelId && currentModel.provider === model.provider;
      const currentMarker = isCurrent ? ' 👉 ' : '   ';

      models.push({
        id: `${model.provider}/${model.modelId}`,
        label: `${currentMarker}${model.displayName} (${model.provider})`,
        value: `${model.provider}/${model.modelId}`,
        provider: model.provider,
        recommendedRank: model.recommendedRank ?? 100
      });
    }
  }

  // Sort by recommendedRank within each provider
  models.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.recommendedRank - b.recommendedRank;
  });

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
      case 'help': {
        return {
          content: `🤖 Model Management Commands:

/model - Show current model and provider status
/model help - Show this help message

📋 Available Subcommands:
• /model list [--all] - List available models (use --all to show unconfigured)
• /model ls [--all] - Alias for list
• /model current - Show detailed information about current model
• /model providers - Show provider configuration status
• /model switch <provider>/<model-id> - Switch to specific model
• /model set <provider>/<model-id> - Alias for switch
• /model <model-spec> - Quick switch to model
• /model update [options] - Fetch latest models from provider APIs

🔄 Update Command Options:
• --providers <list> - Comma-separated providers (default: all configured)
• --project <id> - Google Vertex project ID
• --location <region> - Google Vertex region (default: us-central1)
• --dry-run - Show what would change without updating cache

🔧 Provider-Specific Commands:
• /model openai [model] - Switch to OpenAI model
• /model anthropic [model] - Switch to Anthropic model
• /model groq [model] - Switch to Groq model
• /model google-vertex [model] - Switch to Google Vertex model

📝 Examples:
• /model switch openai/gpt-4o
• /model anthropic claude-3-opus
• /model update --providers openai,anthropic
• /model list --all`,
          success: true
        };
      }

      case 'list':
      case 'ls': {
        const showAll = args.includes('--all') || args.includes('-a');
        return listAvailableModels(showAll);
      }
      
      case 'current':
        return showCurrentModel();
      
      case 'providers':
        return showProviders();

      case 'update':
        return await updateModels(args.slice(1));

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
  content += `   /model update      - Fetch latest models from provider APIs\n`;

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

const MAX_GENERATIONS_PER_PROVIDER = 2;

// Generation priority by provider (lower = more recent/recommended)
const GENERATION_PRIORITY: Record<ModelProvider, Record<string, number>> = {
  'openai': {
    '5.2': 1, '5.1': 2, '5': 3, '4o': 4, '4.1': 5, '4-turbo': 6, '4': 7,
    'o4': 20, 'o3': 21, 'o1': 22, '3.5': 30,
  },
  'anthropic': {
    '4.5': 1, '4.1': 2, '4': 3, '3.7': 4, '3.5': 5, '3': 6,
  },
  'groq': {
    'llama-4': 1, 'llama-3.3': 2, 'llama-3.1': 3,
    'deepseek': 10, 'mixtral': 11, 'qwen': 12,
  },
  'google-vertex': {
    '2.5': 1, '2.0': 2, '1.5': 3, '1.0': 4,
  },
};

interface ModelGeneration {
  name: string;
  displayName: string;
  models: ModelConfig[];
  priority: number;
}

/**
 * Extract generation identifier from model family/name
 * e.g., "claude-sonnet-4-5" -> "4.5", "gpt-4o" -> "4o", "llama-3.3-70b" -> "3.3"
 */
function extractGeneration(family: string, provider: ModelProvider): { id: string; display: string } {
  const lower = family.toLowerCase();

  if (provider === 'anthropic') {
    // Claude models: claude-sonnet-4-5 -> 4.5, claude-3-7-sonnet -> 3.7
    const match = lower.match(/claude-(?:sonnet|opus|haiku)?-?(\d+(?:-\d+)?)/);
    if (match) {
      const version = match[1]!.replace('-', '.');
      return { id: version, display: `Claude ${version}` };
    }
  }

  if (provider === 'openai') {
    // GPT models: gpt-5.2 -> 5.2, gpt-4o -> 4o, gpt-4-turbo -> 4
    const gptMatch = lower.match(/gpt-(\d+(?:\.\d+)?[a-z]*)/);
    if (gptMatch) {
      return { id: gptMatch[1]!, display: `GPT-${gptMatch[1]}` };
    }
    // O-series models: o1, o3, o4
    if (lower.includes('o1') || lower.includes('o3') || lower.includes('o4')) {
      const match = lower.match(/(o\d+)/);
      if (match) return { id: match[1]!, display: match[1]!.toUpperCase() };
    }
  }

  if (provider === 'groq') {
    // Llama models: llama-3.3-70b -> 3.3, llama-4 -> 4
    if (lower.includes('llama')) {
      const match = lower.match(/llama-?(\d+(?:\.\d+)?)/);
      if (match) return { id: `llama-${match[1]}`, display: `Llama ${match[1]}` };
    }
    if (lower.includes('deepseek')) return { id: 'deepseek', display: 'DeepSeek' };
    if (lower.includes('mixtral')) return { id: 'mixtral', display: 'Mixtral' };
    if (lower.includes('qwen')) return { id: 'qwen', display: 'Qwen' };
  }

  if (provider === 'google-vertex') {
    // Gemini models: gemini-2.5-pro -> 2.5, gemini-2.0-flash -> 2.0
    const match = lower.match(/gemini-(\d+\.\d+)/);
    if (match) return { id: match[1]!, display: `Gemini ${match[1]}` };
  }

  // Fallback: use family as-is
  return { id: family, display: family };
}

function groupModelsByGeneration(models: ModelConfig[], provider: ModelProvider): ModelGeneration[] {
  const generationMap = new Map<string, { display: string; models: ModelConfig[] }>();

  for (const model of models) {
    const family = model.family || model.displayName;
    const gen = extractGeneration(family, provider);
    const existing = generationMap.get(gen.id) || { display: gen.display, models: [] };
    existing.models.push(model);
    generationMap.set(gen.id, existing);
  }

  // Convert to array and use hardcoded priority
  const providerPriority = GENERATION_PRIORITY[provider] || {};
  const generations: ModelGeneration[] = [];
  for (const [id, data] of generationMap) {
    const priority = providerPriority[id] ?? 100;
    generations.push({ name: id, displayName: data.display, models: data.models, priority });
  }

  // Sort by hardcoded priority
  return generations.sort((a, b) => a.priority - b.priority);
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
    const allModels = modelRegistry.getModelsForProvider(provider);
    const isConfigured = configuredProviders.includes(provider);
    const providerStatus = isConfigured ? '✅' : '❌';

    // Group by generation and take top N (unless showing all)
    const allGenerations = groupModelsByGeneration(allModels, provider);
    const generations = showAll ? allGenerations : allGenerations.slice(0, MAX_GENERATIONS_PER_PROVIDER);
    const hiddenCount = allGenerations.length - generations.length;

    content += `**${provider.toUpperCase()}** ${providerStatus}`;
    if (hiddenCount > 0) {
      content += ` (${hiddenCount} more)`;
    }
    content += '\n';

    for (const gen of generations) {
      const currentModel = modelRegistry.getCurrentModel();
      const usableStatus = isConfigured ? '🟢' : '🔴';

      // Show generation header
      content += `   ${usableStatus} **${gen.displayName}**`;
      if (!isConfigured) {
        content += ' - Not configured';
      }
      content += '\n';

      // Show models within this generation
      for (const model of gen.models) {
        const isCurrent = model.modelId === currentModel.modelId && model.provider === currentModel.provider;
        const currentMarker = isCurrent ? '👉 ' : '   ';
        content += `      ${currentMarker}${model.displayName}\n`;
      }
    }
    content += '\n';
  }

  if (showAll) {
    content += `💡 Legend: 🟢 = Usable, 🔴 = Needs configuration\n`;
    content += `💡 Configure providers in .env file (see /model providers)\n`;
  } else {
    content += `💡 Use /model list --all to see all generations\n`;
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

interface UpdateOptions {
  providers?: ModelProvider[];
  project?: string;
  location?: string;
  dryRun: boolean;
}

function parseUpdateArgs(args: string[]): UpdateOptions {
  const options: UpdateOptions = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--providers' && args[i + 1]) {
      options.providers = args[i + 1]!.split(',') as ModelProvider[];
      i++;
    } else if (arg === '--project' && args[i + 1]) {
      options.project = args[i + 1];
      i++;
    } else if (arg === '--location' && args[i + 1]) {
      options.location = args[i + 1];
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function updateModels(args: string[]): Promise<CommandResult> {
  const options = parseUpdateArgs(args);
  debug('Update models with options:', options);

  const allProviders: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex'];
  const configuredProviders = modelRegistry.getConfiguredProviders();

  // Determine which providers to update
  let providersToUpdate: ModelProvider[];
  if (options.providers) {
    // Validate specified providers
    const invalidProviders = options.providers.filter(p => !allProviders.includes(p));
    if (invalidProviders.length > 0) {
      return {
        content: `❌ Invalid provider(s): ${invalidProviders.join(', ')}\nValid providers: ${allProviders.join(', ')}`,
        success: false,
      };
    }
    providersToUpdate = options.providers;
  } else {
    // Default to configured providers
    providersToUpdate = configuredProviders;
  }

  if (providersToUpdate.length === 0) {
    return {
      content: '❌ No providers to update. Configure API keys or use --providers flag.\nUse /model providers to see configuration requirements.',
      success: false,
    };
  }

  // Show current cache info
  const cacheAge = getCacheAge();
  let content = '🔄 **Updating Model Cache**\n\n';

  if (cacheAge !== null) {
    content += `📦 Current cache: ${formatCacheAge(cacheAge)}\n`;
  } else {
    content += '📦 No existing cache found\n';
  }

  content += `🎯 Providers: ${providersToUpdate.join(', ')}\n\n`;

  // Get credentials for each provider
  const providerCredentials = modelRegistry.getProviderCredentials();

  // Fetch models from each provider
  const results: Array<{
    provider: ModelProvider;
    success: boolean;
    modelCount: number;
    error?: string;
    sourceUrl: string;
  }> = [];

  for (const provider of providersToUpdate) {
    content += `⏳ Fetching ${provider}...\n`;

    const adapter = getProviderAdapter(provider);
    const credentials: ProviderCredentials = {
      apiKey: providerCredentials[provider]?.apiKey,
      projectId: options.project || providerCredentials['google-vertex']?.projectId,
      location: options.location || providerCredentials['google-vertex']?.region,
    };

    const result = await adapter.fetchModels(credentials);
    results.push({
      provider,
      success: result.success,
      modelCount: result.models.length,
      error: result.error,
      sourceUrl: result.sourceUrl,
    });

    if (result.success) {
      content = content.replace(`⏳ Fetching ${provider}...`, `✅ ${provider}: ${result.models.length} models`);
    } else {
      content = content.replace(`⏳ Fetching ${provider}...`, `❌ ${provider}: ${result.error}`);
    }
  }

  // Check if any succeeded
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length === 0) {
    content += '\n❌ All providers failed. Cache not updated.\n';
    content += '\n💡 Check your API keys with /model providers';
    return {
      content,
      success: false,
    };
  }

  // Build new cache
  const existingCache = readModelCache();
  const newCache: CachedModels = existingCache ? { ...existingCache } : createEmptyCache();
  newCache.fetchedAt = new Date().toISOString();
  newCache.version = '1.0.0';

  // Collect all models from successful fetches
  const allModels = [...(existingCache?.models || [])];

  for (const provider of providersToUpdate) {
    const adapter = getProviderAdapter(provider);
    const credentials: ProviderCredentials = {
      apiKey: providerCredentials[provider]?.apiKey,
      projectId: options.project || providerCredentials['google-vertex']?.projectId,
      location: options.location || providerCredentials['google-vertex']?.region,
    };

    const result = await adapter.fetchModels(credentials);
    if (result.success) {
      // Remove old models for this provider
      const otherModels = allModels.filter(m => m.provider !== provider);
      allModels.length = 0;
      allModels.push(...otherModels, ...result.models);

      newCache.sourceUrls[provider] = result.sourceUrl;
      newCache.providerCounts[provider] = result.models.length;
    }
  }

  newCache.models = allModels;

  // Dry run - show what would change
  if (options.dryRun) {
    content += '\n📋 **Dry Run - Changes that would be made:**\n';

    for (const result of successfulResults) {
      const oldCount = existingCache?.providerCounts[result.provider] || 0;
      const diff = result.modelCount - oldCount;
      const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';
      content += `   ${result.provider}: ${result.modelCount} models (${diffStr})\n`;
    }

    content += '\n💡 Run without --dry-run to apply changes';
    return {
      content,
      success: true,
    };
  }

  // Write cache
  try {
    writeModelCache(newCache);
    content += '\n✅ **Cache Updated**\n';
    content += `📦 Total models: ${newCache.models.length}\n`;
    content += `📅 Updated: ${new Date().toLocaleString()}\n`;

    // Reload models in registry
    await modelRegistry.reloadModelsFromCache();

    content += '\n💡 Use /model list to see updated models';
  } catch (error) {
    content += `\n❌ Failed to write cache: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return {
      content,
      success: false,
    };
  }

  return {
    content,
    success: true,
  };
}
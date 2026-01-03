/**
 * Model Provider Adapters
 *
 * Interfaces and factory for fetching models from various LLM providers.
 */

import type { ModelProvider } from '../../types/models';
import type { NormalizedModel } from '../../utils/modelCache';
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { GroqAdapter } from './groq';
import { GoogleVertexAdapter } from './googleVertex';
import { CerebrasAdapter } from './cerebras';

/**
 * Credentials for provider authentication
 */
export interface ProviderCredentials {
  apiKey?: string;
  projectId?: string;
  location?: string;
}

/**
 * Result of fetching models from a provider
 */
export interface FetchModelsResult {
  success: boolean;
  models: NormalizedModel[];
  sourceUrl: string;
  error?: string;
}

/**
 * Interface for provider adapters
 */
export interface ModelProviderAdapter {
  provider: ModelProvider;
  getSourceUrl(): string;
  fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult>;
}

/**
 * Get adapter for a specific provider
 */
export function getProviderAdapter(provider: ModelProvider): ModelProviderAdapter {
  switch (provider) {
    case 'openai':
      return new OpenAIAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'groq':
      return new GroqAdapter();
    case 'google-vertex':
      return new GoogleVertexAdapter();
    case 'cerebras':
      return new CerebrasAdapter();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get all available provider adapters
 */
export function getAllProviderAdapters(): ModelProviderAdapter[] {
  return [
    new OpenAIAdapter(),
    new AnthropicAdapter(),
    new GroqAdapter(),
    new GoogleVertexAdapter(),
    new CerebrasAdapter(),
  ];
}

export { OpenAIAdapter } from './openai';
export { AnthropicAdapter } from './anthropic';
export { GroqAdapter } from './groq';
export { GoogleVertexAdapter } from './googleVertex';
export { CerebrasAdapter } from './cerebras';

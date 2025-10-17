/**
 * Embeddings provider factory and configuration
 */

import { debug } from '../../utils/logger';
import type { EmbeddingsProvider } from './types';
import { LocalEmbeddingsProvider } from './localProvider';
import { OpenAIEmbeddingsProvider } from './openaiProvider';

export type ProviderType = 'local' | 'openai' | 'auto';

export interface EmbeddingsConfig {
  provider: ProviderType;
  localServiceUrl?: string;
  fallbackToOpenAI?: boolean;
}

const DEFAULT_CONFIG: EmbeddingsConfig = {
  provider: (process.env.EMBEDDINGS_PROVIDER as ProviderType) || 'auto',
  localServiceUrl: process.env.EMBEDDINGS_SERVICE_URL || 'http://localhost:8000',
  fallbackToOpenAI: process.env.EMBEDDINGS_FALLBACK_OPENAI !== 'false'
};

export class EmbeddingsProviderFactory {
  private config: EmbeddingsConfig;
  private cachedProvider: EmbeddingsProvider | null = null;

  constructor(config: Partial<EmbeddingsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    debug('Initialized EmbeddingsProviderFactory with config:', this.config);
  }

  /**
   * Get the appropriate embeddings provider based on configuration and availability
   */
  async getProvider(): Promise<EmbeddingsProvider> {
    // Return cached provider if available
    if (this.cachedProvider) {
      return this.cachedProvider;
    }

    let provider: EmbeddingsProvider;

    switch (this.config.provider) {
      case 'local':
        provider = await this.getLocalProvider();
        break;

      case 'openai':
        provider = await this.getOpenAIProvider();
        break;

      case 'auto':
      default:
        provider = await this.getAutoProvider();
        break;
    }

    // Cache the provider for reuse
    this.cachedProvider = provider;
    debug(`Selected embeddings provider: ${provider.getName()}`);

    return provider;
  }

  /**
   * Force refresh of provider selection (clears cache)
   */
  refresh(): void {
    this.cachedProvider = null;
    debug('Cleared cached embeddings provider');
  }

  private async getLocalProvider(): Promise<EmbeddingsProvider> {
    const provider = new LocalEmbeddingsProvider({
      baseUrl: this.config.localServiceUrl
    });

    const available = await provider.isAvailable();

    if (!available) {
      if (this.config.fallbackToOpenAI) {
        debug('Local provider not available, falling back to OpenAI');
        return this.getOpenAIProvider();
      } else {
        throw new Error('Local embeddings service not available and fallback disabled');
      }
    }

    return provider;
  }

  private async getOpenAIProvider(): Promise<EmbeddingsProvider> {
    const provider = new OpenAIEmbeddingsProvider();

    const available = await provider.isAvailable();

    if (!available) {
      throw new Error('OpenAI embeddings not available (API key missing or invalid)');
    }

    return provider;
  }

  private async getAutoProvider(): Promise<EmbeddingsProvider> {
    // Try local first, then fall back to OpenAI
    const localProvider = new LocalEmbeddingsProvider({
      baseUrl: this.config.localServiceUrl
    });

    const localAvailable = await localProvider.isAvailable();

    if (localAvailable) {
      debug('Auto-selected local embeddings provider');
      return localProvider;
    }

    debug('Local provider not available, trying OpenAI');
    return this.getOpenAIProvider();
  }
}

// Global factory instance
export const embeddingsFactory = new EmbeddingsProviderFactory();

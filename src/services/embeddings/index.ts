/**
 * Embeddings service exports
 */

export type { EmbeddingsProvider, EmbeddingResult } from './types';
export { LocalEmbeddingsProvider } from './localProvider';
export { OpenAIEmbeddingsProvider } from './openaiProvider';
export { EmbeddingsProviderFactory, embeddingsFactory } from './providerFactory';
export type { ProviderType, EmbeddingsConfig } from './providerFactory';

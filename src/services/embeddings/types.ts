/**
 * Types for embeddings providers
 */

export interface EmbeddingResult {
  embedding: Float32Array;
  dimensions: number;
  model: string;
}

export interface EmbeddingsProvider {
  /**
   * Generate an embedding for a single text input
   */
  generateEmbedding(text: string): Promise<EmbeddingResult | null>;

  /**
   * Generate embeddings for multiple text inputs (batch)
   */
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[] | null>;

  /**
   * Get the dimension size of embeddings produced by this provider
   */
  getDimensions(): number;

  /**
   * Get the name of this provider
   */
  getName(): string;

  /**
   * Check if this provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}

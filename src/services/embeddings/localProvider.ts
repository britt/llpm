/**
 * Local embeddings provider using bge-base-en-v1.5 via FastAPI service
 */

import { debug } from '../../utils/logger';
import type { EmbeddingsProvider, EmbeddingResult } from './types';

export interface LocalProviderConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  batchSize: number;
}

const DEFAULT_CONFIG: LocalProviderConfig = {
  baseUrl: process.env.EMBEDDINGS_SERVICE_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds
  retries: 3,
  batchSize: 32
};

interface EmbeddingServiceResponse {
  embeddings: number[][];
  model: string;
  dimension: number;
}

export class LocalEmbeddingsProvider implements EmbeddingsProvider {
  private config: LocalProviderConfig;
  private dimensions: number = 768; // bge-base-en-v1.5 default

  constructor(config: Partial<LocalProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    debug('Initialized LocalEmbeddingsProvider with config:', this.config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      debug('Local embeddings service not available:', error);
      return false;
    }
  }

  getName(): string {
    return 'local-bge-base-en-v1.5';
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult | null> {
    const results = await this.generateEmbeddings([text]);
    return results && results.length > 0 ? results[0] : null;
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[] | null> {
    if (texts.length === 0) {
      return [];
    }

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        debug(`Generating embeddings for ${texts.length} texts (attempt ${attempt}/${this.config.retries})`);

        const response = await fetch(`${this.config.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: texts,
            batch_size: this.config.batchSize
          }),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embeddings service returned ${response.status}: ${errorText}`);
        }

        const data: EmbeddingServiceResponse = await response.json();

        // Update dimensions from response
        if (data.dimension && data.dimension !== this.dimensions) {
          debug(`Updating dimensions from ${this.dimensions} to ${data.dimension}`);
          this.dimensions = data.dimension;
        }

        // Convert to EmbeddingResult format
        const results: EmbeddingResult[] = data.embeddings.map(emb => ({
          embedding: new Float32Array(emb),
          dimensions: data.dimension,
          model: data.model
        }));

        debug(`Successfully generated ${results.length} embeddings`);
        return results;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        debug(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          debug(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    debug(`Failed to generate embeddings after ${this.config.retries} attempts:`, lastError);
    return null;
  }
}

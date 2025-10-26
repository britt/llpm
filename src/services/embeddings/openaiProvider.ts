/**
 * OpenAI embeddings provider
 */

import { debug } from '../../utils/logger';
import type { EmbeddingsProvider, EmbeddingResult } from './types';
import { getTracer } from '../../utils/tracing';
import { modelRegistry } from '../modelRegistry';

export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private dimensions: number = 1536; // text-embedding-3-small default

  getName(): string {
    return 'openai-text-embedding-3-small';
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await modelRegistry.init();
      const { openai } = await import('@ai-sdk/openai');
      return !!openai;
    } catch (error) {
      debug('OpenAI embeddings not available:', error);
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult | null> {
    try {
      debug('Generating OpenAI embedding for text:', text.substring(0, 50) + '...');

      // Initialize model registry if needed
      await modelRegistry.init();

      const { openai } = await import('@ai-sdk/openai');
      const { embed } = await import('ai');

      // Use OpenAI's text-embedding-3-small model
      const result = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
        experimental_telemetry: {
          isEnabled: true,
          tracer: getTracer(),
          functionId: 'llpm.generateEmbedding',
          metadata: {
            textLength: text.length,
            dimensions: this.dimensions,
            model: 'text-embedding-3-small'
          }
        }
      });

      const embedding = new Float32Array(result.embedding);
      debug('Generated OpenAI embedding with', embedding.length, 'dimensions');

      return {
        embedding,
        dimensions: embedding.length,
        model: this.getName()
      };
    } catch (error) {
      debug('Error generating OpenAI embedding:', error);
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[] | null> {
    // OpenAI embed() doesn't support batch mode in the current API
    // Process sequentially for now
    const results: EmbeddingResult[] = [];

    for (const text of texts) {
      const result = await this.generateEmbedding(text);
      if (result) {
        results.push(result);
      } else {
        return null; // If any fails, return null
      }
    }

    return results;
  }
}

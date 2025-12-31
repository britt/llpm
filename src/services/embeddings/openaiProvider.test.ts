/**
 * Tests for OpenAI Embeddings Provider
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

// Mock tracing
vi.mock('../../utils/tracing', () => ({
  getTracer: vi.fn().mockReturnValue(undefined)
}));

// Mock model registry
vi.mock('../modelRegistry', () => ({
  modelRegistry: {
    init: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock @ai-sdk/openai
const mockEmbeddingModel = vi.hoisted(() => vi.fn());
vi.mock('@ai-sdk/openai', () => ({
  openai: {
    embedding: mockEmbeddingModel
  }
}));

// Mock ai package
const mockEmbed = vi.hoisted(() => vi.fn());
vi.mock('ai', () => ({
  embed: mockEmbed
}));

import { OpenAIEmbeddingsProvider } from './openaiProvider';
import { modelRegistry } from '../modelRegistry';

describe('OpenAIEmbeddingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbeddingModel.mockReturnValue({ modelId: 'text-embedding-3-small' });
  });

  describe('getName', () => {
    it('should return provider name', () => {
      const provider = new OpenAIEmbeddingsProvider();
      expect(provider.getName()).toBe('openai-text-embedding-3-small');
    });
  });

  describe('getDimensions', () => {
    it('should return default dimensions', () => {
      const provider = new OpenAIEmbeddingsProvider();
      expect(provider.getDimensions()).toBe(1536);
    });
  });

  describe('isAvailable', () => {
    it('should return true when OpenAI is available', async () => {
      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(modelRegistry.init).toHaveBeenCalled();
    });

    it('should return false when modelRegistry.init fails', async () => {
      vi.mocked(modelRegistry.init).mockRejectedValueOnce(new Error('Init failed'));

      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbed.mockResolvedValue({
        embedding: mockEmbedding
      });

      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.generateEmbedding('test text');

      expect(result).not.toBeNull();
      expect(result?.embedding).toBeInstanceOf(Float32Array);
      expect(result?.dimensions).toBe(5);
      expect(result?.model).toBe('openai-text-embedding-3-small');
      expect(mockEmbed).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      mockEmbed.mockRejectedValue(new Error('API error'));

      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.generateEmbedding('test text');

      expect(result).toBeNull();
    });

    it('should use correct model configuration', async () => {
      mockEmbed.mockResolvedValue({
        embedding: [0.1]
      });

      const provider = new OpenAIEmbeddingsProvider();
      await provider.generateEmbedding('test');

      expect(mockEmbeddingModel).toHaveBeenCalledWith('text-embedding-3-small', {
        dimensions: 1536
      });
    });

    it('should include telemetry configuration', async () => {
      mockEmbed.mockResolvedValue({
        embedding: [0.1]
      });

      const provider = new OpenAIEmbeddingsProvider();
      await provider.generateEmbedding('test text');

      expect(mockEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental_telemetry: expect.objectContaining({
            isEnabled: true,
            functionId: 'llpm.generateEmbedding'
          })
        })
      );
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      mockEmbed
        .mockResolvedValueOnce({ embedding: [0.1, 0.2] })
        .mockResolvedValueOnce({ embedding: [0.3, 0.4] });

      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.generateEmbeddings(['text1', 'text2']);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0].embedding).toBeInstanceOf(Float32Array);
      expect(result![1].embedding).toBeInstanceOf(Float32Array);
    });

    it('should return null if any embedding fails', async () => {
      mockEmbed
        .mockResolvedValueOnce({ embedding: [0.1, 0.2] })
        .mockRejectedValueOnce(new Error('API error'));

      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.generateEmbeddings(['text1', 'text2']);

      expect(result).toBeNull();
    });

    it('should return empty array for empty input', async () => {
      const provider = new OpenAIEmbeddingsProvider();
      const result = await provider.generateEmbeddings([]);

      expect(result).toEqual([]);
    });
  });
});

/**
 * Tests for Local Embeddings Provider
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { EventEmitter } from 'events';

// Create hoisted mock for spawn
const mockSpawn = vi.hoisted(() => vi.fn());

// Mock child_process
vi.mock('child_process', () => {
  const mockModule = { spawn: mockSpawn };
  return { ...mockModule, default: mockModule };
});

// Mock logger
vi.mock('../../utils/logger', () => ({
  debug: vi.fn()
}));

// Mock tracing (pass through)
vi.mock('../../utils/tracing', () => ({
  traced: vi.fn((name: string, options: any, fn: (span: any) => Promise<any>) => {
    const mockSpan = {
      setAttribute: vi.fn()
    };
    return fn(mockSpan);
  })
}));

// Mock fs for getDefaultPythonPath
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  default: {
    existsSync: vi.fn().mockReturnValue(false)
  }
}));

import { LocalEmbeddingsProvider } from './localProvider';

// Helper to create a mock process
function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { write: Mock; end: Mock };
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = {
    write: vi.fn(),
    end: vi.fn()
  };
  return proc;
}

describe('LocalEmbeddingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const provider = new LocalEmbeddingsProvider();

      expect(provider.getName()).toBe('local-bge-base-en-v1.5');
      expect(provider.getDimensions()).toBe(768);
    });

    it('should accept custom config', () => {
      const provider = new LocalEmbeddingsProvider({
        pythonPath: '/custom/python',
        timeout: 30000,
        batchSize: 16
      });

      expect(provider.getName()).toBe('local-bge-base-en-v1.5');
    });
  });

  describe('getName', () => {
    it('should return provider name', () => {
      const provider = new LocalEmbeddingsProvider();
      expect(provider.getName()).toBe('local-bge-base-en-v1.5');
    });
  });

  describe('getDimensions', () => {
    it('should return default dimensions', () => {
      const provider = new LocalEmbeddingsProvider();
      expect(provider.getDimensions()).toBe(768);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Python is available', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const availablePromise = provider.isAvailable();

      // Simulate successful Python check
      setTimeout(() => {
        mockProc.emit('close', 0);
      }, 10);

      const result = await availablePromise;
      expect(result).toBe(true);
    });

    it('should return false when Python is not available', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const availablePromise = provider.isAvailable();

      // Simulate failed Python check
      setTimeout(() => {
        mockProc.emit('close', 1);
      }, 10);

      const result = await availablePromise;
      expect(result).toBe(false);
    });

    it('should return false when spawn errors', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const availablePromise = provider.isAvailable();

      // Simulate spawn error
      setTimeout(() => {
        mockProc.emit('error', new Error('spawn failed'));
      }, 10);

      const result = await availablePromise;
      expect(result).toBe(false);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for single text', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingPromise = provider.generateEmbedding('test text');

      // Simulate successful response
      setTimeout(() => {
        const response = JSON.stringify({
          embeddings: [[0.1, 0.2, 0.3]],
          model: 'BAAI/bge-base-en-v1.5',
          dimension: 3
        });
        mockProc.stdout.emit('data', response);
        mockProc.emit('close', 0);
      }, 10);

      const result = await embeddingPromise;

      expect(result).not.toBeNull();
      expect(result?.embedding).toBeInstanceOf(Float32Array);
      expect(result?.dimensions).toBe(3);
    });

    it('should return null on error', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingPromise = provider.generateEmbedding('test text');

      // Simulate error
      setTimeout(() => {
        mockProc.stderr.emit('data', 'Python error');
        mockProc.emit('close', 1);
      }, 10);

      const result = await embeddingPromise;
      expect(result).toBeNull();
    });
  });

  describe('generateEmbeddings', () => {
    it('should return empty array for empty input', async () => {
      const provider = new LocalEmbeddingsProvider();
      const result = await provider.generateEmbeddings([]);

      expect(result).toEqual([]);
    });

    it('should generate embeddings for multiple texts', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingsPromise = provider.generateEmbeddings(['text1', 'text2']);

      // Simulate successful response
      setTimeout(() => {
        const response = JSON.stringify({
          embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
          model: 'BAAI/bge-base-en-v1.5',
          dimension: 3
        });
        mockProc.stdout.emit('data', response);
        mockProc.emit('close', 0);
      }, 10);

      const result = await embeddingsPromise;

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0].embedding).toBeInstanceOf(Float32Array);
      expect(result![1].embedding).toBeInstanceOf(Float32Array);
    });

    it('should write input to stdin', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingsPromise = provider.generateEmbeddings(['test']);

      setTimeout(() => {
        const response = JSON.stringify({
          embeddings: [[0.1, 0.2, 0.3]],
          model: 'BAAI/bge-base-en-v1.5',
          dimension: 3
        });
        mockProc.stdout.emit('data', response);
        mockProc.emit('close', 0);
      }, 10);

      await embeddingsPromise;

      expect(mockProc.stdin.write).toHaveBeenCalled();
      expect(mockProc.stdin.end).toHaveBeenCalled();
    });

    it('should handle Python process error', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingsPromise = provider.generateEmbeddings(['test']);

      setTimeout(() => {
        mockProc.emit('error', new Error('spawn failed'));
      }, 10);

      const result = await embeddingsPromise;
      expect(result).toBeNull();
    });

    it('should handle non-zero exit code', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingsPromise = provider.generateEmbeddings(['test']);

      setTimeout(() => {
        mockProc.stderr.emit('data', 'Some error');
        mockProc.emit('close', 1);
      }, 10);

      const result = await embeddingsPromise;
      expect(result).toBeNull();
    });

    it('should handle JSON parse error', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingsPromise = provider.generateEmbeddings(['test']);

      setTimeout(() => {
        mockProc.stdout.emit('data', 'not valid json');
        mockProc.emit('close', 0);
      }, 10);

      const result = await embeddingsPromise;
      expect(result).toBeNull();
    });

    it('should handle response with error field', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();
      const embeddingsPromise = provider.generateEmbeddings(['test']);

      setTimeout(() => {
        const response = JSON.stringify({
          error: 'Model not found'
        });
        mockProc.stdout.emit('data', response);
        mockProc.emit('close', 0);
      }, 10);

      const result = await embeddingsPromise;
      expect(result).toBeNull();
    });

    it('should update dimensions from response', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const provider = new LocalEmbeddingsProvider();

      // Initial dimensions should be 768
      expect(provider.getDimensions()).toBe(768);

      const embeddingsPromise = provider.generateEmbeddings(['test']);

      setTimeout(() => {
        const response = JSON.stringify({
          embeddings: [[0.1, 0.2, 0.3]],
          model: 'BAAI/bge-base-en-v1.5',
          dimension: 1024 // Different dimension
        });
        mockProc.stdout.emit('data', response);
        mockProc.emit('close', 0);
      }, 10);

      await embeddingsPromise;

      // Dimensions should be updated
      expect(provider.getDimensions()).toBe(1024);
    });

    it('should handle timeout', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      // Use very short timeout for testing
      const provider = new LocalEmbeddingsProvider({ timeout: 10 });
      const embeddingsPromise = provider.generateEmbeddings(['test']);

      // Don't emit any events - let it timeout

      const result = await embeddingsPromise;
      expect(result).toBeNull();
    });
  });
});

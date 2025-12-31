import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

// Create mock span and tracer
const mockSpan = {
  setStatus: vi.fn(),
  recordException: vi.fn(),
  end: vi.fn(),
  setAttribute: vi.fn()
};

const mockStartSpan = vi.fn(() => mockSpan);

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', async () => {
  const actual = await vi.importActual('@opentelemetry/api');
  return {
    ...actual,
    trace: {
      getTracer: vi.fn(() => ({
        startSpan: (...args: any[]) => {
          mockStartSpan(...args);
          return mockSpan;
        }
      })),
      setSpan: vi.fn((ctx, _span) => ctx)
    },
    context: {
      active: vi.fn(() => ({})),
      with: vi.fn((_ctx, fn) => fn())
    }
  };
});

import { traced, tracedSync, getTracer } from './tracing';

describe('tracing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('traced', () => {
    it('should create a span and execute operation', async () => {
      const result = await traced('test-operation', {}, async (span) => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockStartSpan).toHaveBeenCalledWith('test-operation', expect.any(Object));
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should set attributes on span', async () => {
      await traced('test-op', {
        attributes: { key: 'value', count: 42 }
      }, async () => 'result');

      expect(mockStartSpan).toHaveBeenCalledWith('test-op', expect.objectContaining({
        attributes: expect.objectContaining({ key: 'value', count: 42 })
      }));
    });

    it('should set OpenInference kind attribute', async () => {
      await traced('llm-call', {
        openInferenceKind: 'LLM'
      }, async () => 'result');

      expect(mockStartSpan).toHaveBeenCalledWith('llm-call', expect.objectContaining({
        attributes: expect.objectContaining({
          'openinference.span.kind': 'LLM'
        })
      }));
    });

    it('should use specified span kind', async () => {
      await traced('client-call', {
        kind: SpanKind.CLIENT
      }, async () => 'result');

      expect(mockStartSpan).toHaveBeenCalledWith('client-call', expect.objectContaining({
        kind: SpanKind.CLIENT
      }));
    });

    it('should default to INTERNAL span kind', async () => {
      await traced('internal-op', {}, async () => 'result');

      expect(mockStartSpan).toHaveBeenCalledWith('internal-op', expect.objectContaining({
        kind: SpanKind.INTERNAL
      }));
    });

    it('should handle errors and record exception', async () => {
      const error = new Error('test error');

      await expect(traced('failing-op', {}, async () => {
        throw error;
      })).rejects.toThrow('test error');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'test error'
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle non-Error throws', async () => {
      await expect(traced('string-throw', {}, async () => {
        throw 'string error';
      })).rejects.toBe('string error');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'string error'
      });
    });
  });

  describe('tracedSync', () => {
    it('should create a span and execute synchronous operation', () => {
      const result = tracedSync('sync-operation', {}, (span) => {
        return 'sync-success';
      });

      expect(result).toBe('sync-success');
      expect(mockStartSpan).toHaveBeenCalledWith('sync-operation', expect.any(Object));
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should set attributes on span', () => {
      tracedSync('sync-op', {
        attributes: { syncKey: 'syncValue' }
      }, () => 'result');

      expect(mockStartSpan).toHaveBeenCalledWith('sync-op', expect.objectContaining({
        attributes: expect.objectContaining({ syncKey: 'syncValue' })
      }));
    });

    it('should set OpenInference kind attribute', () => {
      tracedSync('tool-call', {
        openInferenceKind: 'TOOL'
      }, () => 'result');

      expect(mockStartSpan).toHaveBeenCalledWith('tool-call', expect.objectContaining({
        attributes: expect.objectContaining({
          'openinference.span.kind': 'TOOL'
        })
      }));
    });

    it('should handle errors and record exception', () => {
      const error = new Error('sync error');

      expect(() => tracedSync('failing-sync', {}, () => {
        throw error;
      })).toThrow('sync error');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'sync error'
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('getTracer', () => {
    it('should return the tracer instance', () => {
      const tracer = getTracer();

      expect(tracer).toBeDefined();
      expect(tracer.startSpan).toBeDefined();
    });
  });
});

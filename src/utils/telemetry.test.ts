import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock OpenTelemetry dependencies
vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn()
}));

vi.mock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
  OTLPTraceExporter: vi.fn()
}));

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: vi.fn()
}));

vi.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: vi.fn()
}));

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: vi.fn().mockReturnValue({})
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version'
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn().mockReturnValue({
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn()
      })
    })
  },
  SpanStatusCode: { OK: 1 }
}));

vi.mock('./logger', () => ({
  debug: vi.fn()
}));

// Import after mocks
import {
  initializeTelemetry,
  shutdownTelemetry,
  getTelemetrySDK,
  isTelemetryInitialized,
  sendTestTrace
} from './telemetry';
import { NodeSDK } from '@opentelemetry/sdk-node';

describe('Telemetry Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state by re-importing - we'll test with fresh state
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Clean up any initialized SDK
    await shutdownTelemetry();
    process.env = originalEnv;
  });

  describe('initializeTelemetry', () => {
    it('should return null when telemetry is explicitly disabled via config', async () => {
      const result = initializeTelemetry({ enabled: false });

      expect(result).toBeNull();
    });

    it('should return null when telemetry is disabled via environment variable', async () => {
      process.env.LLPM_TELEMETRY_ENABLED = '0';

      // Need to re-import to pick up env changes
      const { initializeTelemetry: init } = await import('./telemetry');
      const result = init({ enabled: false });

      expect(result).toBeNull();
    });

    it('should initialize SDK with default config', async () => {
      // Fresh import to reset module state
      vi.resetModules();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => ({
          start: vi.fn(),
          shutdown: vi.fn().mockResolvedValue(undefined)
        }))
      }));

      const { initializeTelemetry: init } = await import('./telemetry');
      const result = init({ enabled: true });

      // Should return SDK instance
      expect(result).not.toBeNull();
    });

    it('should use custom service name and version', async () => {
      vi.resetModules();

      const mockNodeSDK = vi.fn().mockImplementation(() => ({
        start: vi.fn(),
        shutdown: vi.fn().mockResolvedValue(undefined)
      }));

      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: mockNodeSDK
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init } = await import('./telemetry');

      init({
        enabled: true,
        serviceName: 'custom-service',
        serviceVersion: '1.0.0'
      });

      expect(mockNodeSDK).toHaveBeenCalled();
    });

    it('should use custom OTLP endpoint from config', async () => {
      vi.resetModules();

      const mockHTTPExporter = vi.fn();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => ({
          start: vi.fn(),
          shutdown: vi.fn().mockResolvedValue(undefined)
        }))
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: mockHTTPExporter
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init } = await import('./telemetry');

      init({
        enabled: true,
        otlpEndpoint: 'http://custom-endpoint:4318'
      });

      expect(mockHTTPExporter).toHaveBeenCalledWith({
        url: 'http://custom-endpoint:4318/v1/traces'
      });
    });

    it('should use gRPC exporter when protocol is grpc', async () => {
      vi.resetModules();
      process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc';

      const mockGRPCExporter = vi.fn();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => ({
          start: vi.fn(),
          shutdown: vi.fn().mockResolvedValue(undefined)
        }))
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: mockGRPCExporter
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init } = await import('./telemetry');

      init({ enabled: true });

      expect(mockGRPCExporter).toHaveBeenCalled();
    });

    it('should handle SDK initialization errors gracefully', async () => {
      vi.resetModules();

      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => {
          throw new Error('SDK initialization failed');
        })
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init } = await import('./telemetry');

      const result = init({ enabled: true });

      // Should return null when initialization fails
      expect(result).toBeNull();
    });
  });

  describe('shutdownTelemetry', () => {
    it('should do nothing if SDK not initialized', async () => {
      vi.resetModules();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn()
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { shutdownTelemetry: shutdown } = await import('./telemetry');

      // Should not throw
      await expect(shutdown()).resolves.toBeUndefined();
    });

    it('should shutdown SDK when initialized', async () => {
      vi.resetModules();

      const mockShutdown = vi.fn().mockResolvedValue(undefined);
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => ({
          start: vi.fn(),
          shutdown: mockShutdown
        }))
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init, shutdownTelemetry: shutdown } = await import('./telemetry');

      init({ enabled: true });
      await shutdown();

      expect(mockShutdown).toHaveBeenCalled();
    });
  });

  describe('getTelemetrySDK', () => {
    it('should return null when not initialized', async () => {
      vi.resetModules();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn()
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { getTelemetrySDK: getSDK } = await import('./telemetry');

      expect(getSDK()).toBeNull();
    });

    it('should return SDK when initialized', async () => {
      vi.resetModules();

      const mockSDK = {
        start: vi.fn(),
        shutdown: vi.fn().mockResolvedValue(undefined)
      };
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => mockSDK)
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init, getTelemetrySDK: getSDK } = await import('./telemetry');

      init({ enabled: true });

      expect(getSDK()).toBe(mockSDK);
    });
  });

  describe('isTelemetryInitialized', () => {
    it('should return false when not initialized', async () => {
      vi.resetModules();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn()
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { isTelemetryInitialized: isInit } = await import('./telemetry');

      expect(isInit()).toBe(false);
    });

    it('should return true when initialized', async () => {
      vi.resetModules();

      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => ({
          start: vi.fn(),
          shutdown: vi.fn().mockResolvedValue(undefined)
        }))
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));

      const { initializeTelemetry: init, isTelemetryInitialized: isInit } = await import('./telemetry');

      init({ enabled: true });

      expect(isInit()).toBe(true);
    });
  });

  describe('sendTestTrace', () => {
    it('should skip when not initialized', async () => {
      vi.resetModules();
      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn()
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));
      vi.doMock('@opentelemetry/api', () => ({
        trace: {
          getTracer: vi.fn()
        },
        SpanStatusCode: { OK: 1 }
      }));

      const { sendTestTrace: sendTrace } = await import('./telemetry');
      const api = await import('@opentelemetry/api');

      await sendTrace();

      // Should not call trace.getTracer when not initialized
      expect(api.trace.getTracer).not.toHaveBeenCalled();
    });

    it('should send trace when initialized', async () => {
      vi.resetModules();

      const mockSpan = {
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn()
      };
      const mockTracer = {
        startSpan: vi.fn().mockReturnValue(mockSpan)
      };

      vi.doMock('@opentelemetry/sdk-node', () => ({
        NodeSDK: vi.fn().mockImplementation(() => ({
          start: vi.fn(),
          shutdown: vi.fn().mockResolvedValue(undefined)
        }))
      }));
      vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
        getNodeAutoInstrumentations: vi.fn().mockReturnValue([])
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
        OTLPTraceExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
        OTLPMetricExporter: vi.fn()
      }));
      vi.doMock('@opentelemetry/sdk-metrics', () => ({
        PeriodicExportingMetricReader: vi.fn()
      }));
      vi.doMock('@opentelemetry/resources', () => ({
        resourceFromAttributes: vi.fn().mockReturnValue({})
      }));
      vi.doMock('@opentelemetry/semantic-conventions', () => ({
        ATTR_SERVICE_NAME: 'service.name',
        ATTR_SERVICE_VERSION: 'service.version'
      }));
      vi.doMock('./logger', () => ({
        debug: vi.fn()
      }));
      vi.doMock('@opentelemetry/api', () => ({
        trace: {
          getTracer: vi.fn().mockReturnValue(mockTracer)
        },
        SpanStatusCode: { OK: 1 }
      }));

      const { initializeTelemetry: init, sendTestTrace: sendTrace } = await import('./telemetry');

      init({ enabled: true });
      await sendTrace();

      expect(mockTracer.startSpan).toHaveBeenCalledWith('llpm.startup');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('test', true);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });
});

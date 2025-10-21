import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { debug as logDebug } from './logger';

// Custom resource attribute for project name (not in standard OTEL semantic conventions)
const ATTR_PROJECT_NAME = 'project.name';

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint?: string;
  sampleRate?: number;
}

let sdk: NodeSDK | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry SDK with configuration
 */
export function initializeTelemetry(config?: Partial<TelemetryConfig>): NodeSDK | null {
  // Check if telemetry is enabled via environment variable or config
  // Defaults to enabled unless explicitly disabled
  const enabled = config?.enabled ?? process.env.LLPM_TELEMETRY_ENABLED !== '0';

  if (!enabled) {
    logDebug('OpenTelemetry disabled - set LLPM_TELEMETRY_ENABLED=1 to re-enable');
    return null;
  }

  if (isInitialized) {
    logDebug('OpenTelemetry SDK already initialized');
    return sdk;
  }

  const serviceName = config?.serviceName ?? 'llpm';
  const serviceVersion = config?.serviceVersion ?? '0.1.0'; // Default version
  const otlpEndpoint = config?.otlpEndpoint ??
                       process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
                       'http://localhost:4318';

  // Check protocol preference (grpc or http/protobuf)
  const protocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL ?? 'http/protobuf';

  logDebug(`Initializing OpenTelemetry SDK for ${serviceName}@${serviceVersion}`);
  logDebug(`OTLP endpoint: ${otlpEndpoint}`);
  logDebug(`OTLP protocol: ${protocol}`);
  logDebug(`Runtime: ${typeof Bun !== 'undefined' ? 'Bun' : 'Node.js'}`);

  // Warning: Auto-instrumentations only work with Node.js
  if (typeof Bun !== 'undefined') {
    logDebug('WARNING: Running in Bun - auto-instrumentations may not work. Use manual tracing with traced() from utils/tracing.ts');
  }

  try {
    // Create resource with service information
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      // Project name for grouping traces (used by Phoenix and other tracing backends)
      [ATTR_PROJECT_NAME]: 'llpm',
      // Phoenix-specific project name attribute
      'phoenix.project.name': 'llpm',
    });

    // Configure trace exporter based on protocol
    const traceExporter = protocol === 'grpc'
      ? new OTLPTraceExporterGRPC({
          url: otlpEndpoint,  // gRPC doesn't need /v1/traces path
        })
      : new OTLPTraceExporterHTTP({
          url: `${otlpEndpoint}/v1/traces`,  // HTTP needs explicit path
        });

    // Configure metrics exporter
    const metricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
      }),
      exportIntervalMillis: 60000, // Export every 60 seconds
    });

    // Initialize the SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();
    isInitialized = true;

    logDebug('OpenTelemetry SDK initialized successfully');

    // Graceful shutdown on process exit
    process.on('SIGTERM', () => {
      shutdownTelemetry()
        .then(() => logDebug('OpenTelemetry SDK shut down successfully'))
        .catch((error) => logDebug('Error shutting down OpenTelemetry SDK:', error));
    });

    return sdk;
  } catch (error) {
    logDebug('Failed to initialize OpenTelemetry SDK:', error);
    return null;
  }
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk && isInitialized) {
    await sdk.shutdown();
    isInitialized = false;
    sdk = null;
    logDebug('OpenTelemetry SDK shut down');
  }
}

/**
 * Get the current SDK instance
 */
export function getTelemetrySDK(): NodeSDK | null {
  return sdk;
}

/**
 * Check if telemetry is initialized
 */
export function isTelemetryInitialized(): boolean {
  return isInitialized;
}

/**
 * Send a test trace to verify connectivity
 */
export async function sendTestTrace(): Promise<void> {
  if (!isInitialized) {
    logDebug('Telemetry not initialized, skipping test trace');
    return;
  }

  const { trace, SpanStatusCode } = await import('@opentelemetry/api');
  const tracer = trace.getTracer('llpm', '0.14.0');

  const span = tracer.startSpan('llpm.startup');
  span.setAttribute('test', true);
  span.setAttribute('runtime', typeof Bun !== 'undefined' ? 'bun' : 'node');
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();

  // Give the SDK time to export the trace
  await new Promise(resolve => setTimeout(resolve, 100));
  logDebug('Test trace sent');
}

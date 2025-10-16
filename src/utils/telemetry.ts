import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { debug as logDebug } from './logger';

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
  const enabled = config?.enabled ?? process.env.LLPM_TELEMETRY_ENABLED === '1';

  if (!enabled) {
    logDebug('OpenTelemetry disabled - set LLPM_TELEMETRY_ENABLED=1 to enable');
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

  logDebug(`Initializing OpenTelemetry SDK for ${serviceName}@${serviceVersion}`);
  logDebug(`OTLP endpoint: ${otlpEndpoint}`);

  try {
    // Create resource with service information
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    });

    // Configure trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
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

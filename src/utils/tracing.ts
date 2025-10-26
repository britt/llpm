import { trace, context, SpanStatusCode, SpanKind, type Span } from '@opentelemetry/api';

const tracer = trace.getTracer('llpm', '0.14.1');

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>;
  parent?: Span;
  kind?: SpanKind; // OpenTelemetry span kind (INTERNAL, SERVER, CLIENT, etc.)
  openInferenceKind?: 'LLM' | 'CHAIN' | 'TOOL' | 'AGENT' | 'RETRIEVER' | 'EMBEDDING'; // Phoenix/OpenInference span kind
}

/**
 * Create and manage a traced operation with automatic context propagation
 */
export async function traced<T>(
  operationName: string,
  options: SpanOptions,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  // Build attributes by merging user attributes with OpenInference kind
  const attributes = { ...options.attributes };
  if (options.openInferenceKind) {
    attributes['openinference.span.kind'] = options.openInferenceKind;
  }

  // Start span with current context (automatically uses active span as parent)
  const span = tracer.startSpan(operationName, {
    kind: options.kind ?? SpanKind.INTERNAL,
    attributes
  });

  // Set this span as active in context for nested operations
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a synchronous traced operation with automatic context propagation
 */
export function tracedSync<T>(
  operationName: string,
  options: SpanOptions,
  operation: (span: Span) => T
): T {
  // Build attributes by merging user attributes with OpenInference kind
  const attributes = { ...options.attributes };
  if (options.openInferenceKind) {
    attributes['openinference.span.kind'] = options.openInferenceKind;
  }

  // Start span with current context (automatically uses active span as parent)
  const span = tracer.startSpan(operationName, {
    kind: options.kind ?? SpanKind.INTERNAL,
    attributes
  });

  // Set this span as active in context for nested operations
  return context.with(trace.setSpan(context.active(), span), () => {
    try {
      const result = operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get the current tracer instance
 */
export function getTracer() {
  return tracer;
}

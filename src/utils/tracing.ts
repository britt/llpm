import { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api';
import { debug as logDebug } from './logger';

const tracer = trace.getTracer('llpm', '0.14.0');

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>;
  parent?: Span;
}

/**
 * Create and manage a traced operation with automatic context propagation
 */
export async function traced<T>(
  operationName: string,
  options: SpanOptions,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  // Start span with current context (automatically uses active span as parent)
  const span = tracer.startSpan(operationName, {
    attributes: options.attributes,
  });

  // Set this span as active in context for nested operations
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      logDebug(`[Trace] Starting span: ${operationName}`);
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      logDebug(`[Trace] Completed span: ${operationName}`);
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      logDebug(`[Trace] Error in span: ${operationName}`, error);
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
  // Start span with current context (automatically uses active span as parent)
  const span = tracer.startSpan(operationName, {
    attributes: options.attributes,
  });

  // Set this span as active in context for nested operations
  return context.with(trace.setSpan(context.active(), span), () => {
    try {
      logDebug(`[Trace] Starting sync span: ${operationName}`);
      const result = operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      logDebug(`[Trace] Completed sync span: ${operationName}`);
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      logDebug(`[Trace] Error in sync span: ${operationName}`, error);
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

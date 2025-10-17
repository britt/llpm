import { trace, context, SpanStatusCode, type Span } from '@opentelemetry/api';
import { debug as logDebug } from './logger';

const tracer = trace.getTracer('llpm', '0.13.0');

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>;
  parent?: Span;
}

/**
 * Create and manage a traced operation
 */
export async function traced<T>(
  operationName: string,
  options: SpanOptions,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(operationName, {
    attributes: options.attributes,
  }, options.parent ? trace.setSpan(context.active(), options.parent) : undefined);

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
}

/**
 * Create a synchronous traced operation
 */
export function tracedSync<T>(
  operationName: string,
  options: SpanOptions,
  operation: (span: Span) => T
): T {
  const span = tracer.startSpan(operationName, {
    attributes: options.attributes,
  }, options.parent ? trace.setSpan(context.active(), options.parent) : undefined);

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
}

/**
 * Get the current tracer instance
 */
export function getTracer() {
  return tracer;
}

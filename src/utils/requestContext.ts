import { AsyncLocalStorage } from 'async_hooks';
import { RequestLogger } from './requestLogger';

export interface RequestContextData {
  requestId: string;
  logger: RequestLogger;
  startTime: number;
  metadata?: Record<string, any>;
}

export class RequestContext {
  private static asyncLocalStorage = new AsyncLocalStorage<RequestContextData>();

  /**
   * Run a function with a new request context
   */
  static async run<T>(
    fn: () => Promise<T> | T,
    requestId?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const logger = new RequestLogger(requestId);
    const context: RequestContextData = {
      requestId: logger.getRequestId(),
      logger,
      startTime: Date.now(),
      metadata
    };

    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Get the current request context
   */
  static get(): RequestContextData | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get the current request logger
   */
  static getLogger(): RequestLogger | undefined {
    const context = this.get();
    return context?.logger;
  }

  /**
   * Get the current request ID
   */
  static getRequestId(): string | undefined {
    const context = this.get();
    return context?.requestId;
  }

  /**
   * Add metadata to the current request context
   */
  static addMetadata(key: string, value: any): void {
    const context = this.get();
    if (context) {
      if (!context.metadata) {
        context.metadata = {};
      }
      context.metadata[key] = value;
    }
  }

  /**
   * Get metadata from the current request context
   */
  static getMetadata(key?: string): any {
    const context = this.get();
    if (!context?.metadata) return undefined;
    
    if (key) {
      return context.metadata[key];
    }
    return context.metadata;
  }

  /**
   * Get the elapsed time since the request started (in ms)
   */
  static getElapsedTime(): number | undefined {
    const context = this.get();
    if (!context) return undefined;
    return Date.now() - context.startTime;
  }

  /**
   * Log a step with the current request logger
   */
  static logStep(
    step: string,
    phase: 'start' | 'end',
    level?: 'error' | 'info' | 'debug' | 'trace',
    metadata?: Record<string, any>
  ): void {
    const logger = this.getLogger();
    if (logger) {
      logger.logStep(step, phase, level || 'info', metadata);
    }
  }

  /**
   * Log an LLM call with the current request logger
   */
  static logLLMCall(
    phase: 'start' | 'end',
    model: string,
    metadata?: {
      tokensIn?: number;
      tokensOut?: number;
      status?: number;
      error?: string;
    }
  ): void {
    const logger = this.getLogger();
    if (logger) {
      logger.logLLMCall(phase, model, metadata);
    }
  }

  /**
   * Log a tool call with the current request logger
   */
  static logToolCall(
    toolName: string,
    phase: 'start' | 'end',
    args?: any,
    result?: any,
    error?: string
  ): void {
    const logger = this.getLogger();
    if (logger) {
      logger.logToolCall(toolName, phase, args, result, error);
    }
  }

  /**
   * Log a database operation with the current request logger
   */
  static logDatabaseOperation(
    operation: string,
    phase: 'start' | 'end',
    metadata?: {
      table?: string;
      rowCount?: number;
      error?: string;
    }
  ): void {
    const logger = this.getLogger();
    if (logger) {
      logger.logDatabaseOperation(operation, phase, metadata);
    }
  }

  /**
   * Log an API call with the current request logger
   */
  static logAPICall(
    service: string,
    phase: 'start' | 'end',
    metadata?: {
      method?: string;
      path?: string;
      status?: number;
      error?: string;
    }
  ): void {
    const logger = this.getLogger();
    if (logger) {
      logger.logAPICall(service, phase, metadata);
    }
  }

  /**
   * Log an error with the current request logger
   */
  static logError(step: string, error: Error | string): void {
    const logger = this.getLogger();
    if (logger) {
      logger.logError(step, error);
    }
  }
}
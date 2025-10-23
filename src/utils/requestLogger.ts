import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export type LogLevel = 'off' | 'error' | 'info' | 'debug' | 'trace';

export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  sampleRate: number;
  piiRedaction: boolean;
  output: 'terminal' | 'file' | 'both';
}

export interface RequestLogEntry {
  timestamp: string;
  requestId: string;
  step: string;
  phase: 'start' | 'end';
  duration?: number;
  metadata?: Record<string, any>;
}

export type { RequestLogEntry as LogEntry };

export class RequestLogger extends EventEmitter {
  private static config: LoggingConfig = {
    enabled: true, // Always enabled for UI display
    level: 'debug', // Show debug level for tool calls
    sampleRate: 1.0, // Always sample for UI display
    piiRedaction: true,
    output: 'terminal'
  };

  private static levelPriority: Record<LogLevel, number> = {
    off: 0,
    error: 1,
    info: 2,
    debug: 3,
    trace: 4
  };

  private requestId: string;
  private stepTimings: Map<string, number> = new Map();
  private shouldLog: boolean;

  constructor(requestId?: string) {
    super();
    this.requestId = requestId || randomUUID();
    this.shouldLog = RequestLogger.config.enabled && Math.random() < RequestLogger.config.sampleRate;
  }

  static configure(config: Partial<LoggingConfig>): void {
    RequestLogger.config = { ...RequestLogger.config, ...config };
  }

  static getConfig(): LoggingConfig {
    return { ...RequestLogger.config };
  }

  getRequestId(): string {
    return this.requestId;
  }

  private shouldLogAtLevel(level: LogLevel): boolean {
    if (!this.shouldLog) return false;
    const configPriority = RequestLogger.levelPriority[RequestLogger.config.level];
    const messagePriority = RequestLogger.levelPriority[level];
    return messagePriority <= configPriority;
  }

  private redactPII(data: any): any {
    if (!RequestLogger.config.piiRedaction) return data;
    
    if (typeof data === 'string') {
      // Redact email addresses
      data = data.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
      
      // Redact common API key patterns
      // OpenAI/Anthropic style keys (sk-...)
      data = data.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED]');
      // GitHub tokens (ghp_...)
      data = data.replace(/ghp_[a-zA-Z0-9]{20,}/g, '[REDACTED]');
      // Generic long alphanumeric strings that could be keys
      data = data.replace(/[a-zA-Z0-9]{40,}/g, '[REDACTED]');
      
      // Redact JWT/Bearer tokens
      data = data.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [TOKEN_REDACTED]');
      data = data.replace(/eyJ[a-zA-Z0-9._-]+/g, '[TOKEN_REDACTED]');
      
      return data;
    }
    
    if (typeof data === 'object' && data !== null) {
      const redacted: any = Array.isArray(data) ? [] : {};
      for (const key in data) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('token') || 
            lowerKey.includes('key') || 
            lowerKey.includes('secret') ||
            lowerKey.includes('password')) {
          redacted[key] = '[REDACTED]';
        } else if (lowerKey.includes('auth')) {
          // Special handling for auth headers - preserve "Bearer " prefix
          const value = data[key];
          if (typeof value === 'string' && value.startsWith('Bearer ')) {
            redacted[key] = 'Bearer [TOKEN_REDACTED]';
          } else {
            redacted[key] = '[REDACTED]';
          }
        } else {
          redacted[key] = this.redactPII(data[key]);
        }
      }
      return redacted;
    }
    
    return data;
  }

  private formatLogEntry(entry: RequestLogEntry): string {
    // Metadata has already been redacted in logStep
    const metadata = entry.metadata || {};
    
    const parts = [
      `[${entry.timestamp}]`,
      `requestId=${entry.requestId}`,
      `STEP=${entry.step}`,
      entry.phase
    ];
    
    if (entry.duration !== undefined) {
      parts.push(`duration=${entry.duration}ms`);
    }
    
    // Add metadata as key=value pairs
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          parts.push(`${key}=${JSON.stringify(value)}`);
        } else {
          parts.push(`${key}=${value}`);
        }
      }
    }
    
    return parts.join(' ');
  }

  private output(message: string, entry: RequestLogEntry): void {
    // Emit event asynchronously for UI display to allow React to render between start/end events
    // This prevents React's automatic batching from combining start and end state updates
    // Skip async in tests to avoid breaking synchronous test assertions
    if (process.env.NODE_ENV === 'test') {
      this.emit('log', entry);
    } else {
      setImmediate(() => {
        this.emit('log', entry);
      });
    }

    // Don't write to stderr anymore - the UI component handles display
    // Only write to stderr if explicitly requested via environment variable
    if (process.env.LLPM_TRACE_STDERR === '1' &&
        (RequestLogger.config.output === 'terminal' || RequestLogger.config.output === 'both')) {
      // Write to stderr to avoid mixing with program output
      process.stderr.write(message + '\n');
    }

    if (RequestLogger.config.output === 'file' || RequestLogger.config.output === 'both') {
      // TODO: Implement file logging with async writes
      // For now, just use terminal output
    }
  }

  logStep(step: string, phase: 'start' | 'end', level: LogLevel = 'info', metadata?: Record<string, any>): void {
    if (!this.shouldLogAtLevel(level)) return;
    
    // Debug to ensure we're actually logging
    if (process.env.DEBUG_LOGGING === '1') {
      console.error(`[DEBUG] Logging step: ${step} ${phase}`);
    }
    
    const timestamp = new Date().toISOString();
    
    if (phase === 'start') {
      this.stepTimings.set(step, Date.now());
    }
    
    let duration: number | undefined;
    if (phase === 'end') {
      const startTime = this.stepTimings.get(step);
      if (startTime) {
        duration = Date.now() - startTime;
        this.stepTimings.delete(step);
      }
    }
    
    // Apply PII redaction to metadata before creating the entry
    const redactedMetadata = metadata ? this.redactPII(metadata) : undefined;
    
    const entry: RequestLogEntry = {
      timestamp,
      requestId: this.requestId,
      step,
      phase,
      duration,
      metadata: redactedMetadata
    };
    
    const message = this.formatLogEntry(entry);
    this.output(message, entry);
  }

  logLLMCall(phase: 'start' | 'end', model: string, metadata?: {
    tokensIn?: number;
    tokensOut?: number;
    status?: number;
    error?: string;
  }): void {
    this.logStep('llm_call', phase, 'info', {
      model,
      ...metadata
    });
  }

  logToolCall(toolName: string, phase: 'start' | 'end', args?: any, result?: any, error?: string): void {
    const metadata: any = { name: toolName };
    
    if (phase === 'start' && args) {
      metadata.args = this.redactPII(args);
    }
    
    if (phase === 'end') {
      if (error) {
        metadata.error = error;
        metadata.status = 'failed';
      } else {
        metadata.status = 'success';
        if (result && typeof result === 'object' && 'length' in result) {
          metadata.resultSize = result.length;
        }
      }
    }
    
    this.logStep('tool_call', phase, 'debug', metadata);
  }

  logDatabaseOperation(operation: string, phase: 'start' | 'end', metadata?: {
    table?: string;
    rowCount?: number;
    error?: string;
  }): void {
    this.logStep(`db_${operation}`, phase, 'debug', metadata);
  }

  logAPICall(service: string, phase: 'start' | 'end', metadata?: {
    method?: string;
    path?: string;
    status?: number;
    error?: string;
  }): void {
    this.logStep(`api_${service}`, phase, 'info', metadata);
  }

  logError(step: string, error: Error | string): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.logStep(step, 'end', 'error', {
      error: errorMessage,
      status: 'failed'
    });
  }
  
  clearLogs(): void {
    this.emit('clear');
  }
}

// Global request logger instance for singleton pattern
let currentRequestLogger: RequestLogger | null = null;

export function createRequestLogger(requestId?: string): RequestLogger {
  currentRequestLogger = new RequestLogger(requestId);
  return currentRequestLogger;
}

export function getCurrentRequestLogger(): RequestLogger | null {
  return currentRequestLogger;
}

export function clearRequestLogger(): void {
  currentRequestLogger = null;
}
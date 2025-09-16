import { randomUUID } from 'crypto';

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

export class RequestLogger {
  private static config: LoggingConfig = {
    enabled: process.env.LLPM_TRACE === '1' || process.env.NODE_ENV === 'development',
    level: 'info',
    sampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
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
      // Redact API keys (common patterns)
      data = data.replace(/[a-zA-Z0-9]{32,}/g, (match) => {
        if (match.length > 40) return '[API_KEY_REDACTED]';
        return match;
      });
      // Redact tokens in headers
      data = data.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [TOKEN_REDACTED]');
      return data;
    }
    
    if (typeof data === 'object' && data !== null) {
      const redacted: any = Array.isArray(data) ? [] : {};
      for (const key in data) {
        if (key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('password')) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactPII(data[key]);
        }
      }
      return redacted;
    }
    
    return data;
  }

  private formatLogEntry(entry: RequestLogEntry): string {
    const metadata = entry.metadata ? this.redactPII(entry.metadata) : {};
    
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

  private output(message: string): void {
    if (RequestLogger.config.output === 'terminal' || RequestLogger.config.output === 'both') {
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
    
    const entry: RequestLogEntry = {
      timestamp,
      requestId: this.requestId,
      step,
      phase,
      duration,
      metadata
    };
    
    const message = this.formatLogEntry(entry);
    this.output(message);
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
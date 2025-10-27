import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RequestLogger, type LoggingConfig, type RequestLogEntry } from './requestLogger';

describe('RequestLogger', () => {
  let logger: RequestLogger;
  let capturedLogs: RequestLogEntry[];

  beforeEach(() => {
    // Capture log events instead of stderr output
    capturedLogs = [];

    // Reset configuration to defaults
    RequestLogger.configure({
      enabled: true,
      level: 'info',
      sampleRate: 1.0,
      piiRedaction: true,
      output: 'terminal'
    });
  });

  afterEach(() => {
    capturedLogs = [];
  });

  // Helper to create logger with event capture
  function createLoggerWithCapture(): RequestLogger {
    const logger = new RequestLogger();
    logger.on('log', (log: RequestLogEntry) => {
      capturedLogs.push(log);
    });
    return logger;
  }

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const logger1 = new RequestLogger();
      const logger2 = new RequestLogger();

      expect(logger1.getRequestId()).toBeTruthy();
      expect(logger2.getRequestId()).toBeTruthy();
      expect(logger1.getRequestId()).not.toBe(logger2.getRequestId());
    });

    it('should use provided request ID when specified', () => {
      const customId = 'custom-request-id-123';
      logger = new RequestLogger(customId);

      expect(logger.getRequestId()).toBe(customId);
    });
  });

  describe('Logging Levels', () => {
    it('should respect logging level configuration', () => {
      RequestLogger.configure({ level: 'error' });
      logger = createLoggerWithCapture();

      logger.logStep('test_step', 'start', 'info');
      expect(capturedLogs.length).toBe(0);

      logger.logStep('error_step', 'start', 'error');
      expect(capturedLogs.length).toBe(1);
    });

    it('should log all levels when set to trace', () => {
      RequestLogger.configure({ level: 'trace' });
      logger = createLoggerWithCapture();

      logger.logStep('error_step', 'start', 'error');
      logger.logStep('info_step', 'start', 'info');
      logger.logStep('debug_step', 'start', 'debug');
      logger.logStep('trace_step', 'start', 'trace');

      expect(capturedLogs.length).toBe(4);
    });
  });

  describe('Step Timing', () => {
    it('should calculate duration for completed steps', async () => {
      logger = createLoggerWithCapture();

      logger.logStep('test_step', 'start');

      // Wait a bit to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 10));

      logger.logStep('test_step', 'end');

      const endLog = capturedLogs.find(log => log.phase === 'end');
      expect(endLog).toBeDefined();
      expect(endLog?.duration).toBeDefined();
      expect(endLog?.duration).toBeGreaterThan(0);
    });

    it('should not include duration for start phase', () => {
      logger = createLoggerWithCapture();

      logger.logStep('test_step', 'start');

      const startLog = capturedLogs[0]!;
      expect(startLog?.duration).toBeUndefined();
    });
  });

  describe('PII Redaction', () => {
    it('should redact email addresses when enabled', () => {
      RequestLogger.configure({ piiRedaction: true });
      logger = createLoggerWithCapture();

      logger.logStep('test', 'start', 'info', {
        user: 'test@example.com',
        data: 'Contact user@domain.org for details'
      });

      const log = capturedLogs[0]!;
      expect(log.metadata?.user).toBe('[EMAIL_REDACTED]');
      expect(log.metadata?.data).toContain('[EMAIL_REDACTED]');
    });

    it('should redact API keys and tokens', () => {
      RequestLogger.configure({ piiRedaction: true });
      logger = createLoggerWithCapture();

      logger.logStep('test', 'start', 'info', {
        apiKey: 'sk-abcdef1234567890abcdef1234567890abcdef12',
        token: 'ghp_1234567890abcdef1234567890abcdef12',
        authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      });

      const log = capturedLogs[0]!;
      expect(log.metadata?.apiKey).toBe('[REDACTED]');
      expect(log.metadata?.token).toBe('[REDACTED]');
      expect(log.metadata?.authHeader).toBe('Bearer [TOKEN_REDACTED]');
    });

    it('should not redact when disabled', () => {
      RequestLogger.configure({ piiRedaction: false });
      logger = createLoggerWithCapture();

      const email = 'test@example.com';
      logger.logStep('test', 'start', 'info', { user: email });

      const log = capturedLogs[0]!;
      expect(log.metadata?.user).toBe(email);
    });
  });

  describe('Sampling', () => {
    it('should respect sample rate', () => {
      // Set sample rate to 0 (never log)
      RequestLogger.configure({ sampleRate: 0 });

      // Create multiple loggers
      let logCount = 0;
      for (let i = 0; i < 10; i++) {
        const logger = new RequestLogger();
        logger.on('log', () => logCount++);
        logger.logStep('test', 'start');
      }

      expect(logCount).toBe(0);
    });

    it('should always log when sample rate is 1', () => {
      RequestLogger.configure({ sampleRate: 1.0 });

      let logCount = 0;
      for (let i = 0; i < 5; i++) {
        const logger = new RequestLogger();
        logger.on('log', () => logCount++);
        logger.logStep('test', 'start');
      }

      expect(logCount).toBe(5);
    });
  });

  describe('LLM Call Logging', () => {
    it('should log LLM calls with metadata', () => {
      RequestLogger.configure({ piiRedaction: false });
      logger = createLoggerWithCapture();

      logger.logLLMCall('start', 'gpt-4');
      logger.logLLMCall('end', 'gpt-4', {
        tokensIn: 100,
        tokensOut: 50,
        status: 200
      });

      const startLog = capturedLogs[0]!;
      const endLog = capturedLogs[1]!;

      expect(startLog.step).toBe('llm_call');
      expect(startLog.metadata?.model).toBe('gpt-4');
      expect(startLog.phase).toBe('start');

      expect(endLog.step).toBe('llm_call');
      expect(endLog.metadata?.model).toBe('gpt-4');
      expect(endLog.phase).toBe('end');
      expect(endLog.metadata?.tokensIn).toBe(100);
      expect(endLog.metadata?.tokensOut).toBe(50);
      expect(endLog.metadata?.status).toBe(200);
    });
  });

  describe('Tool Call Logging', () => {
    it('should log tool calls with args and results', () => {
      RequestLogger.configure({ level: 'debug', piiRedaction: false });
      logger = createLoggerWithCapture();

      logger.logToolCall('test_tool', 'start', { param: 'value' });
      logger.logToolCall('test_tool', 'end', { param: 'value' }, { result: 'success' });

      const startLog = capturedLogs[0]!;
      const endLog = capturedLogs[1]!;

      expect(startLog.step).toBe('tool_call');
      expect(startLog.metadata?.name).toBe('test_tool');
      expect(startLog.phase).toBe('start');

      expect(endLog.step).toBe('tool_call');
      expect(endLog.metadata?.name).toBe('test_tool');
      expect(endLog.phase).toBe('end');
      expect(endLog.metadata?.status).toBe('success');
    });

    it('should log tool errors', () => {
      RequestLogger.configure({ level: 'debug', piiRedaction: false });
      logger = createLoggerWithCapture();

      logger.logToolCall('test_tool', 'end', {}, undefined, 'Tool execution failed');

      const log = capturedLogs[0]!;
      expect(log.metadata?.error).toBe('Tool execution failed');
      expect(log.metadata?.status).toBe('failed');
    });
  });

  describe('Database Operation Logging', () => {
    it('should log database operations', () => {
      RequestLogger.configure({ level: 'debug', piiRedaction: false });
      logger = createLoggerWithCapture();

      logger.logDatabaseOperation('insert', 'start', { table: 'notes' });
      logger.logDatabaseOperation('insert', 'end', { table: 'notes', rowCount: 1 });

      const startLog = capturedLogs[0]!;
      const endLog = capturedLogs[1]!;

      expect(startLog.step).toBe('db_insert');
      expect(startLog.metadata?.table).toBe('notes');

      expect(endLog.step).toBe('db_insert');
      expect(endLog.metadata?.rowCount).toBe(1);
    });
  });

  describe('API Call Logging', () => {
    it('should log API calls', () => {
      logger = createLoggerWithCapture();

      logger.logAPICall('github', 'start', {
        method: 'GET',
        path: '/user/repos'
      });

      logger.logAPICall('github', 'end', {
        method: 'GET',
        path: '/user/repos',
        status: 200
      });

      const startLog = capturedLogs[0]!;
      const endLog = capturedLogs[1]!;

      expect(startLog.step).toBe('api_github');
      expect(startLog.metadata?.method).toBe('GET');
      expect(startLog.metadata?.path).toBe('/user/repos');

      expect(endLog.metadata?.status).toBe(200);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig: Partial<LoggingConfig> = {
        enabled: false,
        level: 'debug',
        sampleRate: 0.5
      };

      RequestLogger.configure(newConfig);
      const config = RequestLogger.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.level).toBe('debug');
      expect(config.sampleRate).toBe(0.5);
    });

    it('should disable logging when configured', () => {
      RequestLogger.configure({ enabled: false });
      logger = createLoggerWithCapture();

      logger.logStep('test', 'start');

      expect(capturedLogs.length).toBe(0);
    });
  });

  describe('Log Format', () => {
    it('should format logs correctly', () => {
      RequestLogger.configure({ piiRedaction: false });
      logger = createLoggerWithCapture();
      const requestId = logger.getRequestId();

      logger.logStep('test_step', 'start', 'info', {
        key1: 'value1',
        key2: 123
      });

      const log = capturedLogs[0]!;

      // Check for timestamp
      expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Check for request ID
      expect(log.requestId).toBe(requestId);

      // Check for step name
      expect(log.step).toBe('test_step');

      // Check for phase
      expect(log.phase).toBe('start');

      // Check for metadata
      expect(log.metadata?.key1).toBe('value1');
      expect(log.metadata?.key2).toBe(123);
    });
  });
});

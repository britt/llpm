import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestLogger } from './requestLogger';
import type { LoggingConfig } from './requestLogger';

describe('RequestLogger', () => {
  let logger: RequestLogger;
  let originalStderrWrite: any;
  let capturedOutput: string[];

  beforeEach(() => {
    // Capture stderr output for testing
    capturedOutput = [];
    originalStderrWrite = process.stderr.write;
    process.stderr.write = vi.fn((str: string) => {
      capturedOutput.push(str);
      return true;
    }) as any;

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
    process.stderr.write = originalStderrWrite;
  });

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
      logger = new RequestLogger();
      
      logger.logStep('test_step', 'start', 'info');
      expect(capturedOutput.length).toBe(0);
      
      logger.logStep('error_step', 'start', 'error');
      expect(capturedOutput.length).toBe(1);
    });

    it('should log all levels when set to trace', () => {
      RequestLogger.configure({ level: 'trace' });
      logger = new RequestLogger();
      
      logger.logStep('error_step', 'start', 'error');
      logger.logStep('info_step', 'start', 'info');
      logger.logStep('debug_step', 'start', 'debug');
      logger.logStep('trace_step', 'start', 'trace');
      
      expect(capturedOutput.length).toBe(4);
    });
  });

  describe('Step Timing', () => {
    it('should calculate duration for completed steps', async () => {
      logger = new RequestLogger();
      
      logger.logStep('test_step', 'start');
      
      // Wait a bit to ensure measurable duration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      logger.logStep('test_step', 'end');
      
      const endLog = capturedOutput.find(log => log.includes('end'));
      expect(endLog).toContain('duration=');
      expect(endLog).toMatch(/duration=\d+ms/);
    });

    it('should not include duration for start phase', () => {
      logger = new RequestLogger();
      
      logger.logStep('test_step', 'start');
      
      const startLog = capturedOutput[0];
      expect(startLog).not.toContain('duration=');
    });
  });

  describe('PII Redaction', () => {
    it('should redact email addresses when enabled', () => {
      RequestLogger.configure({ piiRedaction: true });
      logger = new RequestLogger();
      
      logger.logStep('test', 'start', 'info', {
        user: 'test@example.com',
        data: 'Contact user@domain.org for details'
      });
      
      const log = capturedOutput[0];
      expect(log).toContain('[EMAIL_REDACTED]');
      expect(log).not.toContain('test@example.com');
      expect(log).not.toContain('user@domain.org');
    });

    it('should redact API keys and tokens', () => {
      RequestLogger.configure({ piiRedaction: true });
      logger = new RequestLogger();
      
      logger.logStep('test', 'start', 'info', {
        apiKey: 'sk-abcdef1234567890abcdef1234567890abcdef12',
        token: 'ghp_1234567890abcdef1234567890abcdef12',
        authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      });
      
      const log = capturedOutput[0];
      expect(log).toContain('apiKey=[REDACTED]');
      expect(log).toContain('token=[REDACTED]');
      expect(log).toContain('Bearer [TOKEN_REDACTED]');
    });

    it('should not redact when disabled', () => {
      RequestLogger.configure({ piiRedaction: false });
      logger = new RequestLogger();
      
      const email = 'test@example.com';
      logger.logStep('test', 'start', 'info', { user: email });
      
      const log = capturedOutput[0];
      expect(log).toContain(email);
      expect(log).not.toContain('[EMAIL_REDACTED]');
    });
  });

  describe('Sampling', () => {
    it('should respect sample rate', () => {
      // Set sample rate to 0 (never log)
      RequestLogger.configure({ sampleRate: 0 });
      
      // Create multiple loggers
      for (let i = 0; i < 10; i++) {
        const logger = new RequestLogger();
        logger.logStep('test', 'start');
      }
      
      expect(capturedOutput.length).toBe(0);
    });

    it('should always log when sample rate is 1', () => {
      RequestLogger.configure({ sampleRate: 1.0 });
      
      for (let i = 0; i < 5; i++) {
        const logger = new RequestLogger();
        logger.logStep('test', 'start');
      }
      
      expect(capturedOutput.length).toBe(5);
    });
  });

  describe('LLM Call Logging', () => {
    it('should log LLM calls with metadata', () => {
      RequestLogger.configure({ piiRedaction: false });
      logger = new RequestLogger();
      
      logger.logLLMCall('start', 'gpt-4');
      logger.logLLMCall('end', 'gpt-4', {
        tokensIn: 100,
        tokensOut: 50,
        status: 200
      });
      
      const startLog = capturedOutput[0];
      const endLog = capturedOutput[1];
      
      expect(startLog).toContain('STEP=llm_call');
      expect(startLog).toContain('model=gpt-4');
      expect(startLog).toContain('start');
      
      expect(endLog).toContain('STEP=llm_call');
      expect(endLog).toContain('model=gpt-4');
      expect(endLog).toContain('end');
      expect(endLog).toContain('tokensIn=100');
      expect(endLog).toContain('tokensOut=50');
      expect(endLog).toContain('status=200');
    });
  });

  describe('Tool Call Logging', () => {
    it('should log tool calls with args and results', () => {
      RequestLogger.configure({ level: 'debug', piiRedaction: false });
      logger = new RequestLogger();
      
      logger.logToolCall('test_tool', 'start', { param: 'value' });
      logger.logToolCall('test_tool', 'end', { param: 'value' }, { result: 'success' });
      
      const startLog = capturedOutput[0];
      const endLog = capturedOutput[1];
      
      expect(startLog).toContain('STEP=tool_call');
      expect(startLog).toContain('name=test_tool');
      expect(startLog).toContain('start');
      
      expect(endLog).toContain('STEP=tool_call');
      expect(endLog).toContain('name=test_tool');
      expect(endLog).toContain('end');
      expect(endLog).toContain('status=success');
    });

    it('should log tool errors', () => {
      RequestLogger.configure({ level: 'debug', piiRedaction: false });
      logger = new RequestLogger();
      
      logger.logToolCall('test_tool', 'end', {}, undefined, 'Tool execution failed');
      
      const log = capturedOutput[0];
      expect(log).toContain('error=Tool execution failed');
      expect(log).toContain('status=failed');
    });
  });

  describe('Database Operation Logging', () => {
    it('should log database operations', () => {
      RequestLogger.configure({ level: 'debug', piiRedaction: false });
      logger = new RequestLogger();
      
      logger.logDatabaseOperation('insert', 'start', { table: 'notes' });
      logger.logDatabaseOperation('insert', 'end', { table: 'notes', rowCount: 1 });
      
      const startLog = capturedOutput[0];
      const endLog = capturedOutput[1];
      
      expect(startLog).toContain('STEP=db_insert');
      expect(startLog).toContain('table=notes');
      
      expect(endLog).toContain('STEP=db_insert');
      expect(endLog).toContain('rowCount=1');
    });
  });

  describe('API Call Logging', () => {
    it('should log API calls', () => {
      logger = new RequestLogger();
      
      logger.logAPICall('github', 'start', {
        method: 'GET',
        path: '/user/repos'
      });
      
      logger.logAPICall('github', 'end', {
        method: 'GET',
        path: '/user/repos',
        status: 200
      });
      
      const startLog = capturedOutput[0];
      const endLog = capturedOutput[1];
      
      expect(startLog).toContain('STEP=api_github');
      expect(startLog).toContain('method=GET');
      expect(startLog).toContain('path=/user/repos');
      
      expect(endLog).toContain('status=200');
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
      logger = new RequestLogger();
      
      logger.logStep('test', 'start');
      
      expect(capturedOutput.length).toBe(0);
    });
  });

  describe('Log Format', () => {
    it('should format logs correctly', () => {
      RequestLogger.configure({ piiRedaction: false });
      logger = new RequestLogger();
      const requestId = logger.getRequestId();
      
      logger.logStep('test_step', 'start', 'info', {
        key1: 'value1',
        key2: 123
      });
      
      const log = capturedOutput[0];
      
      // Check for timestamp
      expect(log).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      
      // Check for request ID
      expect(log).toContain(`requestId=${requestId}`);
      
      // Check for step name
      expect(log).toContain('STEP=test_step');
      
      // Check for phase
      expect(log).toContain('start');
      
      // Check for metadata
      expect(log).toContain('key1=value1');
      expect(log).toContain('key2=123');
    });
  });
});
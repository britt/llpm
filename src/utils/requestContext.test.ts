import { describe, it, expect, beforeEach } from 'vitest';
import { RequestContext } from './requestContext';
import { RequestLogger } from './requestLogger';

describe('RequestContext', () => {
  let capturedLogs: any[];

  beforeEach(() => {
    // Capture log events instead of stderr output
    capturedLogs = [];

    // Configure logger for testing
    RequestLogger.configure({
      enabled: true,
      level: 'trace',
      sampleRate: 1.0,
      piiRedaction: false,
      output: 'terminal'
    });
  });

  describe('Context Management', () => {
    it('should create and access request context', async () => {
      await RequestContext.run(async () => {
        const context = RequestContext.get();
        expect(context).toBeDefined();
        expect(context?.requestId).toBeTruthy();
        expect(context?.logger).toBeInstanceOf(RequestLogger);
      });
    });

    it('should isolate context between runs', async () => {
      let requestId1: string | undefined;
      let requestId2: string | undefined;

      await RequestContext.run(async () => {
        requestId1 = RequestContext.getRequestId();
      });

      await RequestContext.run(async () => {
        requestId2 = RequestContext.getRequestId();
      });

      expect(requestId1).toBeTruthy();
      expect(requestId2).toBeTruthy();
      expect(requestId1).not.toBe(requestId2);
    });

    it('should handle nested async operations', async () => {
      await RequestContext.run(async () => {
        const outerRequestId = RequestContext.getRequestId();

        await Promise.all([
          (async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            const innerRequestId1 = RequestContext.getRequestId();
            expect(innerRequestId1).toBe(outerRequestId);
          })(),
          (async () => {
            await new Promise(resolve => setTimeout(resolve, 5));
            const innerRequestId2 = RequestContext.getRequestId();
            expect(innerRequestId2).toBe(outerRequestId);
          })()
        ]);
      });
    });

    it('should return undefined when no context exists', () => {
      const context = RequestContext.get();
      expect(context).toBeUndefined();

      const requestId = RequestContext.getRequestId();
      expect(requestId).toBeUndefined();

      const logger = RequestContext.getLogger();
      expect(logger).toBeUndefined();
    });
  });

  describe('Metadata Management', () => {
    it('should add and retrieve metadata', async () => {
      await RequestContext.run(async () => {
        RequestContext.addMetadata('userId', '123');
        RequestContext.addMetadata('action', 'test');

        const userId = RequestContext.getMetadata('userId');
        const action = RequestContext.getMetadata('action');

        expect(userId).toBe('123');
        expect(action).toBe('test');
      });
    });

    it('should retrieve all metadata', async () => {
      await RequestContext.run(async () => {
        RequestContext.addMetadata('key1', 'value1');
        RequestContext.addMetadata('key2', 'value2');

        const metadata = RequestContext.getMetadata();

        expect(metadata).toEqual({
          key1: 'value1',
          key2: 'value2'
        });
      });
    });

    it('should handle metadata when no context exists', () => {
      RequestContext.addMetadata('test', 'value');
      const metadata = RequestContext.getMetadata();
      expect(metadata).toBeUndefined();
    });

    it('should pass initial metadata to context', async () => {
      const initialMetadata = {
        source: 'test',
        version: '1.0'
      };

      await RequestContext.run(
        async () => {
          const metadata = RequestContext.getMetadata();
          expect(metadata).toEqual(initialMetadata);
        },
        undefined,
        initialMetadata
      );
    });
  });

  describe('Elapsed Time', () => {
    it('should track elapsed time', async () => {
      await RequestContext.run(async () => {
        const elapsed1 = RequestContext.getElapsedTime();
        expect(elapsed1).toBeDefined();
        expect(elapsed1).toBeGreaterThanOrEqual(0);

        await new Promise(resolve => setTimeout(resolve, 50));

        const elapsed2 = RequestContext.getElapsedTime();
        expect(elapsed2).toBeDefined();
        // Allow some timer imprecision - expect at least 45ms when sleeping 50ms
        expect(elapsed2).toBeGreaterThanOrEqual(45);
      });
    });

    it('should return undefined when no context exists', () => {
      const elapsed = RequestContext.getElapsedTime();
      expect(elapsed).toBeUndefined();
    });
  });

  describe('Logging Methods', () => {
    it('should delegate logStep to logger', async () => {
      await RequestContext.run(async () => {
        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logStep('test_step', 'start', 'info', { data: 'test' });

        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.step).toBe('test_step');
        expect(log.phase).toBe('start');
        expect(log.metadata?.data).toBe('test');
      });
    });

    it('should delegate logLLMCall to logger', async () => {
      await RequestContext.run(async () => {
        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logLLMCall('start', 'gpt-4', { tokensIn: 100 });

        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.step).toBe('llm_call');
        expect(log.metadata?.model).toBe('gpt-4');
        expect(log.metadata?.tokensIn).toBe(100);
      });
    });

    it('should delegate logToolCall to logger', async () => {
      await RequestContext.run(async () => {
        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logToolCall('my_tool', 'start', { param: 'value' });

        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.step).toBe('tool_call');
        expect(log.metadata?.name).toBe('my_tool');
      });
    });

    it('should delegate logDatabaseOperation to logger', async () => {
      await RequestContext.run(async () => {
        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logDatabaseOperation('select', 'start', { table: 'users' });

        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.step).toBe('db_select');
        expect(log.metadata?.table).toBe('users');
      });
    });

    it('should delegate logAPICall to logger', async () => {
      await RequestContext.run(async () => {
        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logAPICall('github', 'start', {
          method: 'POST',
          path: '/repos'
        });

        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.step).toBe('api_github');
        expect(log.metadata?.method).toBe('POST');
        expect(log.metadata?.path).toBe('/repos');
      });
    });

    it('should delegate logError to logger', async () => {
      await RequestContext.run(async () => {
        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logError('processing', new Error('Test error'));

        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.step).toBe('processing');
        expect(log.metadata?.error).toBe('Test error');
        expect(log.metadata?.status).toBe('failed');
      });
    });

    it('should handle logging when no context exists', () => {
      // These should not throw errors
      RequestContext.logStep('test', 'start');
      RequestContext.logLLMCall('start', 'model');
      RequestContext.logToolCall('tool', 'start');
      RequestContext.logDatabaseOperation('insert', 'start');
      RequestContext.logAPICall('service', 'start');
      RequestContext.logError('step', 'error');

      // No logs should be produced since no logger is attached
      expect(capturedLogs.length).toBe(0);
    });
  });

  describe('Custom Request ID', () => {
    it('should use provided request ID', async () => {
      const customId = 'custom-id-123';

      await RequestContext.run(async () => {
        const requestId = RequestContext.getRequestId();
        expect(requestId).toBe(customId);

        const logger = RequestContext.getLogger();
        logger?.on('log', (log: any) => capturedLogs.push(log));

        RequestContext.logStep('test', 'start');
        expect(capturedLogs.length).toBeGreaterThan(0);
        const log = capturedLogs[0];
        expect(log.requestId).toBe(customId);
      }, customId);
    });
  });

  describe('Integration with AsyncLocalStorage', () => {
    it('should maintain context across async boundaries', async () => {
      await RequestContext.run(async () => {
        const requestId = RequestContext.getRequestId();

        // Test with setTimeout
        await new Promise<void>(resolve => {
          setTimeout(() => {
            const timeoutRequestId = RequestContext.getRequestId();
            expect(timeoutRequestId).toBe(requestId);
            resolve();
          }, 10);
        });

        // Test with Promise.resolve
        await Promise.resolve().then(() => {
          const promiseRequestId = RequestContext.getRequestId();
          expect(promiseRequestId).toBe(requestId);
        });

        // Test with async/await
        const asyncFunction = async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return RequestContext.getRequestId();
        };

        const asyncRequestId = await asyncFunction();
        expect(asyncRequestId).toBe(requestId);
      });
    });

    it('should not leak context between concurrent operations', async () => {
      const results = await Promise.all([
        RequestContext.run(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return RequestContext.getRequestId();
        }, 'context-1'),

        RequestContext.run(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return RequestContext.getRequestId();
        }, 'context-2'),

        RequestContext.run(async () => {
          await new Promise(resolve => setTimeout(resolve, 15));
          return RequestContext.getRequestId();
        }, 'context-3')
      ]);

      expect(results[0]).toBe('context-1');
      expect(results[1]).toBe('context-2');
      expect(results[2]).toBe('context-3');
    });
  });
});

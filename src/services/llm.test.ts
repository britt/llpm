import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateResponse, streamResponse } from './llm';
import type { Message } from '../types';

// Mock all dependencies
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  stepCountIs: vi.fn(() => () => false)
}));

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  getVerbose: vi.fn(() => false)
}));

vi.mock('../tools/registry', () => ({
  getToolRegistry: vi.fn(() => Promise.resolve({
    testTool: { description: 'Test tool' }
  }))
}));

vi.mock('../utils/systemPrompt', () => ({
  getSystemPrompt: vi.fn(() => Promise.resolve('System prompt content'))
}));

vi.mock('./modelRegistry', () => ({
  modelRegistry: {
    createLanguageModel: vi.fn(() => Promise.resolve({})),
    getCurrentModel: vi.fn(() => ({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini'
    }))
  }
}));

vi.mock('../utils/requestContext', () => ({
  RequestContext: {
    logLLMCall: vi.fn()
  }
}));

vi.mock('../utils/tracing', () => ({
  traced: vi.fn(async (_name, _opts, fn) => {
    const mockSpan = {
      setAttribute: vi.fn()
    };
    return fn(mockSpan);
  }),
  getTracer: vi.fn(() => null)
}));

describe('llm service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate a response successfully', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Hello, how can I help you?',
        steps: [],
        usage: {
          promptTokens: 100,
          completionTokens: 50
        }
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toBe('Hello, how can I help you?');
      expect(result.selectedSkills).toEqual([]);
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should filter out ui-notification messages', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Response text',
        steps: []
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'ui-notification' as any, content: 'UI notification' },
        { role: 'assistant', content: 'Hi there' }
      ];

      await generateResponse(messages);

      const callArgs = mockGenerateText.mock.calls[0][0] as any;
      // Should have system message + 2 conversation messages (ui-notification filtered)
      expect(callArgs.messages).toHaveLength(3);
    });

    it('should collect tool calls from steps', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Done',
        steps: [
          {
            toolCalls: [{ toolName: 'testTool', args: {} }],
            toolResults: [{ output: 'result' }]
          },
          {
            toolCalls: [{ toolName: 'anotherTool', args: {} }],
            toolResults: [{ output: 'another result' }]
          }
        ]
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Run tools' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toBe('Done');
    });

    it('should prepend user messages from tool results', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Final response',
        steps: [
          {
            toolCalls: [{ toolName: 'testTool', args: {} }],
            toolResults: [{ output: { userMessage: 'Important notice!' } }]
          }
        ]
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Run tool' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toContain('Important notice!');
      expect(result.response).toContain('Final response');
    });

    it('should handle multiple user messages from tool results', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Final response',
        steps: [
          {
            toolCalls: [],
            toolResults: [
              { output: { userMessage: 'Message 1' } },
              { output: { userMessage: 'Message 2' } }
            ]
          }
        ]
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Run tool' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toContain('Message 1');
      expect(result.response).toContain('Message 2');
      expect(result.response).toContain('---'); // Separator
    });

    it('should log LLM calls with request context', async () => {
      const { generateText } = await import('ai');
      const { RequestContext } = await import('../utils/requestContext');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: [],
        usage: { promptTokens: 100, completionTokens: 50 }
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await generateResponse(messages);

      expect(RequestContext.logLLMCall).toHaveBeenCalledWith('start', 'openai/gpt-4o-mini');
      expect(RequestContext.logLLMCall).toHaveBeenCalledWith(
        'end',
        'openai/gpt-4o-mini',
        expect.objectContaining({ status: 200 })
      );
    });

    it('should handle errors and rethrow', async () => {
      const { generateText } = await import('ai');
      const { RequestContext } = await import('../utils/requestContext');
      const mockGenerateText = vi.mocked(generateText);

      const testError = new Error('API error');
      mockGenerateText.mockRejectedValue(testError);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(generateResponse(messages)).rejects.toThrow('API error');
      expect(RequestContext.logLLMCall).toHaveBeenCalledWith(
        'end',
        'openai/gpt-4o-mini',
        expect.objectContaining({ error: expect.stringContaining('API error') })
      );
    });

    it('should handle errors with additional properties', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      const testError = new Error('API error') as any;
      testError.cause = { reason: 'Rate limited' };
      testError.statusCode = 429;
      testError.responseBody = { error: 'Too many requests' };
      mockGenerateText.mockRejectedValue(testError);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(generateResponse(messages)).rejects.toThrow('API error');
    });

    it('should pass tools to generateText', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: []
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      await generateResponse(messages);

      const callArgs = mockGenerateText.mock.calls[0][0] as any;
      expect(callArgs.tools).toHaveProperty('testTool');
      expect(callArgs.toolChoice).toBe('auto');
    });

    it('should handle empty steps array', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Simple response',
        steps: []
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toBe('Simple response');
    });

    it('should handle missing usage data', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: []
        // No usage data
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toBe('Response');
    });

    it('should handle tool results without userMessage', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: [
          {
            toolCalls: [{ toolName: 'test', args: {} }],
            toolResults: [{ output: { data: 'some data' } }]
          }
        ]
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = await generateResponse(messages);

      // Should not prepend anything since there's no userMessage
      expect(result.response).toBe('Response');
    });

    it('should handle tool results with primitive output', async () => {
      const { generateText } = await import('ai');
      const mockGenerateText = vi.mocked(generateText);

      mockGenerateText.mockResolvedValue({
        text: 'Response',
        steps: [
          {
            toolCalls: [{ toolName: 'test', args: {} }],
            toolResults: [{ output: 'string result' }]
          }
        ]
      } as any);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const result = await generateResponse(messages);

      expect(result.response).toBe('Response');
    });
  });

  describe('streamResponse', () => {
    it('should stream response chunks', async () => {
      const { streamText } = await import('ai');
      const mockStreamText = vi.mocked(streamText);

      const chunks = ['Hello', ' ', 'World'];
      mockStreamText.mockResolvedValue({
        textStream: (async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        })()
      } as any);

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const collected: string[] = [];

      for await (const chunk of streamResponse(messages)) {
        collected.push(chunk);
      }

      expect(collected).toEqual(['Hello', ' ', 'World']);
    });

    it('should log LLM calls for streaming', async () => {
      const { streamText } = await import('ai');
      const { RequestContext } = await import('../utils/requestContext');
      const mockStreamText = vi.mocked(streamText);

      mockStreamText.mockResolvedValue({
        textStream: (async function* () {
          yield 'chunk';
        })()
      } as any);

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      for await (const _chunk of streamResponse(messages)) {
        // consume stream
      }

      expect(RequestContext.logLLMCall).toHaveBeenCalledWith('start', 'openai/gpt-4o-mini');
      expect(RequestContext.logLLMCall).toHaveBeenCalledWith(
        'end',
        'openai/gpt-4o-mini',
        { status: 200 }
      );
    });

    it('should handle streaming errors', async () => {
      const { streamText } = await import('ai');
      const { RequestContext } = await import('../utils/requestContext');
      const mockStreamText = vi.mocked(streamText);

      mockStreamText.mockRejectedValue(new Error('Stream error'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const collected: string[] = [];

      for await (const chunk of streamResponse(messages)) {
        collected.push(chunk);
      }

      // Should yield error message
      expect(collected.length).toBe(1);
      expect(collected[0]).toContain('Sorry, I encountered an error');
      expect(RequestContext.logLLMCall).toHaveBeenCalledWith(
        'end',
        'openai/gpt-4o-mini',
        { error: 'Stream error' }
      );
    });

    it('should show verbose error details when enabled', async () => {
      const { streamText } = await import('ai');
      const { getVerbose } = await import('../utils/logger');
      const mockStreamText = vi.mocked(streamText);
      const mockGetVerbose = vi.mocked(getVerbose);

      mockGetVerbose.mockReturnValue(true);

      const testError = new Error('Detailed error');
      testError.stack = 'Error: Detailed error\n    at test.ts:1:1';
      mockStreamText.mockRejectedValue(testError);

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const collected: string[] = [];

      for await (const chunk of streamResponse(messages)) {
        collected.push(chunk);
      }

      expect(collected[0]).toContain('Debug Details');
      expect(collected[0]).toContain('Detailed error');
      expect(collected[0]).toContain('Stack trace');
    });

    it('should handle non-Error thrown values', async () => {
      const { streamText } = await import('ai');
      const mockStreamText = vi.mocked(streamText);

      mockStreamText.mockRejectedValue('String error');

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const collected: string[] = [];

      for await (const chunk of streamResponse(messages)) {
        collected.push(chunk);
      }

      expect(collected[0]).toContain('Sorry, I encountered an error');
    });
  });
});

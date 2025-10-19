import { describe, it, expect, vi } from 'vitest';
import { mockGenerateText, mockStreamText } from './ai-sdk';

describe('AI SDK Mocks', () => {
  describe('mockGenerateText', () => {
    it('should return a mock with default response', async () => {
      const mock = mockGenerateText('Hello, world!');

      const result = await mock();

      expect(result).toEqual({
        text: 'Hello, world!',
        toolCalls: [],
        finishReason: 'stop',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      });
    });

    it('should support custom tool calls', async () => {
      const toolCalls = [
        {
          type: 'tool-call' as const,
          toolCallId: 'call_123',
          toolName: 'test_tool',
          args: { param: 'value' }
        }
      ];

      const mock = mockGenerateText('Response with tools', { toolCalls });

      const result = await mock();

      expect(result.text).toBe('Response with tools');
      expect(result.toolCalls).toEqual(toolCalls);
    });

    it('should support custom finish reason', async () => {
      const mock = mockGenerateText('Stopped early', { finishReason: 'length' });

      const result = await mock();

      expect(result.finishReason).toBe('length');
    });

    it('should support custom usage stats', async () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300
      };

      const mock = mockGenerateText('Custom usage', { usage });

      const result = await mock();

      expect(result.usage).toEqual(usage);
    });

    it('should be a vi.fn() mock', () => {
      const mock = mockGenerateText('Test');

      expect(vi.isMockFunction(mock)).toBe(true);
    });
  });

  describe('mockStreamText', () => {
    it('should return a mock with async iterable text stream', async () => {
      const mock = mockStreamText('Hello, world!');

      const result = await mock();

      // Collect streamed text
      const chunks: string[] = [];
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      expect(chunks.join('')).toBe('Hello, world!');
    });

    it('should stream text in configurable chunks', async () => {
      const mock = mockStreamText('Hello, world!', { chunkSize: 5 });

      const result = await mock();

      // Collect chunks
      const chunks: string[] = [];
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      // Should be split into chunks of 5
      expect(chunks).toEqual(['Hello', ', wor', 'ld!']);
    });

    it('should support tool calls in stream', async () => {
      const toolCalls = [
        {
          type: 'tool-call' as const,
          toolCallId: 'call_456',
          toolName: 'stream_tool',
          args: { data: 'streaming' }
        }
      ];

      const mock = mockStreamText('Streaming response', { toolCalls });

      const result = await mock();

      // Tool calls should be available
      expect(result.toolCalls).toEqual(toolCalls);
    });

    it('should support custom finish reason', async () => {
      const mock = mockStreamText('Streaming text', { finishReason: 'stop' });

      const result = await mock();

      expect(result.finishReason).toBe('stop');
    });

    it('should support custom usage stats', async () => {
      const usage = {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150
      };

      const mock = mockStreamText('Streaming', { usage });

      const result = await mock();

      expect(result.usage).toEqual(usage);
    });

    it('should be a vi.fn() mock', () => {
      const mock = mockStreamText('Test');

      expect(vi.isMockFunction(mock)).toBe(true);
    });
  });
});

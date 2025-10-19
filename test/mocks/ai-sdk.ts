import { vi } from 'vitest';

export interface MockGenerateTextOptions {
  toolCalls?: Array<{
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MockStreamTextOptions {
  toolCalls?: Array<{
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  chunkSize?: number;
}

/**
 * Creates a mock for AI SDK's generateText function.
 *
 * @param text - The text response to return
 * @param options - Optional configuration for tool calls, finish reason, and usage
 * @returns A Vitest mock function that resolves to a generateText result
 *
 * @example
 * ```typescript
 * const mockGenerate = mockGenerateText('Hello!', {
 *   toolCalls: [{ type: 'tool-call', toolCallId: '1', toolName: 'test', args: {} }]
 * });
 * vi.mocked(generateText).mockImplementation(mockGenerate);
 * ```
 */
export function mockGenerateText(text: string, options: MockGenerateTextOptions = {}) {
  return vi.fn().mockResolvedValue({
    text,
    toolCalls: options.toolCalls || [],
    finishReason: options.finishReason || 'stop',
    usage: options.usage || {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30
    }
  });
}

/**
 * Creates a mock for AI SDK's streamText function.
 *
 * @param text - The text to stream
 * @param options - Optional configuration for tool calls, finish reason, usage, and chunk size
 * @returns A Vitest mock function that resolves to a streamText result with async iterable
 *
 * @example
 * ```typescript
 * const mockStream = mockStreamText('Hello, world!', { chunkSize: 5 });
 * vi.mocked(streamText).mockImplementation(mockStream);
 *
 * const result = await streamText(...);
 * for await (const chunk of result.textStream) {
 *   console.log(chunk); // 'Hello', ', wor', 'ld!'
 * }
 * ```
 */
export function mockStreamText(text: string, options: MockStreamTextOptions = {}) {
  const chunkSize = options.chunkSize || text.length; // Default to entire text as one chunk

  // Create async iterable for text streaming
  async function* textStreamGenerator() {
    for (let i = 0; i < text.length; i += chunkSize) {
      yield text.slice(i, i + chunkSize);
    }
  }

  return vi.fn().mockResolvedValue({
    textStream: textStreamGenerator(),
    toolCalls: options.toolCalls || [],
    finishReason: options.finishReason || 'stop',
    usage: options.usage || {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30
    }
  });
}

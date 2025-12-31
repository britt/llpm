import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as z from 'zod';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

vi.mock('../utils/requestContext', () => ({
  RequestContext: {
    logToolCall: vi.fn()
  }
}));

vi.mock('../utils/tracing', () => ({
  traced: vi.fn((name, options, fn) => {
    // Create a mock span
    const mockSpan = {
      setAttribute: vi.fn()
    };
    return fn(mockSpan);
  })
}));

vi.mock('ai', () => ({
  tool: vi.fn((config) => config)
}));

import { tool } from './instrumentedTool';
import { RequestContext } from '../utils/requestContext';
import { traced } from '../utils/tracing';
import { tool as baseTool } from 'ai';

describe('instrumentedTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool wrapper', () => {
    it('should wrap a tool with logging and tracing', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ success: true, data: 'test' });

      const testTool = tool({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: z.object({
          param: z.string()
        }),
        execute: mockExecute
      });

      expect(baseTool).toHaveBeenCalled();
    });

    it('should auto-generate tool name from description if not provided', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ success: true });

      tool({
        description: 'A long description for the tool',
        inputSchema: z.object({}),
        execute: mockExecute
      });

      expect(baseTool).toHaveBeenCalledWith(expect.objectContaining({
        description: 'A long description for the tool'
      }));
    });

    it('should log tool call start and end on success', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ success: true, value: 42 });

      const testTool = tool({
        name: 'logging_tool',
        description: 'A tool that logs',
        inputSchema: z.object({ input: z.string() }),
        execute: mockExecute
      });

      // Execute the wrapped function
      const wrappedConfig = vi.mocked(baseTool).mock.calls[0][0];
      await wrappedConfig.execute({ input: 'test' });

      expect(RequestContext.logToolCall).toHaveBeenCalledWith(
        'logging_tool',
        'start',
        { input: 'test' }
      );
      expect(RequestContext.logToolCall).toHaveBeenCalledWith(
        'logging_tool',
        'end',
        { input: 'test' },
        { success: true, value: 42 }
      );
    });

    it('should add result metadata to span', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ success: true });

      tool({
        name: 'span_tool',
        description: 'A tool with span metadata',
        inputSchema: z.object({}),
        execute: mockExecute
      });

      const wrappedConfig = vi.mocked(baseTool).mock.calls[0][0];
      await wrappedConfig.execute({});

      expect(traced).toHaveBeenCalledWith(
        'tool.span_tool',
        expect.objectContaining({
          openInferenceKind: 'TOOL'
        }),
        expect.any(Function)
      );
    });

    it('should handle errors and log them', async () => {
      const mockError = new Error('Tool execution failed');
      const mockExecute = vi.fn().mockRejectedValue(mockError);

      tool({
        name: 'error_tool',
        description: 'A tool that throws',
        inputSchema: z.object({}),
        execute: mockExecute
      });

      const wrappedConfig = vi.mocked(baseTool).mock.calls[0][0];

      await expect(wrappedConfig.execute({})).rejects.toThrow('Tool execution failed');

      expect(RequestContext.logToolCall).toHaveBeenCalledWith(
        'error_tool',
        'end',
        {},
        undefined,
        'Tool execution failed'
      );
    });

    it('should handle non-Error thrown values', async () => {
      const mockExecute = vi.fn().mockRejectedValue('string error');

      tool({
        name: 'string_error_tool',
        description: 'A tool that throws a string',
        inputSchema: z.object({}),
        execute: mockExecute
      });

      const wrappedConfig = vi.mocked(baseTool).mock.calls[0][0];

      await expect(wrappedConfig.execute({})).rejects.toBe('string error');

      expect(RequestContext.logToolCall).toHaveBeenCalledWith(
        'string_error_tool',
        'end',
        {},
        undefined,
        'string error'
      );
    });

    it('should record error in result when present', async () => {
      const mockSpan = { setAttribute: vi.fn() };
      vi.mocked(traced).mockImplementation((name, options, fn) => fn(mockSpan as any));

      const mockExecute = vi.fn().mockResolvedValue({ success: false, error: 'Something went wrong' });

      tool({
        name: 'error_result_tool',
        description: 'A tool with error result',
        inputSchema: z.object({}),
        execute: mockExecute
      });

      const wrappedConfig = vi.mocked(baseTool).mock.calls[0][0];
      await wrappedConfig.execute({});

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('tool.success', false);
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('tool.error', 'Something went wrong');
    });
  });
});

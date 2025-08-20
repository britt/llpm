import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSystemPromptTool } from './systemTools';
import * as systemPrompt from '../utils/systemPrompt';

describe('systemTools', () => {
  beforeEach(() => {
    // Setup DOM environment
    if (typeof (global as any).document === 'undefined') {
      const { Window } = require('happy-dom');
      const window = new Window({ url: 'http://localhost' });
      (global as any).window = window;
      (global as any).document = window.document;
      (global as any).navigator = window.navigator;
      (global as any).HTMLElement = window.HTMLElement;
    }
  });

  describe('getSystemPromptTool', () => {
    it('should return success with prompt when getSystemPrompt succeeds', async () => {
      const mockPrompt = 'Test system prompt content';
      const getSystemPromptSpy = vi.spyOn(systemPrompt, 'getSystemPrompt')
        .mockResolvedValueOnce(mockPrompt);

      const result = await getSystemPromptTool.execute!({}, {} as any);

      expect(getSystemPromptSpy).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        prompt: mockPrompt,
        message: 'Successfully retrieved system prompt'
      });

      getSystemPromptSpy.mockRestore();
    });

    it('should return error when getSystemPrompt fails', async () => {
      const mockError = new Error('Failed to read system prompt');
      const getSystemPromptSpy = vi.spyOn(systemPrompt, 'getSystemPrompt')
        .mockRejectedValueOnce(mockError);

      const result = await getSystemPromptTool.execute!({}, {} as any);

      expect(getSystemPromptSpy).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: false,
        error: 'Failed to read system prompt'
      });

      getSystemPromptSpy.mockRestore();
    });

    it('should handle unknown error types', async () => {
      const getSystemPromptSpy = vi.spyOn(systemPrompt, 'getSystemPrompt')
        .mockRejectedValueOnce('String error');

      const result = await getSystemPromptTool.execute!({}, {} as any);

      expect(getSystemPromptSpy).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: false,
        error: 'Unknown error'
      });

      getSystemPromptSpy.mockRestore();
    });

    it('should have correct tool configuration', () => {
      expect(getSystemPromptTool.description).toBe('Get the currently loaded system prompt text');
      expect(getSystemPromptTool.inputSchema).toBeDefined();
      expect(getSystemPromptTool.execute).toBeDefined();
    });
  });
});
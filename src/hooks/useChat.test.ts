import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';

// Mock all dependencies
vi.mock('../services/llm');
vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  getVerbose: vi.fn(() => false),
  setVerbose: vi.fn()
}));
vi.mock('../utils/chatHistory');
vi.mock('../utils/projectConfig');
vi.mock('../commands/registry');
vi.mock('../utils/telemetry', () => ({
  initializeTelemetry: vi.fn(),
  traced: vi.fn((name, fn) => fn)
}));
vi.mock('../utils/requestContext', () => ({
  RequestContext: {
    getLogger: () => null
  }
}));
vi.mock('../components/RequestLogDisplay', () => ({
  loggerRegistry: {
    getLogger: () => null
  }
}));

import { loadChatHistory, saveChatHistory } from '../utils/chatHistory';
import { getCurrentProject } from '../utils/projectConfig';
import { parseCommand, executeCommand } from '../commands/registry';
import { generateResponse } from '../services/llm';

describe('useChat - Message State', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(getCurrentProject).mockResolvedValue(null);
    vi.mocked(loadChatHistory).mockResolvedValue([]);
    vi.mocked(saveChatHistory).mockResolvedValue();
    vi.mocked(parseCommand).mockReturnValue({
      isCommand: false,
      command: null,
      args: []
    });
  });

  describe('Hook initialization', () => {
    it('should initialize with welcome message when no history exists', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Should have welcome message
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content).toContain('LLPM');
    });

    it('should load existing chat history', async () => {
      const mockHistory = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' }
      ];

      vi.mocked(loadChatHistory).mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useChat());

      // Wait for history to load
      await waitFor(() => {
        expect(result.current.messages.length).toBe(2);
      }, { timeout: 2000 });

      expect(result.current.messages).toEqual(mockHistory);
    });

    it('should use welcome message on loadChatHistory error', async () => {
      vi.mocked(loadChatHistory).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useChat());

      // Wait for fallback
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Should have welcome message
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content).toContain('LLPM');
    });
  });

  describe('sendMessage - validation', () => {
    it('should reject empty messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      const initialMessageCount = result.current.messages.length;

      // Try to send empty message
      await act(async () => {
        await result.current.sendMessage('');
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Message count should not change
      expect(result.current.messages.length).toBe(initialMessageCount);
    });

    it('should reject whitespace-only messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      const initialMessageCount = result.current.messages.length;

      // Try to send whitespace-only message
      await act(async () => {
        await result.current.sendMessage('   \n\t   ');
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Message count should not change
      expect(result.current.messages.length).toBe(initialMessageCount);
    });

    it('should trim whitespace from messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      // Mock parseCommand to treat as command so we can verify the trimmed content
      let capturedContent = '';
      vi.mocked(parseCommand).mockImplementation((content) => {
        capturedContent = content;
        return { isCommand: false, command: null, args: [] };
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send message with whitespace
      await act(async () => {
        await result.current.sendMessage('  Hello world  ');
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // parseCommand should be called with trimmed content
      expect(capturedContent).toBe('Hello world');
    });
  });

  describe('Command handling', () => {
    it('should detect and execute commands', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'help',
        args: []
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Help information',
        shouldAddToHistory: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send command
      await act(async () => {
        await result.current.sendMessage('/help');
      });

      // Wait for command execution
      await waitFor(() => {
        expect(vi.mocked(executeCommand)).toHaveBeenCalled();
      }, { timeout: 2000 });

      expect(vi.mocked(executeCommand)).toHaveBeenCalledWith(
        'help',
        [],
        expect.any(Object)
      );
    });

    it('should set loading state during command execution', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'help',
        args: []
      });

      // Make executeCommand take some time
      vi.mocked(executeCommand).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { content: 'Help', shouldAddToHistory: true };
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send command
      act(() => {
        result.current.sendMessage('/help');
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      }, { timeout: 2000 });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });
    });

    it.skip('should add command result to messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'info',
        args: []
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'System information',
        shouldAddToHistory: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      const initialCount = result.current.messages.length;

      // Send command
      await act(async () => {
        await result.current.sendMessage('/info');
      });

      // Wait for message to be added
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(initialCount);
      }, { timeout: 2000 });

      // Should have system message with command result
      const systemMessage = result.current.messages.find(
        m => m.role === 'system' && m.content.includes('System information')
      );
      expect(systemMessage).toBeDefined();
    });
  });

  describe('LLM integration', () => {
    it.skip('should call generateResponse for non-command messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: null,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue({
        content: 'LLM response',
        toolResults: []
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send non-command message
      await act(async () => {
        await result.current.sendMessage('Hello AI');
      });

      // Wait for LLM call
      await waitFor(() => {
        expect(vi.mocked(generateResponse)).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should add user message before processing', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: null,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue({
        content: 'Response',
        toolResults: []
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send message
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      // Wait for user message to appear
      await waitFor(() => {
        const userMessages = result.current.messages.filter(m => m.role === 'user');
        expect(userMessages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      const userMessage = result.current.messages.find(
        m => m.role === 'user' && m.content === 'Test message'
      );
      expect(userMessage).toBeDefined();
    });

    it.skip('should add assistant response after LLM completion', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: null,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue({
        content: 'AI response text',
        toolResults: []
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send message
      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Wait for assistant response
      await waitFor(() => {
        const assistantMessages = result.current.messages.filter(
          m => m.role === 'assistant' && m.content === 'AI response text'
        );
        expect(assistantMessages.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should handle LLM errors gracefully', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: null,
        args: []
      });
      vi.mocked(generateResponse).mockRejectedValue(new Error('LLM API error'));

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send message
      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Wait for error message
      await waitFor(() => {
        const errorMessage = result.current.messages.find(
          m => m.role === 'assistant' && m.content.includes('encountered an error')
        );
        expect(errorMessage).toBeDefined();
      }, { timeout: 3000 });
    });
  });

  describe('Loading states', () => {
    it('should initialize with isLoading false', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      expect(result.current.isLoading).toBe(false);
    });

    it('should set isProcessing during message processing', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: null,
        args: []
      });
      vi.mocked(generateResponse).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { content: 'Response', toolResults: [] };
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send message
      act(() => {
        result.current.sendMessage('Test');
      });

      // Should be processing
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      }, { timeout: 2000 });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      }, { timeout: 3000 });
    });
  });

  describe('Message queue', () => {
    it.skip('should queue messages when processing', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: null,
        args: []
      });

      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(resolve => {
        resolveFirst = resolve;
      });

      vi.mocked(generateResponse)
        .mockImplementationOnce(async () => {
          await firstPromise;
          return { content: 'First response', toolResults: [] };
        })
        .mockResolvedValue({ content: 'Second response', toolResults: [] });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      }, { timeout: 2000 });

      // Send first message (will block)
      act(() => {
        result.current.sendMessage('First');
      });

      // Wait for processing to start
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      }, { timeout: 1000 });

      // Send second message while first is processing
      act(() => {
        result.current.sendMessage('Second');
      });

      // Should be queued
      await waitFor(() => {
        expect(result.current.queuedMessages.length).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // Resolve first message
      resolveFirst!();

      // Wait for queue to be processed
      await waitFor(() => {
        expect(result.current.queuedMessages.length).toBe(0);
      }, { timeout: 3000 });
    });
  });
});

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
import { parseCommand } from '../commands/registry';

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
});

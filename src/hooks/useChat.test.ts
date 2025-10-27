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
      command: undefined,
      args: []
    });
  });

  describe('Hook initialization', () => {
    it('should initialize with welcome message when no history exists', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

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
      await waitFor(
        () => {
          expect(result.current.messages.length).toBe(2);
        },
        { timeout: 2000 }
      );

      expect(result.current.messages).toEqual(mockHistory);
    });

    it('should use welcome message on loadChatHistory error', async () => {
      vi.mocked(loadChatHistory).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useChat());

      // Wait for fallback
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

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
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

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
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

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
      vi.mocked(parseCommand).mockImplementation(content => {
        capturedContent = content;
        return { isCommand: false, command: undefined, args: [] };
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

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
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send command
      await act(async () => {
        await result.current.sendMessage('/help');
      });

      // Wait for command execution
      await waitFor(
        () => {
          expect(vi.mocked(executeCommand)).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      expect(vi.mocked(executeCommand)).toHaveBeenCalledWith('help', [], expect.any(Object));
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
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send command
      act(() => {
        result.current.sendMessage('/help');
      });

      // Should be loading
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(true);
        },
        { timeout: 2000 }
      );

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );
    });

    it('should add command result to messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'info',
        args: []
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'System information',
        success: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      const initialCount = result.current.messages.length;

      // Send command
      await act(async () => {
        await result.current.sendMessage('/info');
      });

      // Wait for message to be added
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(initialCount);
        },
        { timeout: 2000 }
      );

      // Should have ui-notification message with command result
      const notificationMessage = result.current.messages.find(
        m => m.role === 'ui-notification' && m.content.includes('System information')
      );
      expect(notificationMessage).toBeDefined();
    });

    it('should handle clear command and reset to welcome message', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'clear',
        args: []
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Chat history cleared',
        success: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Add some messages first
      act(() => {
        result.current.addSystemMessage('Test message 1');
        result.current.addSystemMessage('Test message 2');
      });

      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(1);
        },
        { timeout: 1000 }
      );

      // Execute clear command
      await act(async () => {
        await result.current.sendMessage('/clear');
      });

      // Should only have welcome message
      await waitFor(
        () => {
          expect(result.current.messages.length).toBe(1);
        },
        { timeout: 2000 }
      );

      // Should be the welcome message
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content).toContain('LLPM');
    });

    it.skip('should handle project switch command with context refresh', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'project',
        args: ['switch', 'test-project']
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Switched to project: test-project',
        success: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Execute project switch
      await act(async () => {
        await result.current.sendMessage('/project switch test-project');
      });

      // Wait for project switch delay (200ms in implementation)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should have project switch message
      await waitFor(
        () => {
          const projectMessage = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content.includes('test-project')
          );
          expect(projectMessage).toBeDefined();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('LLM integration', () => {
    it.skip('should call generateResponse for non-command messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue('LLM response');

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send non-command message
      await act(async () => {
        await result.current.sendMessage('Hello AI');
      });

      // Wait for LLM call
      await waitFor(
        () => {
          expect(vi.mocked(generateResponse)).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('should add user message before processing', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue('Response');

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send message
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      // Wait for user message to appear
      await waitFor(
        () => {
          const userMessages = result.current.messages.filter(m => m.role === 'user');
          expect(userMessages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      const userMessage = result.current.messages.find(
        m => m.role === 'user' && m.content === 'Test message'
      );
      expect(userMessage).toBeDefined();
    });

    it.skip('should add assistant response after LLM completion', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue('AI response text');

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send message
      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Wait for assistant response
      await waitFor(
        () => {
          const assistantMessages = result.current.messages.filter(
            m => m.role === 'assistant' && m.content === 'AI response text'
          );
          expect(assistantMessages.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('should handle LLM errors gracefully', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      vi.mocked(generateResponse).mockRejectedValue(new Error('LLM API error'));

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send message
      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Wait for error message
      await waitFor(
        () => {
          const errorMessage = result.current.messages.find(
            m => m.role === 'assistant' && m.content.includes('encountered an error')
          );
          expect(errorMessage).toBeDefined();
        },
        { timeout: 3000 }
      );
    });

    it.skip('should handle empty LLM response', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      // Return empty or whitespace-only response
      vi.mocked(generateResponse).mockResolvedValue('   ');

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send message
      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Wait for fallback message
      await waitFor(
        () => {
          const assistantMessage = result.current.messages.find(
            m =>
              m.role === 'assistant' && m.content.includes("don't have anything specific to report")
          );
          expect(assistantMessage).toBeDefined();
        },
        { timeout: 3000 }
      );
    });

    it('should handle command execution errors', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'test',
        args: []
      });
      vi.mocked(executeCommand).mockRejectedValue(new Error('Command failed'));

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send command
      await act(async () => {
        await result.current.sendMessage('/test');
      });

      // Wait for error message
      await waitFor(
        () => {
          const errorMessage = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content.includes('Failed to execute command')
          );
          expect(errorMessage).toBeDefined();
        },
        { timeout: 2000 }
      );
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
        command: undefined,
        args: []
      });
      vi.mocked(generateResponse).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { content: 'Response', toolResults: [] };
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send message
      act(() => {
        result.current.sendMessage('Test');
      });

      // Should be processing
      await waitFor(
        () => {
          expect(result.current.isProcessing).toBe(true);
        },
        { timeout: 2000 }
      );

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isProcessing).toBe(false);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Model selector interactions', () => {
    it('should handle model selection', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Switched to gpt-4',
        success: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Trigger model selection
      await act(async () => {
        await result.current.handleModelSelect('openai/gpt-4');
      });

      // Should call executeCommand with model switch
      expect(vi.mocked(executeCommand)).toHaveBeenCalledWith('model', ['switch', 'openai/gpt-4']);

      // Wait for notification message
      await waitFor(
        () => {
          const notification = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content.includes('gpt-4')
          );
          expect(notification).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it('should handle model selection error', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(executeCommand).mockRejectedValue(new Error('Model not found'));

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Trigger model selection with error
      await act(async () => {
        await result.current.handleModelSelect('invalid/model');
      });

      // Wait for error message
      await waitFor(
        () => {
          const errorMessage = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content.includes('Failed to switch model')
          );
          expect(errorMessage).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it('should cancel model selection', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Manually set model selector models (simulating it being open)
      act(() => {
        // This would normally be set by triggerModelSelector
        // We can't easily set it without triggering the command, so just test the cancel function exists
        result.current.cancelModelSelection();
      });

      // Should clear model selector models
      expect(result.current.modelSelectorModels).toBeNull();
    });

    it('should trigger model selector with interactive result', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Select a model',
        success: true,
        interactive: {
          type: 'model-select',
          models: [{ id: 'gpt-4', name: 'GPT-4', provider: 'openai' }]
        }
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Trigger model selector
      await act(async () => {
        await result.current.triggerModelSelector();
      });

      // Wait for model selector to be set
      await waitFor(
        () => {
          expect(result.current.modelSelectorModels).toBeDefined();
          expect(result.current.modelSelectorModels?.length).toBe(1);
        },
        { timeout: 2000 }
      );
    });

    it('should trigger model selector with error', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(executeCommand).mockRejectedValue(new Error('Command failed'));

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Trigger model selector with error
      await act(async () => {
        await result.current.triggerModelSelector();
      });

      // Wait for error message
      await waitFor(
        () => {
          const errorMessage = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content.includes('Failed to open model selector')
          );
          expect(errorMessage).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it('should handle non-interactive model selector result', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Current model: gpt-4',
        success: true
        // No interactive property - should be treated as non-interactive
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      const initialCount = result.current.messages.length;

      // Trigger model selector
      await act(async () => {
        await result.current.triggerModelSelector();
      });

      // Wait for ui-notification message to be added
      await waitFor(
        () => {
          expect(result.current.messages.length).toBe(initialCount + 1);
        },
        { timeout: 2000 }
      );

      // Should have ui-notification message (not interactive selector)
      const notification = result.current.messages.find(
        m => m.role === 'ui-notification' && m.content.includes('Current model')
      );
      expect(notification).toBeDefined();

      // Should NOT set modelSelectorModels
      expect(result.current.modelSelectorModels).toBeNull();
    });
  });

  describe('Project switching', () => {
    it('should handle project switch notification', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Trigger project switch
      await act(async () => {
        await result.current.notifyProjectSwitch();
      });

      // Project switch should complete (just verifying no errors)
      expect(result.current.messages.length).toBeGreaterThan(0);
    });
  });

  describe('UI notifications', () => {
    it('should add UI notification messages', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      const initialCount = result.current.messages.length;

      // Add system message
      act(() => {
        result.current.addSystemMessage('Test notification');
      });

      // Wait for message to be added
      await waitFor(
        () => {
          expect(result.current.messages.length).toBe(initialCount + 1);
        },
        { timeout: 1000 }
      );

      const notification = result.current.messages.find(
        m => m.role === 'ui-notification' && m.content === 'Test notification'
      );
      expect(notification).toBeDefined();
    });
  });

  describe('Error handling in message processing', () => {
    it('should handle errors in immediate message processing', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      // Make generateResponse throw an error to trigger error path
      vi.mocked(generateResponse).mockRejectedValue(new Error('Processing error'));

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send message that will fail during processing
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      // Should have gracefully handled the error and added error message
      await waitFor(
        () => {
          const errorMessage = result.current.messages.find(
            m => m.role === 'assistant' && m.content.includes('encountered an error')
          );
          expect(errorMessage).toBeDefined();
        },
        { timeout: 2000 }
      );

      // Should no longer be processing
      expect(result.current.isProcessing).toBe(false);
    });

    it.skip('should wait for project switch before processing message', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      vi.mocked(generateResponse).mockResolvedValue('Response after project switch');

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Trigger a project switch
      await act(async () => {
        await result.current.notifyProjectSwitch();
      });

      // Immediately send a message while switching (will wait for switch to complete)
      await act(async () => {
        await result.current.sendMessage('Test during switch');
      });

      // Should eventually process the message
      await waitFor(
        () => {
          const response = result.current.messages.find(
            m => m.content === 'Response after project switch'
          );
          expect(response).toBeDefined();
        },
        { timeout: 3000 }
      );
    });

    it('should handle command result without interactive flag', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'test',
        args: []
      });
      // Command result with no interactive property at all
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Command executed',
        success: true
        // Note: no 'interactive' property
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      await act(async () => {
        await result.current.sendMessage('/test');
      });

      // Should add as ui-notification, not trigger model selector
      await waitFor(
        () => {
          const notification = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content === 'Command executed'
          );
          expect(notification).toBeDefined();
        },
        { timeout: 2000 }
      );

      expect(result.current.modelSelectorModels).toBeNull();
    });
  });

  describe('Message queue', () => {
    it('should expose queue length for UI indicators', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Queue should be empty initially
      expect(result.current.queueLength).toBe(0);
      expect(result.current.queuedMessages).toEqual([]);
    });

    it.skip('should process queued messages sequentially', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });

      let callCount = 0;
      vi.mocked(generateResponse).mockImplementation(async () => {
        callCount++;
        // First call takes longer to allow second message to queue
        if (callCount === 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return `Response ${callCount}`;
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send two messages quickly
      act(() => {
        result.current.sendMessage('First');
      });

      // Wait a tiny bit then send second
      await new Promise(resolve => setTimeout(resolve, 10));

      act(() => {
        result.current.sendMessage('Second');
      });

      // Eventually both should be processed
      await waitFor(
        () => {
          expect(callCount).toBe(2);
        },
        { timeout: 5000 }
      );

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.queueLength).toBe(0);
    });
  });

  describe('Additional edge cases', () => {
    it('should handle interactive model select in processMessageImmediate', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'model',
        args: ['switch']
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Select a model',
        success: true,
        interactive: {
          type: 'model-select',
          models: [
            { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
            { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' }
          ]
        }
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Send model switch command
      await act(async () => {
        await result.current.sendMessage('/model switch');
      });

      // Should trigger interactive model selector
      await waitFor(
        () => {
          expect(result.current.modelSelectorModels).toBeDefined();
          expect(result.current.modelSelectorModels?.length).toBe(2);
        },
        { timeout: 2000 }
      );
    });

    it('should handle non-successful command result', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'test',
        args: []
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Command failed',
        success: false // Not successful
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      await act(async () => {
        await result.current.sendMessage('/test');
      });

      // Should still add the message
      await waitFor(
        () => {
          const notification = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content === 'Command failed'
          );
          expect(notification).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it.skip('should handle project set command with success', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: true,
        command: 'project',
        args: ['set', 'my-project']
      });
      vi.mocked(executeCommand).mockResolvedValue({
        content: 'Project set to: my-project',
        success: true
      });

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      await act(async () => {
        await result.current.sendMessage('/project set my-project');
      });

      // Wait a bit for the project switch delay
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have notification
      await waitFor(
        () => {
          const notification = result.current.messages.find(
            m => m.role === 'ui-notification' && m.content.includes('my-project')
          );
          expect(notification).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it.skip('should handle empty response from LLM', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      // Return empty string
      vi.mocked(generateResponse).mockResolvedValue('');

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Should have fallback message
      await waitFor(
        () => {
          const fallback = result.current.messages.find(
            m =>
              m.role === 'assistant' && m.content.includes("don't have anything specific to report")
          );
          expect(fallback).toBeDefined();
        },
        { timeout: 2000 }
      );
    });

    it.skip('should handle null response from LLM', async () => {
      vi.mocked(loadChatHistory).mockResolvedValue([]);
      vi.mocked(parseCommand).mockReturnValue({
        isCommand: false,
        command: undefined,
        args: []
      });
      // Return null (which gets coerced to empty)
      vi.mocked(generateResponse).mockResolvedValue(null as any);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(
        () => {
          expect(result.current.messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      await act(async () => {
        await result.current.sendMessage('Question');
      });

      // Should have fallback message
      await waitFor(
        () => {
          const fallback = result.current.messages.find(
            m =>
              m.role === 'assistant' && m.content.includes("don't have anything specific to report")
          );
          expect(fallback).toBeDefined();
        },
        { timeout: 2000 }
      );
    });
  });
});

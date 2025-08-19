import '../../test/setup';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChat } from './useChat';
import * as llm from '../services/llm';
import * as chatHistory from '../utils/chatHistory';
import * as projectConfig from '../utils/projectConfig';
import * as commandRegistry from '../commands/registry';

describe('useChat Queue Basic Operations', () => {
  let generateResponseSpy: any;
  let loadChatHistorySpy: any;
  let saveChatHistorySpy: any;
  let getCurrentProjectSpy: any;
  let parseCommandSpy: any;
  let executeCommandSpy: any;

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

    // Mock services
    generateResponseSpy = vi.spyOn(llm, 'generateResponse').mockResolvedValue('Mock AI response');
    loadChatHistorySpy = vi.spyOn(chatHistory, 'loadChatHistory').mockResolvedValue([]);
    saveChatHistorySpy = vi.spyOn(chatHistory, 'saveChatHistory').mockResolvedValue(undefined);
    getCurrentProjectSpy = vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
    parseCommandSpy = vi.spyOn(commandRegistry, 'parseCommand').mockReturnValue({
      isCommand: false,
      command: null,
      args: []
    });
    executeCommandSpy = vi.spyOn(commandRegistry, 'executeCommand').mockResolvedValue({
      success: true,
      content: 'Mock command result'
    });
  });

  afterEach(() => {
    generateResponseSpy.mockRestore();
    loadChatHistorySpy.mockRestore();
    saveChatHistorySpy.mockRestore();
    getCurrentProjectSpy.mockRestore();
    parseCommandSpy.mockRestore();
    executeCommandSpy.mockRestore();
  });

  it('should initialize with empty queue', async () => {
    const { result } = renderHook(() => useChat());
    
    // Wait for initialization
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1); // Welcome message
    });

    expect(result.current.queueLength).toBe(0);
    expect(result.current.isProcessing).toBe(false);
  });

  it('should handle single message without queuing', async () => {
    const { result } = renderHook(() => useChat());
    
    // Wait for initialization
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1); // Welcome message
    });

    // Send a single message
    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    // Should not use queue (immediate processing)
    expect(result.current.queueLength).toBe(0);
    expect(result.current.isProcessing).toBe(false);
    expect(generateResponseSpy).toHaveBeenCalledTimes(1);
  });

  it('should expose queue status correctly', async () => {
    const { result } = renderHook(() => useChat());
    
    // Wait for initialization
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    // Initial state
    expect(result.current.queueLength).toBe(0);
    expect(result.current.isProcessing).toBe(false);

    // Mock slow response to simulate processing state
    generateResponseSpy.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve('Response'), 100))
    );

    // Send message - should start processing
    act(() => {
      result.current.sendMessage('Message 1');
    });

    // Should be processing with empty queue (immediate processing)
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.queueLength).toBe(0);
    });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.queueLength).toBe(0);
    });
  });

  it('should queue multiple rapid messages', async () => {
    const { result } = renderHook(() => useChat());
    
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    // Create a controlled promise for first message
    let resolveFirst: (value: string) => void;
    const firstPromise = new Promise<string>(resolve => {
      resolveFirst = resolve;
    });

    generateResponseSpy
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValue('Quick response');

    // Send first message - will process immediately and block
    act(() => {
      result.current.sendMessage('First');
    });

    // Wait for processing to start
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    // Send more messages while blocked
    act(() => {
      result.current.sendMessage('Second');
      result.current.sendMessage('Third');
    });

    // Messages should be queued
    expect(result.current.queueLength).toBe(2);
    expect(result.current.isProcessing).toBe(true);

    // Complete first message
    await act(async () => {
      resolveFirst('First response');
    });

    // Wait for queue to process
    await waitFor(() => {
      expect(result.current.queueLength).toBe(0);
      expect(result.current.isProcessing).toBe(false);
      expect(generateResponseSpy).toHaveBeenCalledTimes(3);
    }, { timeout: 2000 });
  });

  it('should not queue empty messages', async () => {
    const { result } = renderHook(() => useChat());
    
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    // Try to send empty messages
    await act(async () => {
      await result.current.sendMessage('');
      await result.current.sendMessage('   ');
      await result.current.sendMessage('\n\t  ');
    });

    // Should not have processed any messages
    expect(result.current.queueLength).toBe(0);
    expect(result.current.isProcessing).toBe(false);
    expect(generateResponseSpy).not.toHaveBeenCalled();
  });

  it('should handle processing errors gracefully', async () => {
    const { result } = renderHook(() => useChat());
    
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    // Mock error response
    generateResponseSpy.mockRejectedValueOnce(new Error('LLM Error'));

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    // Should complete processing despite error
    expect(result.current.queueLength).toBe(0);
    expect(result.current.isProcessing).toBe(false);
    
    // Error message should be added
    const errorMessage = result.current.messages.find(msg => 
      msg.content.includes('Sorry, I encountered an error')
    );
    expect(errorMessage).toBeTruthy();
  });
});
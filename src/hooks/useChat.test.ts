import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Import modules to be mocked
import * as llmService from '../services/llm';
import * as chatHistory from '../utils/chatHistory';
import * as projectConfig from '../utils/projectConfig';
import * as commandRegistry from '../commands/registry';
import { useChat } from './useChat';

// Create mocked functions that we'll set up in beforeEach
let mockGenerateResponse: any;
let mockLoadChatHistory: any;
let mockSaveChatHistory: any;
let mockGetCurrentProject: any;
let mockParseCommand: any;
let mockExecuteCommand: any;

describe('useChat', () => {
  beforeEach(() => {
    // Mock all the dependencies using vi.spyOn
    mockGenerateResponse = vi.spyOn(llmService, 'generateResponse').mockResolvedValue('AI response');
    mockLoadChatHistory = vi.spyOn(chatHistory, 'loadChatHistory').mockResolvedValue([]);
    mockSaveChatHistory = vi.spyOn(chatHistory, 'saveChatHistory').mockResolvedValue(undefined);
    mockGetCurrentProject = vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
    mockParseCommand = vi.spyOn(commandRegistry, 'parseCommand').mockReturnValue({ isCommand: false });
    mockExecuteCommand = vi.spyOn(commandRegistry, 'executeCommand').mockResolvedValue({ success: true, content: 'Command executed' });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with welcome message', async () => {
    const { result } = renderHook(() => useChat());

    // Wait for the async history loading to complete with longer timeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: 'assistant',
      content:
        "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands."
    });
    expect(result.current.messages[0]).toHaveProperty('id');
    expect(result.current.isLoading).toBe(false);
  });

  it('should add user message and get AI response', async () => {
    mockGenerateResponse.mockResolvedValueOnce('AI response');

    const { result } = renderHook(() => useChat());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[1]).toMatchObject({
      role: 'user',
      content: 'Hello'
    });
    expect(result.current.messages[1]).toHaveProperty('id');
    expect(result.current.messages[2]).toMatchObject({
      role: 'assistant',
      content: 'AI response'
    });
    expect(result.current.messages[2]).toHaveProperty('id');
  });

  it('should handle LLM service errors gracefully', async () => {
    mockGenerateResponse.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useChat());

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2]).toMatchObject({
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.'
    });
    expect(result.current.messages[2]).toHaveProperty('id');
  });

  it('should set loading state during API call', async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>(resolve => {
      resolvePromise = resolve;
    });
    mockGenerateResponse.mockReturnValueOnce(promise);

    const { result } = renderHook(() => useChat());

    // Start the API call
    act(() => {
      result.current.sendMessage('Hello');
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise('AI response');
      await promise;
    });

    // Should not be loading anymore
    expect(result.current.isLoading).toBe(false);
  });
});

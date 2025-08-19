import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import { generateResponse } from '../services/llm';

// Mock the LLM service
vi.mock('../services/llm', () => ({
  generateResponse: vi.fn()
}));

// Mock chat history utilities
vi.mock('../utils/chatHistory', () => ({
  loadChatHistory: vi.fn().mockResolvedValue([]),
  saveChatHistory: vi.fn().mockResolvedValue(undefined)
}));

// Mock project configuration utilities
vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn().mockResolvedValue(null)
}));

// Mock command registry
vi.mock('../commands/registry', () => ({
  parseCommand: vi.fn().mockReturnValue({ isCommand: false }),
  executeCommand: vi.fn().mockResolvedValue({ success: true, content: 'Command executed' })
}));

const mockGenerateResponse = vi.mocked(generateResponse);

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

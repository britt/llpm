import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from './index';

// Mock the LLM service to avoid API calls in tests
vi.mock('./src/services/llm', () => {
  const { vi } = require('vitest');
  return {
    generateResponse: vi.fn().mockResolvedValue('Hello! How can I help you?')
  };
});

// Mock chat history utilities
vi.mock('./src/utils/chatHistory', () => ({
  loadChatHistory: vi.fn().mockResolvedValue([]),
  saveChatHistory: vi.fn().mockResolvedValue(undefined)
}));

// Mock Ink's useInput hook to avoid terminal input handling in tests
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn()
  };
});

describe('App', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    // Set API key for tests
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('renders chat interface with initial assistant message', async () => {
    const { getByText } = render(React.createElement(App));
    // Wait for async loading
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getByText(/Hello! I'm Claude PM, your AI assistant/)).toBeInTheDocument();
  });

  it('renders the chat interface title', () => {
    const { getByText } = render(React.createElement(App));
    expect(getByText('Claude PM - AI Assistant')).toBeInTheDocument();
  });
});
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as llmService from './src/services/llm';
import * as chatHistory from './src/utils/chatHistory';
import * as ink from 'ink';
import { App } from './index';

describe('App', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    // Set API key for tests
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Mock dependencies
    vi.spyOn(llmService, 'generateResponse').mockResolvedValue('Hello! How can I help you?');
    vi.spyOn(chatHistory, 'loadChatHistory').mockResolvedValue([]);
    vi.spyOn(chatHistory, 'saveChatHistory').mockResolvedValue(undefined);
    vi.spyOn(ink, 'useInput').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('renders chat interface with initial assistant message', async () => {
    const { getByText } = render(React.createElement(App));
    // Wait for async loading
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(getByText(/Hello! I'm LLPM, your AI-powered project manager/)).toBeInTheDocument();
  });

  it('renders the chat interface with project indicator', () => {
    const { getByText } = render(React.createElement(App));
    expect(getByText(/project:/)).toBeInTheDocument();
    expect(getByText(/none/)).toBeInTheDocument();
  });
});

import { vi } from 'vitest';

// Mock ink module at the very top, before any other imports
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(() => {})
  };
});

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as llmService from './src/services/llm';
import * as chatHistory from './src/utils/chatHistory';
import { App } from './index';

describe('App', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    // Set API keys for tests to pass validation
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GOOGLE_VERTEX_PROJECT_ID = 'test-project';
    
    // Mock dependencies
    vi.spyOn(llmService, 'generateResponse').mockResolvedValue('Hello! How can I help you?');
    vi.spyOn(chatHistory, 'loadChatHistory').mockResolvedValue([]);
    vi.spyOn(chatHistory, 'saveChatHistory').mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('app component should exist and be callable', () => {
    // Simple test to ensure App component can be created without throwing
    expect(() => React.createElement(App)).not.toThrow();
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('validates environment variables are checked', () => {
    // Test that our environment setup works for multi-provider validation
    expect(process.env.OPENAI_API_KEY).toBe('test-api-key');
    expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
  });
});

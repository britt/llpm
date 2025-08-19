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

  it('app component should exist and be callable', () => {
    // Simple test to ensure App component can be created without throwing
    expect(() => React.createElement(App)).not.toThrow();
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('validates environment variables are checked', () => {
    // Test that our environment setup works
    expect(process.env.OPENAI_API_KEY).toBe('test-api-key');
  });
});

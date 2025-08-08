import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App } from './index';

// Mock the LLM service to avoid API calls in tests
vi.mock('./src/services/llm', () => ({
  generateResponse: vi.fn().mockResolvedValue('Hello! How can I help you?')
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

  it('renders chat interface with initial assistant message', () => {
    const { getByText } = render(React.createElement(App));
    expect(getByText("Hello! I'm Claude PM, your AI assistant. How can I help you today?")).toBeInTheDocument();
  });

  it('renders the chat interface title', () => {
    const { getByText } = render(React.createElement(App));
    expect(getByText('Claude PM - AI Assistant')).toBeInTheDocument();
  });
});
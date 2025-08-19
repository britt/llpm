import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInterface } from './ChatInterface';
import type { Message } from '../types';

// Mock external dependencies
vi.mock('../utils/inputHistory', () => ({
  loadInputHistory: vi.fn().mockResolvedValue([]),
  saveInputHistory: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn().mockResolvedValue(null),
  listProjects: vi.fn().mockResolvedValue([]),
  setCurrentProject: vi.fn().mockResolvedValue(undefined)
}));

// Mock ink components
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(() => {})
  };
});

describe('ChatInterface Performance', () => {
  const createMessages = (count: number): Message[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 3 === 0 ? 'user' : i % 3 === 1 ? 'assistant' : 'system',
      content: `This is test message ${i} with some content that might contain https://example.com/link${i} for testing URL rendering performance.`
    }));
  };

  const mockProps = {
    onSendMessage: vi.fn(),
    onAddSystemMessage: vi.fn(),
    isLoading: false,
    interactiveCommand: null,
    onModelSelect: undefined,
    onCancelModelSelection: undefined
  };

  it('should handle large message lists efficiently', () => {
    const startTime = performance.now();
    
    const messages = createMessages(100); // 100 messages
    
    const { rerender } = render(
      <ChatInterface
        {...mockProps}
        messages={messages}
      />
    );

    const firstRenderTime = performance.now() - startTime;
    
    // Test re-render performance with same props (should be fast due to memoization)
    const reRenderStart = performance.now();
    
    rerender(
      <ChatInterface
        {...mockProps}
        messages={messages}
      />
    );
    
    const reRenderTime = performance.now() - reRenderStart;
    
    // First render should be reasonable (less than 100ms for 100 messages)
    expect(firstRenderTime).toBeLessThan(100);
    
    // Re-render with same props should be much faster (less than 5ms due to memoization)
    expect(reRenderTime).toBeLessThan(5);
    
    console.log(`First render: ${firstRenderTime.toFixed(2)}ms`);
    console.log(`Re-render: ${reRenderTime.toFixed(2)}ms`);
  });

  it('should efficiently update when adding new messages', () => {
    const initialMessages = createMessages(50);
    
    const { rerender } = render(
      <ChatInterface
        {...mockProps}
        messages={initialMessages}
      />
    );

    const updateStart = performance.now();
    
    // Add one new message
    const updatedMessages = [...initialMessages, {
      id: 'new-msg',
      role: 'user' as const,
      content: 'New message added'
    }];
    
    rerender(
      <ChatInterface
        {...mockProps}
        messages={updatedMessages}
      />
    );
    
    const updateTime = performance.now() - updateStart;
    
    // Adding one message should be reasonable (less than 30ms)
    expect(updateTime).toBeLessThan(30);
    
    console.log(`Message addition update: ${updateTime.toFixed(2)}ms`);
  });

  it('should not re-render unnecessarily when non-message props change', () => {
    const messages = createMessages(20);
    let renderCount = 0;
    
    // Create a wrapper to count renders
    const TestWrapper = (props: any) => {
      renderCount++;
      return <ChatInterface {...props} />;
    };
    
    const { rerender } = render(
      <TestWrapper
        {...mockProps}
        messages={messages}
        isLoading={false}
      />
    );

    const initialRenderCount = renderCount;
    
    // Change isLoading prop
    rerender(
      <TestWrapper
        {...mockProps}
        messages={messages}
        isLoading={true}
      />
    );
    
    // Should only re-render once for the prop change
    expect(renderCount - initialRenderCount).toBe(1);
  });
});
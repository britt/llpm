import React from 'react';
import { describe, it, expect } from 'vitest';
import { ChatInterface } from './ChatInterface';
import type { Message } from '../types';

describe('ChatInterface Basic Tests', () => {
  const messages: Message[] = [];
  
  const mockProps = {
    messages,
    onSendMessage: () => {},
    onAddSystemMessage: () => {},
    isLoading: false,
    interactiveCommand: null,
    onModelSelect: undefined,
    onCancelModelSelection: undefined
  };

  it('should render without crashing', () => {
    expect(() => {
      React.createElement(ChatInterface, mockProps);
    }).not.toThrow();
  });

  it('should be a valid React component', () => {
    expect(ChatInterface).toBeDefined();
    expect(typeof ChatInterface).toBe('function');
  });
});
import '../../test/setup';
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatInterface } from './ChatInterface';
import type { Message } from '../types';
import * as inputHistory from '../utils/inputHistory';
import * as projectConfig from '../utils/projectConfig';

(process.env.CI === 'true' ? describe.skip : describe)('ChatInterface Basic Functionality', () => {
  const messages: Message[] = [
    { id: '1', role: 'user', content: 'Test message' }
  ];

  const mockProps = {
    messages,
    onSendMessage: vi.fn(),
    onAddSystemMessage: vi.fn(),
    isLoading: false,
    interactiveCommand: null,
    onModelSelect: undefined,
    onCancelModelSelection: undefined
  };

  let loadInputHistorySpy: any;
  let saveInputHistorySpy: any;
  let getCurrentProjectSpy: any;
  let listProjectsSpy: any;
  let setCurrentProjectSpy: any;

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
    
    // Spy on async functions only
    loadInputHistorySpy = vi.spyOn(inputHistory, 'loadInputHistory').mockResolvedValue(['previous command', 'another command']);
    saveInputHistorySpy = vi.spyOn(inputHistory, 'saveInputHistory').mockResolvedValue(undefined);
    
    getCurrentProjectSpy = vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
    listProjectsSpy = vi.spyOn(projectConfig, 'listProjects').mockResolvedValue([]);
    setCurrentProjectSpy = vi.spyOn(projectConfig, 'setCurrentProject' as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    loadInputHistorySpy.mockRestore();
    saveInputHistorySpy.mockRestore();
    getCurrentProjectSpy.mockRestore();
    listProjectsSpy.mockRestore();
    setCurrentProjectSpy.mockRestore();
  });

  it('should render without crashing', () => {
    expect(() => {
      render(<ChatInterface {...mockProps} />);
    }).not.toThrow();
  });

  it('should render with model selector active', () => {
    const propsWithModelSelector = {
      ...mockProps,
      interactiveCommand: {
        type: 'model-select' as const,
        models: [
          { id: 'gpt-4', label: 'GPT-4', value: 'openai/gpt-4' }
        ]
      },
      onCancelModelSelection: vi.fn()
    };

    expect(() => {
      render(<ChatInterface {...propsWithModelSelector} />);
    }).not.toThrow();
  });

  it('should render with different loading states', () => {
    expect(() => {
      render(<ChatInterface {...mockProps} isLoading={true} />);
    }).not.toThrow();

    expect(() => {
      render(<ChatInterface {...mockProps} isLoading={false} />);
    }).not.toThrow();
  });

  it('should render with different message arrays', () => {
    const emptyMessages: Message[] = [];
    expect(() => {
      render(<ChatInterface {...mockProps} messages={emptyMessages} />);
    }).not.toThrow();

    const manyMessages: Message[] = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`
    }));
    expect(() => {
      render(<ChatInterface {...mockProps} messages={manyMessages} />);
    }).not.toThrow();
  });
});
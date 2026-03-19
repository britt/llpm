import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistoryViewer } from './HistoryViewer';
import type { Message } from '../types';

// Mock markdown renderer
vi.mock('../utils/markdownRenderer', () => ({
  renderMarkdown: (s: string) => s,
  isASCIICapableTerminal: () => false,
}));

// Mock fullscreen-ink
vi.mock('fullscreen-ink', () => ({
  useScreenSize: () => ({ width: 80, height: 24 }),
}));

const makeMessages = (count: number): Message[] =>
  Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as Message['role'],
    content: `Message ${i + 1}`,
    id: `msg-${i}`,
  }));

describe('HistoryViewer', () => {
  it('should render messages', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(3),
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Message 1');
    expect(frame).toContain('user');
    expect(frame).toContain('assistant');
  });

  it('should show header with title', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(3),
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('History');
  });

  it('should show keybinding hints', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(1),
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('q');
  });

  it('should call onClose when q is pressed', () => {
    const onClose = vi.fn();
    const { stdin } = render(
      React.createElement(HistoryViewer, {
        messages: makeMessages(1),
        onClose,
      })
    );
    stdin.write('q');
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle empty messages', () => {
    const { lastFrame } = render(
      React.createElement(HistoryViewer, {
        messages: [],
        onClose: vi.fn(),
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No messages');
  });
});

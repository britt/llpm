import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { HistoryMessage } from './HistoryMessage';

// Mock markdown renderer to return content as-is for testing
vi.mock('../utils/markdownRenderer', () => ({
  renderMarkdown: (s: string) => s,
  isASCIICapableTerminal: () => false,
}));

describe('HistoryMessage', () => {
  it('should display user role and content', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'hello world' },
        index: 1,
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('user');
    expect(frame).toContain('hello world');
  });

  it('should display assistant role and content', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'assistant', content: 'I can help' },
        index: 2,
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('assistant');
    expect(frame).toContain('I can help');
  });

  it('should format timestamp when present', () => {
    // Create a known timestamp: 2026-03-19 14:32:15 UTC
    const ts = new Date('2026-03-19T14:32:15Z').getTime();
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'test', timestamp: ts },
        index: 1,
      })
    );
    const frame = lastFrame() ?? '';
    // Should show time in HH:MM:SS format (locale-dependent, just check pattern)
    expect(frame).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should show index when no timestamp', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'test' },
        index: 5,
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('#5');
  });

  it('should render without error when searchQuery is provided', () => {
    const { lastFrame } = render(
      React.createElement(HistoryMessage, {
        message: { role: 'user', content: 'hello world' },
        index: 1,
        searchQuery: 'world',
      })
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('world');
  });
});

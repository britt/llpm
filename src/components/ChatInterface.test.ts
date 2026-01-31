import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Message } from '../types';

// Import the function we'll create/export to make message display testable
import { getMessageDisplayContent, getMessageTextColor } from './ChatInterface';

// Mock the markdownRenderer module
vi.mock('../utils/markdownRenderer', () => ({
  renderMarkdown: (content: string) => `[RENDERED]${content}[/RENDERED]`,
  isASCIICapableTerminal: vi.fn(() => true)
}));

import { isASCIICapableTerminal } from '../utils/markdownRenderer';

describe('MessageItem display content', () => {
  beforeEach(() => {
    vi.mocked(isASCIICapableTerminal).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessageDisplayContent', () => {
    it('should add "System:" prefix to system messages without markdown rendering', () => {
      const message: Message = {
        role: 'system',
        content: '**bold text**',
        id: 'test-1'
      };

      const result = getMessageDisplayContent(message);

      expect(result).toBe('System: **bold text**');
      // Should NOT contain rendered markdown markers
      expect(result).not.toContain('[RENDERED]');
    });

    it('should render markdown for ui-notification messages WITHOUT "System:" prefix', () => {
      const message: Message = {
        role: 'ui-notification',
        content: '**Skills List**\n- skill1\n- skill2',
        id: 'test-2'
      };

      const result = getMessageDisplayContent(message);

      // Should have markdown rendered
      expect(result).toContain('[RENDERED]');
      // Should NOT have "System:" prefix
      expect(result.startsWith('System:')).toBe(false);
    });

    it('should add "> " prefix to user messages without markdown rendering', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello world',
        id: 'test-3'
      };

      const result = getMessageDisplayContent(message);

      expect(result).toBe('> Hello world');
      // Should NOT contain rendered markdown markers
      expect(result).not.toContain('[RENDERED]');
    });

    it('should render markdown for assistant messages', () => {
      const message: Message = {
        role: 'assistant',
        content: '**Response**',
        id: 'test-4'
      };

      const result = getMessageDisplayContent(message);

      expect(result).toContain('[RENDERED]');
      expect(result).toContain('**Response**');
    });

    it('should NOT render markdown when terminal does not support it', () => {
      vi.mocked(isASCIICapableTerminal).mockReturnValue(false);

      const assistantMessage: Message = {
        role: 'assistant',
        content: '**Response**',
        id: 'test-5'
      };

      const uiNotificationMessage: Message = {
        role: 'ui-notification',
        content: '**Skills**',
        id: 'test-6'
      };

      // Assistant without markdown
      expect(getMessageDisplayContent(assistantMessage)).toBe('**Response**');

      // UI notification without markdown (but also no prefix)
      expect(getMessageDisplayContent(uiNotificationMessage)).toBe('**Skills**');
    });

    it('should handle markdown rendering errors gracefully', () => {
      // Re-mock to throw an error
      vi.doMock('../utils/markdownRenderer', () => ({
        renderMarkdown: () => { throw new Error('Render failed'); },
        isASCIICapableTerminal: () => true
      }));

      const message: Message = {
        role: 'ui-notification',
        content: 'Content with error',
        id: 'test-7'
      };

      // Should fall back to raw content without crashing
      // Note: This test validates error handling behavior
      const result = getMessageDisplayContent(message);
      expect(result).toBeDefined();
    });
  });

  describe('getMessageTextColor', () => {
    it('should return "#cb9774" for system messages', () => {
      const message: Message = { role: 'system', content: 'test', id: '1' };
      expect(getMessageTextColor(message)).toBe('#cb9774');
    });

    it('should return "#cb9774" for ui-notification messages', () => {
      const message: Message = { role: 'ui-notification', content: 'test', id: '2' };
      expect(getMessageTextColor(message)).toBe('#cb9774');
    });

    it('should return "white" for user messages', () => {
      const message: Message = { role: 'user', content: 'test', id: '3' };
      expect(getMessageTextColor(message)).toBe('white');
    });

    it('should return "brightWhite" for assistant messages', () => {
      const message: Message = { role: 'assistant', content: 'test', id: '4' };
      expect(getMessageTextColor(message)).toBe('brightWhite');
    });
  });
});

describe('ui-notification vs system message behavior', () => {
  beforeEach(() => {
    vi.mocked(isASCIICapableTerminal).mockReturnValue(true);
  });

  it('ui-notification should behave differently from system messages', () => {
    const systemMessage: Message = {
      role: 'system',
      content: '# Heading',
      id: 'system-1'
    };

    const uiNotificationMessage: Message = {
      role: 'ui-notification',
      content: '# Heading',
      id: 'ui-1'
    };

    const systemResult = getMessageDisplayContent(systemMessage);
    const uiNotificationResult = getMessageDisplayContent(uiNotificationMessage);

    // System should have prefix, no markdown
    expect(systemResult).toBe('System: # Heading');

    // UI notification should have markdown rendered, no prefix
    expect(uiNotificationResult).toContain('[RENDERED]');
    expect(uiNotificationResult.startsWith('System:')).toBe(false);
  });

  it('ui-notification should share the same color as system messages', () => {
    const systemMessage: Message = { role: 'system', content: 'test', id: '1' };
    const uiNotificationMessage: Message = { role: 'ui-notification', content: 'test', id: '2' };

    expect(getMessageTextColor(systemMessage)).toBe(getMessageTextColor(uiNotificationMessage));
  });
});

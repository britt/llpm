import '../../test/setup';
import { describe, it, expect, vi } from 'vitest';
import { getMessageDisplayContent, getMessageTextColor } from './messageDisplay';
import type { Message } from '../types';

// Mock markdownRenderer to track whether renderMarkdown is called
vi.mock('./markdownRenderer', () => ({
  renderMarkdown: vi.fn((content: string) => `<rendered>${content}</rendered>`),
  isASCIICapableTerminal: vi.fn(() => true)
}));

describe('getMessageDisplayContent', () => {
  it('should return ANSI-coded content unmodified without markdown rendering', () => {
    const ansiContent = '\x1b[90m[12:00:00]\x1b[0m \x1b[37mTest message\x1b[0m';
    const message: Message = {
      role: 'ui-notification',
      content: ansiContent
    };

    const result = getMessageDisplayContent(message);

    // Should return content as-is, not passed through renderMarkdown
    expect(result).toBe(ansiContent);
    expect(result).not.toContain('<rendered>');
  });

  it('should render markdown for ui-notification without ANSI codes', () => {
    const message: Message = {
      role: 'ui-notification',
      content: 'Some **markdown** content'
    };

    const result = getMessageDisplayContent(message);

    expect(result).toContain('<rendered>');
  });

  it('should return ANSI-coded assistant content unmodified', () => {
    const ansiContent = '\x1b[32mSuccess\x1b[0m';
    const message: Message = {
      role: 'assistant',
      content: ansiContent
    };

    const result = getMessageDisplayContent(message);

    expect(result).toBe(ansiContent);
    expect(result).not.toContain('<rendered>');
  });

  it('should prefix system messages with System:', () => {
    const message: Message = { role: 'system', content: 'hello' };
    expect(getMessageDisplayContent(message)).toBe('System: hello');
  });

  it('should prefix user messages with >', () => {
    const message: Message = { role: 'user', content: 'hello' };
    expect(getMessageDisplayContent(message)).toBe('> hello');
  });
});

describe('getMessageTextColor', () => {
  it('should return amber for system messages', () => {
    expect(getMessageTextColor({ role: 'system', content: '' })).toBe('#cb9774');
  });

  it('should return amber for ui-notification messages', () => {
    expect(getMessageTextColor({ role: 'ui-notification', content: '' })).toBe('#cb9774');
  });

  it('should return white for user messages', () => {
    expect(getMessageTextColor({ role: 'user', content: '' })).toBe('white');
  });

  it('should return brightWhite for assistant messages', () => {
    expect(getMessageTextColor({ role: 'assistant', content: '' })).toBe('brightWhite');
  });
});

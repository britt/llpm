import { test, expect, describe } from 'bun:test';
import { MessageToLogString, LogStringToMessage } from './chatHistory';
import type { Message } from '../types';

describe('Chat History Serialization', () => {
  test('MessageToLogString escapes newlines correctly', () => {
    const message: Message = {
      role: 'user',
      content: 'Hello\nWorld\nThis is a\nmulti-line message'
    };

    const result = MessageToLogString(message);
    expect(result).toBe('user: Hello\\nWorld\\nThis is a\\nmulti-line message');
  });

  test('LogStringToMessage unescapes newlines correctly', () => {
    const logString = 'user: Hello\\nWorld\\nThis is a\\nmulti-line message';
    
    const result = LogStringToMessage(logString);
    expect(result).toEqual({
      role: 'user',
      content: 'Hello\nWorld\nThis is a\nmulti-line message'
    });
  });

  test('handles messages with colons in content', () => {
    const message: Message = {
      role: 'assistant',
      content: 'Here is a URL: https://example.com\nAnd another: ftp://server.com'
    };

    const serialized = MessageToLogString(message);
    const deserialized = LogStringToMessage(serialized);
    
    expect(deserialized).toEqual(message);
  });

  test('handles empty content', () => {
    const message: Message = {
      role: 'system',
      content: ''
    };

    const serialized = MessageToLogString(message);
    const deserialized = LogStringToMessage(serialized);
    
    expect(deserialized).toEqual(message);
  });

  test('handles content with only newlines', () => {
    const message: Message = {
      role: 'user',
      content: '\n\n\n'
    };

    const serialized = MessageToLogString(message);
    const deserialized = LogStringToMessage(serialized);
    
    expect(deserialized).toEqual(message);
  });
});

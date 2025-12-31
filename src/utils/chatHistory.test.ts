import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { MessageToLogString, LogStringToMessage, saveChatHistory, loadChatHistory, flushChatHistory } from './chatHistory';
import type { Message } from '../types';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from './config';

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

describe('Chat History Save/Load Integrity', () => {
  const historyPath = join(getConfigDir(), 'global-chat-history.log');

  afterEach(async () => {
    // Clean up test history file
    if (existsSync(historyPath)) {
      await unlink(historyPath);
    }
  });

  test('preserves message roles and content through save/load cycle', async () => {
    const originalMessages: Message[] = [
      { role: 'assistant', content: 'Hello! How can I help you?' },
      { role: 'user', content: 'Can you help me with something?' },
      { role: 'assistant', content: 'Of course! What do you need help with?' },
      { role: 'user', content: 'I want to create a new project' },
      { role: 'assistant', content: 'Sure! I can help you create a new project.' }
    ];

    // Save the messages
    await saveChatHistory(originalMessages);

    // Load them back
    const loadedMessages = await loadChatHistory();

    // Verify each message has the correct role and content
    expect(loadedMessages.length).toBe(originalMessages.length);
    for (let i = 0; i < originalMessages.length; i++) {
      expect(loadedMessages[i].role).toBe(originalMessages[i].role);
      expect(loadedMessages[i].content).toBe(originalMessages[i].content);
    }
  });

  test('does NOT replace assistant responses with user messages on exit', async () => {
    // Simulate a conversation that ends with /exit
    const conversation: Message[] = [
      { role: 'assistant', content: 'Hello! How can I help you?' },
      { role: 'user', content: 'What is the current project?' },
      { role: 'assistant', content: 'The current project is LLPM.' },
      { role: 'user', content: 'Thanks' },
      { role: 'assistant', content: 'You\'re welcome! Is there anything else?' },
      // User types /exit - this is a command, not added to history as user message
      { role: 'ui-notification', content: '✌️ Peace out!' } // exit command response
    ];

    // Save the conversation
    await saveChatHistory(conversation);

    // Load it back
    const loadedMessages = await loadChatHistory();

    // Verify assistant messages are still assistant messages, not replaced with user messages
    const assistantMessages = loadedMessages.filter(m => m.role === 'assistant');
    expect(assistantMessages.length).toBe(3);
    expect(assistantMessages[0].content).toBe('Hello! How can I help you?');
    expect(assistantMessages[1].content).toBe('The current project is LLPM.');
    expect(assistantMessages[2].content).toBe('You\'re welcome! Is there anything else?');

    // Verify user messages are still user messages
    const userMessages = loadedMessages.filter(m => m.role === 'user');
    expect(userMessages.length).toBe(2);
    expect(userMessages[0].content).toBe('What is the current project?');
    expect(userMessages[1].content).toBe('Thanks');

    // Verify ui-notification messages are preserved
    const notifications = loadedMessages.filter(m => m.role === 'ui-notification');
    expect(notifications.length).toBe(1);
    expect(notifications[0].content).toBe('✌️ Peace out!');
  });

  test('handles mixed message types correctly', async () => {
    const messages: Message[] = [
      { role: 'system', content: 'System initialized' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'Hi there' },
      { role: 'ui-notification', content: 'Command executed' },
      { role: 'assistant', content: 'How can I help?' },
      { role: 'user', content: 'Just testing' }
    ];

    await saveChatHistory(messages);
    const loaded = await loadChatHistory();

    expect(loaded).toEqual(messages);
  });

  test('does not corrupt roles when content contains role-like strings', async () => {
    // Edge case: content that looks like a role prefix
    const messages: Message[] = [
      { role: 'user', content: 'Tell me about the user: field in the database' },
      { role: 'assistant', content: 'The user: field stores user information' },
      { role: 'user', content: 'What about assistant: roles?' },
      { role: 'assistant', content: 'assistant: is a valid role type' }
    ];

    await saveChatHistory(messages);
    const loaded = await loadChatHistory();

    // Verify roles are preserved correctly
    expect(loaded[0].role).toBe('user');
    expect(loaded[1].role).toBe('assistant');
    expect(loaded[2].role).toBe('user');
    expect(loaded[3].role).toBe('assistant');

    // Verify content is preserved correctly
    expect(loaded).toEqual(messages);
  });

  test('flushChatHistory waits for pending saves to complete', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'Test message before exit' },
      { role: 'assistant', content: 'Response before exit' },
      { role: 'ui-notification', content: '✌️ Peace out!' }
    ];

    // Start an async save operation (don't await it yet)
    const savePromise = saveChatHistory(messages);

    // Immediately call flush - it should wait for the save to complete
    await flushChatHistory();

    // Now wait for the original save to complete
    await savePromise;

    // Load and verify the messages were saved correctly
    const loaded = await loadChatHistory();
    expect(loaded).toEqual(messages);
  });

  test('flushChatHistory does nothing when no pending saves', async () => {
    // This should not throw or hang
    await flushChatHistory();

    // Should be able to call multiple times
    await flushChatHistory();
    await flushChatHistory();
  });

  test('concurrent saves are serialized to prevent file corruption', async () => {
    const messages1: Message[] = [
      { role: 'user', content: 'First save message' },
      { role: 'assistant', content: 'First save response' }
    ];

    const messages2: Message[] = [
      { role: 'user', content: 'Second save message' },
      { role: 'assistant', content: 'Second save response' }
    ];

    // Start two saves concurrently (don't await)
    const save1 = saveChatHistory(messages1);
    const save2 = saveChatHistory(messages2);

    // Wait for both to complete
    await Promise.all([save1, save2]);

    // The last save should win (messages2)
    const loaded = await loadChatHistory();
    expect(loaded).toEqual(messages2);
  });
});

describe('Chat History Clear', () => {
  const historyPath = join(getConfigDir(), 'global-chat-history.log');

  afterEach(async () => {
    // Clean up test history file
    if (existsSync(historyPath)) {
      await unlink(historyPath);
    }
  });


  test('clearChatHistory removes all messages', async () => {
    // First save some messages
    const messages: Message[] = [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'Test response' }
    ];

    await saveChatHistory(messages);

    // Verify messages were saved
    let loaded = await loadChatHistory();
    expect(loaded.length).toBe(2);

    // Clear history - using dynamic import since it's not in the export list
    const { clearChatHistory } = await import('./chatHistory');
    await clearChatHistory();

    // Verify history is empty
    loaded = await loadChatHistory();
    expect(loaded.length).toBe(0);
  });

  test('clearChatHistory works when no history exists', async () => {
    // Make sure no history file exists
    if (existsSync(historyPath)) {
      await unlink(historyPath);
    }

    // Should not throw
    const { clearChatHistory } = await import('./chatHistory');
    await clearChatHistory();

    // Verify history is still empty
    const loaded = await loadChatHistory();
    expect(loaded.length).toBe(0);
  });

  test('saveChatHistory with empty array clears history', async () => {
    // First save some messages
    const messages: Message[] = [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'Test response' }
    ];

    await saveChatHistory(messages);

    // Verify messages were saved
    let loaded = await loadChatHistory();
    expect(loaded.length).toBe(2);

    // Save empty array
    await saveChatHistory([]);

    // Verify history is empty
    loaded = await loadChatHistory();
    expect(loaded.length).toBe(0);
  });
});

describe('Chat History Edge Cases', () => {
  const historyPath = join(getConfigDir(), 'global-chat-history.log');

  afterEach(async () => {
    // Clean up test history file
    if (existsSync(historyPath)) {
      await unlink(historyPath);
    }
  });

  test('loadChatHistory returns empty array when file does not exist', async () => {
    // Make sure no history file exists
    if (existsSync(historyPath)) {
      await unlink(historyPath);
    }

    const loaded = await loadChatHistory();
    expect(loaded).toEqual([]);
  });

  test('loadChatHistory truncates history to DEFAULT_HISTORY_SIZE', async () => {
    // Create more messages than DEFAULT_HISTORY_SIZE (which is 200)
    const messages: Message[] = [];
    for (let i = 0; i < 250; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      });
    }

    await saveChatHistory(messages);

    // Load should return at most DEFAULT_HISTORY_SIZE messages
    const loaded = await loadChatHistory();
    // DEFAULT_HISTORY_SIZE is 200
    expect(loaded.length).toBeLessThanOrEqual(200);
  });

  test('saveChatHistory truncates messages before saving', async () => {
    // Create more messages than DEFAULT_HISTORY_SIZE (200)
    const messages: Message[] = [];
    for (let i = 0; i < 250; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      });
    }

    await saveChatHistory(messages);

    // Reload and verify the most recent messages are saved
    const loaded = await loadChatHistory();
    // Should have the last 200 messages
    expect(loaded[loaded.length - 1].content).toBe('Message 249');
  });

  test('handles messages with special characters', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'Message with "quotes" and \'apostrophes\'' },
      { role: 'assistant', content: 'Message with <html> tags and & ampersand' },
      { role: 'user', content: 'Unicode: 你好 世界 🎉 émojis' },
      { role: 'assistant', content: 'Backslash \\ and tab\tand carriage\rreturn' }
    ];

    await saveChatHistory(messages);
    const loaded = await loadChatHistory();

    expect(loaded).toEqual(messages);
  });

  test('handles very long messages', async () => {
    // Create a message with 10000 characters
    const longContent = 'a'.repeat(10000);
    const messages: Message[] = [
      { role: 'user', content: longContent },
      { role: 'assistant', content: 'Short response' }
    ];

    await saveChatHistory(messages);
    const loaded = await loadChatHistory();

    expect(loaded[0].content).toBe(longContent);
    expect(loaded[1].content).toBe('Short response');
  });
});

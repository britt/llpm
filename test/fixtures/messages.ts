import type { Message } from '../../src/types';

/**
 * Pre-built message fixtures for testing.
 *
 * These provide standard test data that can be reused across multiple tests.
 */

export const userMessage: Message = {
  role: 'user',
  content: 'Hello! Can you help me with a task?'
};

export const assistantMessage: Message = {
  role: 'assistant',
  content: 'Of course! I\'d be happy to help you. What do you need assistance with?'
};

export const systemMessage: Message = {
  role: 'system',
  content: 'You are a helpful AI assistant.'
};

export const uiNotificationMessage: Message = {
  role: 'ui-notification',
  content: 'Project switched to: example-project'
};

export const conversationHistory: Message[] = [
  {
    role: 'system',
    content: 'You are a helpful AI assistant specialized in software development.'
  },
  {
    role: 'user',
    content: 'I need help debugging my TypeScript code.'
  },
  {
    role: 'assistant',
    content: 'I\'d be happy to help you debug your TypeScript code. Could you please share the code and describe the issue you\'re experiencing?'
  },
  {
    role: 'user',
    content: 'I\'m getting a type error on line 42.'
  },
  {
    role: 'assistant',
    content: 'Let me take a look at the type error. Please share the specific error message and the code around line 42.'
  }
];

/**
 * Factory functions for creating custom messages.
 *
 * These allow tests to create messages with custom content and optional IDs.
 */

export function createUserMessage(content: string, id?: string): Message {
  return {
    role: 'user',
    content,
    ...(id && { id })
  };
}

export function createAssistantMessage(content: string, id?: string): Message {
  return {
    role: 'assistant',
    content,
    ...(id && { id })
  };
}

export function createSystemMessage(content: string, id?: string): Message {
  return {
    role: 'system',
    content,
    ...(id && { id })
  };
}

export function createUiNotificationMessage(content: string, id?: string): Message {
  return {
    role: 'ui-notification',
    content,
    ...(id && { id })
  };
}

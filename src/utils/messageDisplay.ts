import type { Message } from '../types';
import { renderMarkdown, isASCIICapableTerminal } from './markdownRenderer';

/**
 * Get the display content for a message.
 * Extracted as a pure function for testability.
 */
export function getMessageDisplayContent(message: Message): string {
  const isSystemMessage = message.role === 'system';
  const isUINotification = message.role === 'ui-notification';
  const isUserMessage = message.role === 'user';
  const isAssistantMessage = message.role === 'assistant';

  // System messages: add "System:" prefix, no markdown
  if (isSystemMessage) {
    return `System: ${message.content}`;
  }

  // User messages: add "> " prefix, no markdown
  if (isUserMessage) {
    return `> ${message.content}`;
  }

  // Content with ANSI escape codes is already formatted for terminal display.
  // Passing it through cli-markdown garbles the codes and collapses newlines.
  if (message.content.includes('\x1b[')) {
    return message.content;
  }

  // For assistant AND ui-notification messages, render markdown if supported
  if ((isAssistantMessage || isUINotification) && isASCIICapableTerminal()) {
    try {
      return renderMarkdown(message.content);
    } catch (error) {
      console.error('Failed to render markdown:', error);
      return message.content;
    }
  }

  return message.content;
}

/**
 * Get the text color for a message based on its role.
 * Extracted as a pure function for testability.
 */
export function getMessageTextColor(message: Message): string {
  if (message.role === 'system' || message.role === 'ui-notification') {
    return '#cb9774';
  }
  if (message.role === 'user') {
    return 'white';
  }
  return 'brightWhite';
}

import type { Message } from '../types';

/**
 * Count the number of lines in a message's content
 * Uses newline-based counting (doesn't account for terminal wrapping)
 */
export function countMessageLines(message: Message): number {
  if (!message.content || message.content.length === 0) return 0;

  // Count newlines, plus 1 for the last line if it doesn't end with newline
  const newlineCount = (message.content.match(/\n/g) || []).length;
  const endsWithNewline = message.content.endsWith('\n');

  return endsWithNewline ? newlineCount : newlineCount + 1;
}

/**
 * Filter messages to only include those that fit within the last N lines
 * Returns the filtered messages and count of hidden lines
 */
export function filterMessagesByLines(
  messages: Message[],
  maxLines: number
): { visibleMessages: Message[]; hiddenLinesCount: number; totalLines: number } {
  if (maxLines <= 0) {
    // Return all messages if maxLines is 0 or negative
    const totalLines = messages.reduce((sum, msg) => sum + countMessageLines(msg), 0);
    return {
      visibleMessages: messages,
      hiddenLinesCount: 0,
      totalLines
    };
  }

  let totalLines = 0;
  let currentLines = 0;
  const visibleMessages: Message[] = [];

  // First pass: count total lines
  for (const message of messages) {
    totalLines += countMessageLines(message);
  }

  // If total is within limit, return all messages
  if (totalLines <= maxLines) {
    return {
      visibleMessages: messages,
      hiddenLinesCount: 0,
      totalLines
    };
  }

  // Second pass: collect messages from the end until we hit the limit
  // Work backwards through messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageLines = countMessageLines(message);

    // If adding this message would exceed the limit, stop
    if (currentLines + messageLines > maxLines) {
      break;
    }

    currentLines += messageLines;
    visibleMessages.unshift(message); // Add to beginning since we're going backwards
  }

  const hiddenLinesCount = totalLines - currentLines;

  return {
    visibleMessages,
    hiddenLinesCount,
    totalLines
  };
}

import type { Command, CommandResult, CommandContext } from './types';
import type { Message } from '../types';
import { debug } from '../utils/logger';

const DEFAULT_MESSAGE_COUNT = 20;

function sliceMessages(messages: Message[], count: number): Message[] {
  if (count >= messages.length) return [...messages];
  return messages.slice(-count);
}

export const historyCommand: Command = {
  name: 'history',
  description: 'View conversation history in a scrollable viewer',
  execute: async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    debug('Executing /history command with args:', args);
    const messages = context?.messages ?? [];

    // /history help
    if (args[0]?.toLowerCase() === 'help') {
      return {
        content: `## /history — View Conversation History

**Usage:**
- \`/history\` — View last ${DEFAULT_MESSAGE_COUNT} messages
- \`/history all\` — View complete history
- \`/history N\` — View last N messages
- \`/history help\` — Show this help

**Navigation:**
- \`↑/↓\` — Scroll one line
- \`Page Up/Page Down\` — Scroll one page
- \`Home/End\` — Jump to start/end
- \`/\` — Search
- \`n/N\` — Next/previous match
- \`q\` or \`Esc\` — Close viewer`,
        success: true,
      };
    }

    // /history all
    if (args[0]?.toLowerCase() === 'all') {
      if (messages.length === 0) {
        return { content: 'No messages in history.', success: true };
      }
      return {
        content: '',
        success: true,
        interactive: { type: 'history-view', messages: [...messages] },
      };
    }

    // /history (no args) — default
    if (args.length === 0) {
      if (messages.length === 0) {
        return { content: 'No messages in history.', success: true };
      }
      return {
        content: '',
        success: true,
        interactive: {
          type: 'history-view',
          messages: sliceMessages(messages, DEFAULT_MESSAGE_COUNT),
        },
      };
    }

    // /history N
    const count = parseInt(args[0], 10);
    if (isNaN(count) || count <= 0) {
      return {
        content: `Usage: /history [all | N | help]\n\nExamples:\n  /history      — last ${DEFAULT_MESSAGE_COUNT} messages\n  /history 50   — last 50 messages\n  /history all  — everything`,
        success: false,
      };
    }

    if (messages.length === 0) {
      return { content: 'No messages in history.', success: true };
    }

    return {
      content: '',
      success: true,
      interactive: {
        type: 'history-view',
        messages: sliceMessages(messages, count),
      },
    };
  },
};

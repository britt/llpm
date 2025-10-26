/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { Message } from '../types';

/**
 * Convert messages to a text transcript format
 */
function messagesToTranscript(messages: Message[]): string {
  return messages
    .map(msg => {
      const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
      const timestamp = new Date().toISOString();
      return `[${timestamp}] ${role}:\n${msg.content}\n`;
    })
    .join('\n');
}

/**
 * Export transcript to a file
 */
async function exportTranscript(messages: Message[]): Promise<CommandResult> {
  try {
    const transcript = messagesToTranscript(messages);
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `llpm-transcript-${timestamp}.txt`;
    const filepath = join(homedir(), '.llpm', filename);

    await writeFile(filepath, transcript, 'utf-8');

    return {
      content: `✅ Transcript exported to: ${filepath}\n\n📊 Total: ${messages.length} messages`,
      success: true
    };
  } catch (error) {
    return {
      content: `❌ Error exporting transcript: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false
    };
  }
}

export const historyCommand: Command = {
  name: 'history',
  description: 'Manage chat history display and export',
  execute: async (
    args: string[],
    context?: import('./types').CommandContext
  ): Promise<CommandResult> => {
    debug('Executing /history command with args:', args);

    // No arguments - show help
    if (args.length === 0) {
      return {
        content: `📜 Chat History Commands:

/history - Show this help message
/history help - Show this help message

📋 Available Subcommands:
• /history export - Export full transcript to a file
• /history all - Toggle showing all history (⚠️  Not yet implemented - use collapse indicator)
• /history tail <N> - Set number of lines to show (⚠️  Not yet implemented)

💡 Current Status:
The chat UI automatically shows only the last 300 lines of output by default.
When history is collapsed, you'll see an indicator like:
"Showing last 300 lines (1500 hidden) — /history all | /history export"

📝 Examples:
• /history export - Save full transcript to ~/.llpm/llpm-transcript-<timestamp>.txt`,
        success: true
      };
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'help':
        return historyCommand.execute([], context);

      case 'export':
        // TODO: Get actual messages from context
        // For now, return a helpful message
        return {
          content: `⚠️  Export functionality requires message context.

To export your chat history:
1. The full transcript export feature is being implemented
2. For now, you can see the collapse indicator when history is long
3. The indicator shows: "Showing last N lines (H hidden) — /history export"

💡 This feature will be available in the next update.`,
          success: false
        };

      case 'all':
        // TODO: This requires integration with App component state
        return {
          content: `⚠️  Toggle history view requires UI integration.

The collapse/expand functionality is available through the UI indicator:
• When you see "Showing last N lines (H hidden)" - history is collapsed
• Click or use the /history all command to expand (coming soon)

💡 For now, use the collapse indicator in the chat UI.`,
          success: false
        };

      case 'tail': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /history tail <number>\n\nExample: /history tail 500',
            success: false
          };
        }

        const tailSize = parseInt(args[1] || '', 10);
        if (isNaN(tailSize) || tailSize <= 0) {
          return {
            content: '❌ Tail size must be a positive number',
            success: false
          };
        }

        // TODO: This requires integration with App component state
        return {
          content: `⚠️  Setting tail size requires UI integration.

You tried to set tail size to: ${tailSize} lines

💡 This feature is coming soon. For now, the default is 300 lines.
You can override this with the environment variable:
  LLPM_CHAT_MAX_RENDER_LINES=${tailSize}`,
          success: false
        };
      }

      default:
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nUse /history help to see available commands.`,
          success: false
        };
    }
  }
};

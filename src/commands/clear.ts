import type { Command, CommandResult } from './types';
import { createNewSession } from '../utils/chatHistory';
import { debug } from '../utils/logger';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Start a new chat session (clears current conversation)',
  execute: async (args: string[] = []): Promise<CommandResult> => {
    debug('Executing /clear command with args:', args);

    // Handle help subcommand
    if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
      return {
        content: `🧹 Clear Command:

/clear - Start a new chat session (clears current conversation)
/clear help - Show this help message

📝 Description:
Clears the current conversation and starts a fresh session.
Previous conversations are automatically saved in ~/.llpm directory.`,
        success: true
      };
    }

    try {
      await createNewSession();

      return {
        content:
          '🧹 Chat session cleared! Starting fresh conversation.\n\n💡 Your previous conversations are saved in ~/.llpm',
        success: true
      };
    } catch (error) {
      debug('Error clearing session:', error);
      return {
        content: '❌ Failed to clear session. Please try again.',
        success: false
      };
    }
  }
};

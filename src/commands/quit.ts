import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { flushChatHistory } from '../utils/chatHistory';

export const quitCommand: Command = {
  name: 'quit',
  description: 'Exit the application',
  execute: async (args: string[] = []): Promise<CommandResult> => {
    debug('Executing /quit command with args:', args);

    // Handle help subcommand
    if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
      return {
        content: `👋 Quit Command:

/quit - Exit the application gracefully
/quit help - Show this help message

📝 Description:
Safely exits LLPM. Your conversation history and project settings are automatically saved.

💡 You can also use Ctrl+C to exit the application.`,
        success: true
      };
    }

    const message = '✌️ Peace out!';

    // Exit after ensuring chat history is saved
    // Skip process.exit in test environments or when vitest is running
    if (process.env.NODE_ENV !== 'test' &&
        process.env.CI !== 'true' &&
        typeof global !== 'undefined' &&
        !('__vitest_worker__' in global)) {
      // Wait for any pending saves to complete before exiting
      setTimeout(async () => {
        debug('Flushing chat history before exit');
        await flushChatHistory();
        debug('Exiting application');
        process.exit(0);
      }, 100);
    }

    return {
      content: message,
      success: true
    };
  }
};

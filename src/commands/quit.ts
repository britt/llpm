import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

export const quitCommand: Command = {
  name: 'quit',
  description: 'Exit the application',
  execute: (args: string[] = []): CommandResult => {
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

    // Exit after a short delay to allow the message to be displayed
    // Skip process.exit in test environments or when vitest is running
    if (process.env.NODE_ENV !== 'test' && 
        process.env.CI !== 'true' && 
        typeof global !== 'undefined' && 
        !('__vitest_worker__' in global)) {
      setTimeout(() => {
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

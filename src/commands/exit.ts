import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

export const exitCommand: Command = {
  name: 'exit',
  description: 'Exit the application (alias for /quit)',
  execute: (args: string[] = []): CommandResult => {
    debug('Executing /exit command with args:', args);

    // Handle help subcommand
    if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
      return {
        content: `👋 Exit Command:

/exit - Exit the application gracefully (alias for /quit)
/exit help - Show this help message

📝 Description:
Safely exits LLPM. Your conversation history and project settings are automatically saved.
This command is an alias for /quit.

💡 You can also use Ctrl+C to exit the application.`,
        success: true
      };
    }

    const message = '👋 Goodbye! Thanks for using LLPM.';

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

import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

export const quitCommand: Command = {
  name: 'quit',
  description: 'Exit the application',
  execute: (): CommandResult => {
    debug('Executing /quit command');

    const message = '👋 Goodbye! Thanks for using Claude PM.';

    // Exit after a short delay to allow the message to be displayed
    setTimeout(() => {
      debug('Exiting application');
      process.exit(0);
    }, 100);

    return {
      content: message,
      success: true
    };
  }
};

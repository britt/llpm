import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

export const exitCommand: Command = {
  name: 'exit',
  description: 'Exit the application (alias for /quit)',
  execute: (): CommandResult => {
    debug('Executing /exit command');

    const message = '👋 Goodbye! Thanks for using LLPM.';

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

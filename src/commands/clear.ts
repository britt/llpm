import type { Command, CommandResult } from './types';
import { createNewSession } from '../utils/chatHistory';
import { debug } from '../utils/logger';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Start a new chat session (clears current conversation)',
  execute: async (): Promise<CommandResult> => {
    debug('Executing /clear command');
    
    try {
      await createNewSession();
      
      return {
        content: '🧹 Chat session cleared! Starting fresh conversation.\n\n💡 Your previous conversations are saved in ~/.claude-pm',
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
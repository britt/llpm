import type { Command, CommandResult } from './types';
import { getCommandRegistry } from './registry';
import { debug } from '../utils/logger';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands',
  execute: (): CommandResult => {
    debug('Executing /help command');
    
    const registry = getCommandRegistry();
    const commands = Object.values(registry);
    
    const helpText = [
      '🔧 Available Commands:',
      '',
      ...commands.map(cmd => `/${cmd.name} - ${cmd.description}`),
      '',
      '💬 Regular messages are sent to the AI assistant.',
      '⌨️  Use Ctrl+C to exit or type /quit'
    ].join('\n');

    debug('Help command result with', commands.length, 'commands');
    
    return {
      content: helpText,
      success: true
    };
  }
};
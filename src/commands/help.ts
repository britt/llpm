import type { Command, CommandResult } from './types';
import { getCommandRegistry } from './registry';
import { debug } from '../utils/logger';

export const helpCommand: Command = {
  name: 'help',
  description: 'Show available commands',
  execute: (args: string[] = []): CommandResult => {
    debug('Executing /help command with args:', args);

    // Handle help subcommand
    if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
      return {
        content: `❓ Help Command:

/help - Show available commands and shortcuts
/help help - Show this help message

📝 Description:
Displays a comprehensive list of all available commands, keyboard shortcuts, and usage information.

💡 Most commands also support a 'help' subcommand (e.g., /project help).`,
        success: true
      };
    }

    const registry = getCommandRegistry();
    const commands = Object.values(registry);

    const helpText = [
      '🔧 Available Commands:',
      '',
      ...commands.map(cmd => `/${cmd.name} - ${cmd.description}`),
      '',
      '💡 Get detailed help for any command with: /<command> help',
      '📋 Example sub-commands:',
      '• /project help - Show project management help',
      '• /model help - Show model configuration help',
      '• /info prompt - Display the current system prompt',
      '',
      '⌨️  Keyboard Shortcuts:',
      '• Ctrl+A - Move cursor to beginning of input',
      '• Ctrl+E - Move cursor to end of input',
      '• Ctrl+U - Clear input line',
      '• Shift+Tab - Switch project',
      '• Up/Down arrows - Navigate input history',
      '• Ctrl+C - Exit application',
      '',
      '💬 Regular messages are sent to the AI assistant.',
      '📝 Type /quit to exit gracefully'
    ].join('\n');

    debug('Help command result with', commands.length, 'commands');

    return {
      content: helpText,
      success: true
    };
  }
};

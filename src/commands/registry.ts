import type { CommandRegistry } from './types';
import { infoCommand } from './info';
import { helpCommand } from './help';
import { quitCommand } from './quit';
import { exitCommand } from './exit';
import { clearCommand } from './clear';
import { projectCommand } from './project';
import { githubCommand } from './github';
import { debugCommand } from './debug';
import { modelCommand } from './model';
import { debug } from '../utils/logger';

const commandRegistry: CommandRegistry = {
  info: infoCommand,
  help: helpCommand,
  quit: quitCommand,
  exit: exitCommand,
  clear: clearCommand,
  project: projectCommand,
  github: githubCommand,
  debug: debugCommand,
  model: modelCommand
};

export function getCommandRegistry(): CommandRegistry {
  return commandRegistry;
}

export function parseCommand(input: string): {
  isCommand: boolean;
  command?: string;
  args?: string[];
} {
  if (!input.startsWith('/')) {
    return { isCommand: false };
  }

  const trimmed = input.slice(1).trim();
  if (!trimmed) {
    return { isCommand: false };
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  debug('Parsed command:', command, 'with args:', args);

  return {
    isCommand: true,
    command,
    args
  };
}

export async function executeCommand(command: string, args: string[] = []) {
  debug('Executing command:', command, 'with args:', args);

  const registry = getCommandRegistry();
  const cmd = registry[command];

  if (!cmd) {
    debug('Command not found:', command);
    return {
      content: `❌ Unknown command: /${command}\nType /help to see available commands.`,
      success: false
    };
  }

  try {
    const result = await cmd.execute(args);
    debug('Command execution result:', result.success ? 'success' : 'failure');
    return result;
  } catch (error) {
    debug('Command execution error:', error);
    return {
      content: `❌ Error executing command /${command}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false
    };
  }
}

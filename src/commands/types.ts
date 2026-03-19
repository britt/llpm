import type { Message } from '../types';

export interface CommandResult {
  content: string;
  success: boolean;
  interactive?: {
    type: 'model-select';
    models: Array<{
      id: string;
      label: string;
      value: string;
    }>;
  } | {
    type: 'history-view';
    messages: Message[];
  };
}

export interface CommandContext {
  messageCount?: number;
  messages?: Message[];
}

export interface Command {
  name: string;
  description: string;
  execute: (args: string[], context?: CommandContext) => Promise<CommandResult> | CommandResult;
}

export interface CommandRegistry {
  [key: string]: Command;
}

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
  };
}

export interface CommandContext {
  messageCount?: number;
}

export interface Command {
  name: string;
  description: string;
  execute: (args: string[], context?: CommandContext) => Promise<CommandResult> | CommandResult;
}

export interface CommandRegistry {
  [key: string]: Command;
}

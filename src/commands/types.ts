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

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => Promise<CommandResult> | CommandResult;
}

export interface CommandRegistry {
  [key: string]: Command;
}

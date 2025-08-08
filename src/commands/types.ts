export interface CommandResult {
  content: string;
  success: boolean;
}

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => Promise<CommandResult> | CommandResult;
}

export interface CommandRegistry {
  [key: string]: Command;
}
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, any>) => Promise<string>;
}

export interface ToolRegistry {
  [key: string]: ToolDefinition;
}
import type { Tool as CoreTool } from 'ai';

// Use the AI SDK's CoreTool type instead of custom types
export interface ToolRegistry {
  [key: string]: CoreTool;
}

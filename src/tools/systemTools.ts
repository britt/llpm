/**
 * System Tools
 *
 * These tools are exposed to the LLM for system management operations.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import * as z from "zod";
import { getSystemPrompt } from '../utils/systemPrompt';
import { debug } from '../utils/logger';

/**
 * @prompt Tool: get_system_prompt
 * Description sent to LLM explaining when to use this tool.
 */
export const getSystemPromptTool = tool({
  description: 'Get the currently loaded system prompt text',
  inputSchema: z.object({}),
  execute: async () => {
    debug('Executing get_system_prompt tool');

    try {
      const systemPrompt = await getSystemPrompt();
      
      return {
        success: true,
        prompt: systemPrompt,
        message: 'Successfully retrieved system prompt'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
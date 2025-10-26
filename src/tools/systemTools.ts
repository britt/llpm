import { tool } from './instrumentedTool';
import * as z from 'zod';
import { getSystemPrompt } from '../utils/systemPrompt';
import { debug } from '../utils/logger';

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

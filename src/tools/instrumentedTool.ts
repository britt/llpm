import { tool as baseTool } from 'ai';
import { RequestContext } from '../utils/requestContext';
import { debug } from '../utils/logger';

/**
 * Instrumented version of the AI SDK's tool function that adds request logging
 */
export function tool<T extends { description: string; inputSchema: any; execute: (...args: any[]) => any }>(
  config: T
): ReturnType<typeof baseTool> {
  // Extract the tool name from the description (first few words)
  const toolName = config.description.split(' ').slice(0, 3).join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  // Wrap the execute function with logging
  const instrumentedConfig = {
    ...config,
    execute: async (args: any) => {
      // Log tool call start
      RequestContext.logToolCall(toolName, 'start', args);
      debug(`Tool ${toolName} started with args:`, args);
      
      try {
        // Execute the original function
        const result = await config.execute(args);
        
        // Log tool call success
        RequestContext.logToolCall(toolName, 'end', args, result);
        debug(`Tool ${toolName} completed successfully`);
        
        return result;
      } catch (error) {
        // Log tool call error
        const errorMessage = error instanceof Error ? error.message : String(error);
        RequestContext.logToolCall(toolName, 'end', args, undefined, errorMessage);
        debug(`Tool ${toolName} failed:`, error);
        
        // Re-throw the error
        throw error;
      }
    }
  };
  
  // Create and return the instrumented tool
  return baseTool(instrumentedConfig);
}
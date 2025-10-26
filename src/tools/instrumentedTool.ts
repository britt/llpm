import { tool as baseTool } from 'ai';
import { RequestContext } from '../utils/requestContext';
import { debug } from '../utils/logger';
import { traced } from '../utils/tracing';

/**
 * Instrumented version of the AI SDK's tool function that adds request logging and OpenTelemetry tracing
 */
export function tool<
  T extends {
    name?: string;
    description: string;
    inputSchema?: unknown;
    parameters?: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (args: any) => any;
  }
>(config: T): ReturnType<typeof baseTool> {
  // Use the explicit tool name from config, or auto-generate from description if not provided
  const toolName =
    config.name ||
    config.description
      .split(' ')
      .slice(0, 3)
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

  // Wrap the execute function with logging and tracing
  const instrumentedConfig = {
    ...config,
    execute: async (args: unknown) => {
      return traced(
        `tool.${toolName}`,
        {
          attributes: {
            'tool.name': toolName,
            'tool.description': config.description,
            'tool.args': JSON.stringify(args).substring(0, 500) // Limit arg length
          },
          openInferenceKind: 'TOOL' // Phoenix UI span kind for tool executions
        },
        async span => {
          // Log tool call start
          RequestContext.logToolCall(toolName, 'start', args);
          debug(`Tool ${toolName} started with args:`, args);

          try {
            // Execute the original function
            const result = await config.execute(args);

            // Add result metadata to span
            if (result && typeof result === 'object') {
              if ('success' in result) {
                span.setAttribute('tool.success', result.success);
              }
              if ('error' in result) {
                span.setAttribute('tool.error', String(result.error));
              }
            }
            const resultStr = JSON.stringify(result);
            span.setAttribute('tool.result.length', resultStr.length);

            // Log tool call success
            RequestContext.logToolCall(toolName, 'end', args, result);
            debug(`Tool ${toolName} completed successfully`);

            return result;
          } catch (error) {
            // Log tool call error
            const errorMessage = error instanceof Error ? error.message : String(error);
            RequestContext.logToolCall(toolName, 'end', args, undefined, errorMessage);
            debug(`Tool ${toolName} failed:`, error);

            // Re-throw the error (traced() will record it)
            throw error;
          }
        }
      );
    }
  };

  // Create and return the instrumented tool
  return baseTool(instrumentedConfig);
}

import { generateText, streamText, stepCountIs, type ModelMessage } from 'ai';
import type { Message } from '../types';
import { debug, getVerbose } from '../utils/logger';
import { getToolRegistry } from '../tools/registry';
import { getSystemPrompt } from '../utils/systemPrompt';
import { modelRegistry } from './modelRegistry';
import { RequestContext } from '../utils/requestContext';
import { traced } from '../utils/tracing';

const MAX_STEPS = 10;

export async function generateResponse(messages: Message[]): Promise<string> {
  debug('generateResponse called with', messages.length, 'messages');
  debug('Last message:', messages[messages.length - 1]);

  return traced('llm.generateResponse', {
    attributes: {
      'message.count': messages.length,
      'message.last_role': messages[messages.length - 1]?.role || 'unknown',
    }
  }, async (span) => {
    try {
      const model = await modelRegistry.createLanguageModel();
      const currentModel = modelRegistry.getCurrentModel();

      span.setAttribute('llm.provider', currentModel.provider);
      span.setAttribute('llm.model', currentModel.modelId);
      span.setAttribute('llm.model_display', currentModel.displayName);

      const systemPromptContent = await getSystemPrompt();
      const systemMessage = {
        role: 'system' as const,
        content: systemPromptContent
      };

      const allMessages : ModelMessage[] = [
        systemMessage,
        ...messages.filter(msg => msg.role !== 'ui-notification').map(msg => ({
          role: msg.role,
          content: msg.content
        } as ModelMessage))
      ];

      const tools = await getToolRegistry();
      const toolCount = Object.keys(tools).length;
      span.setAttribute('llm.tools.count', toolCount);

      debug(
        'Calling AI API with model:',
        currentModel.displayName,
        '(' + currentModel.provider + '/' + currentModel.modelId + ')',
        'and',
        toolCount,
        'tools'
      );

      // Log LLM call start
      RequestContext.logLLMCall('start', `${currentModel.provider}/${currentModel.modelId}`);

      const result = await generateText({
        model,
        messages: allMessages,
        tools,
        toolChoice: 'auto',
        stopWhen: [stepCountIs(MAX_STEPS)]
      });

      // Log LLM call end with token counts if available
      const metadata: any = { status: 200 };
      if (result.usage) {
        metadata.tokensIn = (result.usage as any).promptTokens || (result.usage as any).totalTokens;
        metadata.tokensOut = (result.usage as any).completionTokens;

        // Add token counts to span
        span.setAttribute('llm.usage.prompt_tokens', metadata.tokensIn || 0);
        span.setAttribute('llm.usage.completion_tokens', metadata.tokensOut || 0);
        span.setAttribute('llm.usage.total_tokens', (metadata.tokensIn || 0) + (metadata.tokensOut || 0));
      }
      RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, metadata);

      debug('AI SDK result text:', JSON.stringify(result.text));
      debug('Steps count:', result.steps?.length || 0);

      // Collect all tool calls and results from all steps
      const allToolCalls: any[] = [];
      const allToolResults: any[] = [];
      const toolNames = new Set<string>();

      if (result.steps) {
        for (const step of result.steps) {
          if (step.toolCalls) {
            allToolCalls.push(...step.toolCalls);
            step.toolCalls.forEach(tc => toolNames.add(tc.toolName));
          }
          if (step.toolResults) {
            allToolResults.push(...step.toolResults);
          }
        }
      }

      debug('Tool calls across all steps:', allToolCalls.length);
      debug('Tool results across all steps:', allToolResults.length);
      debug('Unique tools called:', Array.from(toolNames).join(', '));

      // Record tool call statistics
      span.setAttribute('llm.steps.count', result.steps?.length || 0);
      span.setAttribute('llm.tool_calls.count', allToolCalls.length);
      span.setAttribute('llm.tool_results.count', allToolResults.length);
      if (toolNames.size > 0) {
        span.setAttribute('llm.tool_calls.tools', Array.from(toolNames).join(','));
      }
      span.setAttribute('llm.response.length', result.text?.length || 0);

      // Check for user messages in tool results that should be displayed directly
      const userMessages: string[] = [];
      for (const toolResult of allToolResults) {
        if (toolResult.output && typeof toolResult.output === 'object') {
          const resultObj = toolResult.output as any;
          if (resultObj.userMessage) {
            userMessages.push(resultObj.userMessage);
          }
        }
      }

      // If we have user messages, prepend them to the AI's response
      if (userMessages.length > 0) {
        const userMessageSection = userMessages.join('\n\n---\n\n');
        return userMessageSection + '\n\n' + result.text;
      }

      return result.text;
    } catch (error) {
      // Log LLM error
      const currentModel = modelRegistry.getCurrentModel();
      RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, {
        error: error instanceof Error ? error.message : String(error)
      });

      debug('Error in generateResponse:', error);
      console.error('Error generating response:', error);

      let errorMessage = 'Sorry, I encountered an error while processing your request.';

      if (getVerbose() && error instanceof Error) {
        errorMessage += `\n\n🔍 Debug Details:\n${error.name}: ${error.message}`;
        if (error.stack) {
          errorMessage += `\n\nStack trace:\n${error.stack}`;
        }
      }

      throw error; // Re-throw so traced() can record the error
    }
  });
}

export async function* streamResponse(messages: ModelMessage[]) {
  try {
    const model = await modelRegistry.createLanguageModel();
    const currentModel = modelRegistry.getCurrentModel();
    
    // Log streaming LLM call start
    RequestContext.logLLMCall('start', `${currentModel.provider}/${currentModel.modelId}`);
    
    const { textStream } = await streamText({
      model,
      messages
    });

    for await (const delta of textStream) {
      yield delta;
    }
    
    // Log streaming LLM call end
    RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, { status: 200 });
  } catch (error) {
    // Log streaming LLM error  
    const errorModel = modelRegistry.getCurrentModel();
    RequestContext.logLLMCall('end', `${errorModel.provider}/${errorModel.modelId}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    console.error('Error streaming response:', error);

    let errorMessage = 'Sorry, I encountered an error while processing your request.';

    if (getVerbose() && error instanceof Error) {
      errorMessage += `\n\n🔍 Debug Details:\n${error.name}: ${error.message}`;
      if (error.stack) {
        errorMessage += `\n\nStack trace:\n${error.stack}`;
      }
    }

    yield errorMessage;
  }
}

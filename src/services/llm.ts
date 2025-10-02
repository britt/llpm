import { generateText, streamText, stepCountIs, type ModelMessage } from 'ai';
import type { Message } from '../types';
import { debug, getVerbose } from '../utils/logger';
import { getToolRegistry } from '../tools/registry';
import { getSystemPrompt } from '../utils/systemPrompt';
import { modelRegistry } from './modelRegistry';
import { RequestContext } from '../utils/requestContext';

const MAX_STEPS = 10;

export async function generateResponse(messages: Message[]): Promise<string> {
  debug('generateResponse called with', messages.length, 'messages');
  debug('Last message:', messages[messages.length - 1]);

  try {
    const model = await modelRegistry.createLanguageModel();
    const currentModel = modelRegistry.getCurrentModel();
    
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
    debug(
      'Calling AI API with model:',
      currentModel.displayName,
      '(' + currentModel.provider + '/' + currentModel.modelId + ')',
      'and',
      Object.keys(tools).length,
      'tools'
    );

    // Debug: Check tool schemas
    if (getVerbose()) {
      Object.entries(tools).forEach(([name, tool]) => {
        debug(`Tool ${name}:`, {
          hasParameters: 'parameters' in tool,
          parametersType: tool.parameters?.type,
          parametersShape: tool.parameters?.shape
        });
      });
    }

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
    }
    RequestContext.logLLMCall('end', `${currentModel.provider}/${currentModel.modelId}`, metadata);

    debug('AI SDK result text:', JSON.stringify(result.text));
    debug('Tool calls present:', result.toolCalls?.length || 0);
    debug('Tool results present:', result.toolResults?.length || 0);

    // Check for user messages in tool results that should be displayed directly
    const userMessages: string[] = [];
    if (result.toolResults) {
      for (const toolResult of result.toolResults) {
        if (toolResult.result && typeof toolResult.result === 'object') {
          const resultObj = toolResult.result as any;
          if (resultObj.userMessage) {
            userMessages.push(resultObj.userMessage);
          }
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

    return errorMessage;
  }
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

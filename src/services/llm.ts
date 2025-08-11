import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Message } from '../types';
import { debug, getVerbose } from '../utils/logger';
import { getToolRegistry } from '../tools/registry';
import { getSystemPrompt } from '../utils/systemPrompt';

const model = openai('gpt-4o-mini');

export async function generateResponse(messages: Message[]): Promise<string> {
  debug('generateResponse called with', messages.length, 'messages');
  debug('Last message:', messages[messages.length - 1]);
  
  try {
    const systemPromptContent = await getSystemPrompt();
    const systemMessage = {
      role: 'system' as const,
      content: systemPromptContent
    };
    
    const allMessages = [systemMessage, ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))];
    
    const tools = getToolRegistry();
    debug('Calling OpenAI API with model:', model.modelId, 'and', Object.keys(tools).length, 'tools');
    
    const result = await generateText({
      model,
      messages: allMessages,
      tools,
      toolChoice: 'auto',
    });

    // The AI SDK handles tool calls automatically when using the tool() helper
    let finalResponse = result.text;

    debug('Generated response length:', finalResponse.length);
    debug('Generated response preview:', finalResponse.substring(0, 100));
    return finalResponse;
  } catch (error) {
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

export async function* streamResponse(messages: Message[]) {
  try {
    const { textStream } = await streamText({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      maxTokens: 1000,
    });

    for await (const delta of textStream) {
      yield delta;
    }
  } catch (error) {
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
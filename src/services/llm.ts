import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Message } from '../types';
import { debug } from '../utils/logger';
import { getToolDefinitions, executeTool } from '../tools/registry';

// You can switch providers by changing this:
// import { anthropic } from '@ai-sdk/anthropic';
// import { google } from '@ai-sdk/google';

const model = openai('gpt-4o-mini'); // or anthropic('claude-3-sonnet-20240229')

export async function generateResponse(messages: Message[]): Promise<string> {
  debug('generateResponse called with', messages.length, 'messages');
  debug('Last message:', messages[messages.length - 1]);
  
  try {
    const systemMessage = {
      role: 'system' as const,
      content: 'You are Claude PM, an AI-powered project manager assistant. You can help manage multiple projects and their configurations. When users ask about project management tasks, you can use the available tools to help them. You have access to tools for managing projects: getting current project info, listing projects, adding new projects, switching between projects, and removing projects. Always be helpful and provide clear explanations of what you\'re doing.'
    };
    
    const allMessages = [systemMessage, ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))];
    
    debug('Calling OpenAI API with model:', model.modelId, 'and tools');
    const result = await generateText({
      model,
      messages: allMessages,
      tools: getToolDefinitions(),
      maxTokens: 1000,
    });

    // Handle tool calls
    let finalResponse = result.text;
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      debug('Processing', result.toolCalls.length, 'tool calls');
      
      const toolResults = [];
      for (const toolCall of result.toolCalls) {
        debug('Executing tool:', toolCall.toolName, 'with params:', toolCall.args);
        const toolResult = await executeTool(toolCall.toolName, toolCall.args);
        toolResults.push(toolResult);
      }
      
      // If we have tool results, we need to make another call to get the final response
      if (toolResults.length > 0) {
        const toolMessages = [
          ...allMessages,
          {
            role: 'assistant' as const,
            content: result.text,
            toolCalls: result.toolCalls
          },
          ...result.toolCalls.map((toolCall, index) => ({
            role: 'tool' as const,
            content: toolResults[index],
            toolCallId: toolCall.toolCallId
          }))
        ];
        
        const finalResult = await generateText({
          model,
          messages: toolMessages,
          maxTokens: 1000,
        });
        
        finalResponse = finalResult.text;
      }
    }

    debug('Generated response length:', finalResponse.length);
    debug('Generated response preview:', finalResponse.substring(0, 100));
    return finalResponse;
  } catch (error) {
    debug('Error in generateResponse:', error);
    console.error('Error generating response:', error);
    return 'Sorry, I encountered an error while processing your request.';
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
    yield 'Sorry, I encountered an error while processing your request.';
  }
}
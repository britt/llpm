import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Message } from '../types';

// You can switch providers by changing this:
// import { anthropic } from '@ai-sdk/anthropic';
// import { google } from '@ai-sdk/google';

const model = openai('gpt-4o-mini'); // or anthropic('claude-3-sonnet-20240229')

export async function generateResponse(messages: Message[]): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      maxTokens: 1000,
    });

    return text;
  } catch (error) {
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
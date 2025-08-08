import { useState, useCallback } from 'react';
import type { Message } from '../types';
import { generateResponse } from '../services/llm';
import { debug } from '../utils/logger';
import { parseCommand, executeCommand } from '../commands/registry';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    debug('sendMessage called with:', content);
    
    // Check if this is a command
    const parsed = parseCommand(content);
    
    if (parsed.isCommand) {
      debug('Processing command:', parsed.command);
      setIsLoading(true);
      
      try {
        const result = await executeCommand(parsed.command!, parsed.args!);
        const responseMessage: Message = {
          role: 'system',
          content: result.content
        };
        setMessages(prev => [...prev, responseMessage]);
        debug('Added command response to state');
      } catch (error) {
        debug('Error executing command:', error);
        const errorMessage: Message = {
          role: 'system',
          content: '❌ Failed to execute command. Please try again.'
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Handle regular chat messages
    const userMessage: Message = { role: 'user', content };
    
    debug('Adding user message to state');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    debug('Set loading state to true');

    try {
      const allMessages = [...messages, userMessage];
      debug('Sending', allMessages.length, 'messages to LLM');
      const response = await generateResponse(allMessages);
      
      debug('Received response from LLM');
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
      debug('Added assistant response to state');
    } catch (error) {
      debug('Error in sendMessage:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
      debug('Added error message to state');
    } finally {
      setIsLoading(false);
      debug('Set loading state to false');
    }
  }, [messages]);

  return {
    messages,
    sendMessage,
    isLoading
  };
}
import { useState, useCallback } from 'react';
import { Message } from '../types';
import { generateResponse } from '../services/llm';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Claude PM, your AI assistant. How can I help you today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMessage];
      const response = await generateResponse(allMessages);
      
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return {
    messages,
    sendMessage,
    isLoading
  };
}
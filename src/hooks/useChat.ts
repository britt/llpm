import { useState, useCallback, useEffect } from 'react';
import type { Message } from '../types';
import { generateResponse } from '../services/llm';
import { debug, getVerbose } from '../utils/logger';
import { parseCommand, executeCommand } from '../commands/registry';
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory';
import { getCurrentProject } from '../utils/projectConfig';

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  // Load chat history on component mount and when project changes
  useEffect(() => {
    const initializeChatHistory = async () => {
      debug('Initializing chat history');
      try {
        // Check if project changed
        const currentProject = await getCurrentProject();
        const newProjectId = currentProject?.id || null;
        
        if (currentProjectId !== newProjectId) {
          debug('Project changed from', currentProjectId, 'to', newProjectId);
          setCurrentProjectId(newProjectId);
          setHistoryLoaded(false);
        }
        
        const savedMessages = await loadChatHistory();
        
        if (savedMessages.length === 0) {
          // No saved history, use welcome message
          const welcomeMessage: Message = {
            role: 'assistant',
            content: 'Hello! I\'m Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.',
            id: generateMessageId()
          };
          setMessages([welcomeMessage]);
          debug('No saved history found, using welcome message');
        } else {
          // Load saved history and ensure all messages have IDs
          const messagesWithIds = savedMessages.map(msg => ({
            ...msg,
            id: msg.id || generateMessageId()
          }));
          setMessages(messagesWithIds);
          debug('Loaded', savedMessages.length, 'messages from history');
        }
      } catch (error) {
        debug('Error loading chat history:', error);
        // Fallback to welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content: 'Hello! I\'m Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.',
          id: generateMessageId()
        };
        setMessages([welcomeMessage]);
      } finally {
        setHistoryLoaded(true);
      }
    };
    
    initializeChatHistory();
  }, [currentProjectId]);
  
  // Check for project changes periodically (every 2 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const currentProject = await getCurrentProject();
        const newProjectId = currentProject?.id || null;
        
        if (currentProjectId !== newProjectId) {
          debug('Project changed detected, reloading chat history');
          setCurrentProjectId(newProjectId);
          // The dependency array will trigger the above useEffect to reload history
        }
      } catch (error) {
        debug('Error checking for project changes:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentProjectId]);
  
  // Save messages whenever they change (after history is loaded)
  useEffect(() => {
    if (historyLoaded && messages.length > 0) {
      debug('Saving updated chat history');
      saveChatHistory(messages).catch(error => {
        debug('Failed to save chat history:', error);
      });
    }
  }, [messages, historyLoaded]);

  const sendMessage = useCallback(async (content: string) => {
    debug('sendMessage called with:', content);
    
    // Check if this is a command
    const parsed = parseCommand(content);
    
    if (parsed.isCommand) {
      debug('Processing command:', parsed.command);
      setIsLoading(true);
      
      try {
        const result = await executeCommand(parsed.command!, parsed.args!);
        
        // Special handling for clear command
        if (parsed.command === 'clear' && result.success) {
          // Clear messages and show welcome message
          const welcomeMessage: Message = {
            role: 'assistant',
            content: 'Hello! I\'m Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.',
            id: generateMessageId()
          };
          setMessages([welcomeMessage]);
          debug('Cleared messages and reset to welcome message');
        } else {
          const responseMessage: Message = {
            role: 'system',
            content: result.content,
            id: generateMessageId()
          };
          setMessages(prev => [...prev, responseMessage]);
          debug('Added command response to state');
        }
      } catch (error) {
        debug('Error executing command:', error);
        
        let errorContent = '❌ Failed to execute command. Please try again.';
        
        if (getVerbose() && error instanceof Error) {
          errorContent += `\n\n🔍 Debug Details:\n${error.name}: ${error.message}`;
          if (error.stack) {
            errorContent += `\n\nStack trace:\n${error.stack}`;
          }
        }
        
        const errorMessage: Message = {
          role: 'system',
          content: errorContent,
          id: generateMessageId()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Handle regular chat messages
    const userMessage: Message = { role: 'user', content, id: generateMessageId() };
    
    debug('Adding user message to state');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    debug('Set loading state to true');

    try {
      const allMessages = [...messages, userMessage];
      debug('Sending', allMessages.length, 'messages to LLM');
      const response = await generateResponse(allMessages);
      
      debug('Received response from LLM');
      const assistantMessage: Message = { role: 'assistant', content: response, id: generateMessageId() };
      setMessages(prev => [...prev, assistantMessage]);
      debug('Added assistant response to state');
    } catch (error) {
      debug('Error in sendMessage:', error);
      
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      
      if (getVerbose() && error instanceof Error) {
        errorContent += `\n\n🔍 Debug Details:\n${error.name}: ${error.message}`;
        if (error.stack) {
          errorContent += `\n\nStack trace:\n${error.stack}`;
        }
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent,
        id: generateMessageId()
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
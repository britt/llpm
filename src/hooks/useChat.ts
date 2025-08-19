import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { generateResponse } from '../services/llm';
import { debug, getVerbose } from '../utils/logger';
import { parseCommand, executeCommand } from '../commands/registry';
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory';
import { getCurrentProject } from '../utils/projectConfig';

let messageCounter = 0;
function generateMessageId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  
  // Keep ref in sync with messages
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
            content:
              "Hello! I'm Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.",
            id: generateMessageId()
          };
          setMessages([welcomeMessage]);
          debug('No saved history found, using welcome message');
        } else {
          // Load saved history and ensure all messages have unique IDs
          const messagesWithIds = savedMessages.map((msg, index) => ({
            ...msg,
            id: msg.id && msg.id.trim() ? msg.id : `loaded-${index}-${generateMessageId()}`
          }));
          setMessages(messagesWithIds);
          debug('Loaded', savedMessages.length, 'messages from history');
        }
      } catch (error) {
        debug('Error loading chat history:', error);
        // Fallback to welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content:
            "Hello! I'm Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.",
          id: generateMessageId()
        };
        setMessages([welcomeMessage]);
      } finally {
        setHistoryLoaded(true);
      }
    };

    initializeChatHistory();
  }, [currentProjectId]);

  // Check for project changes periodically (every 10 seconds to reduce UI churn)
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
    }, 10000);

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

  const sendMessage = useCallback(
    async (content: string) => {
      debug('sendMessage called with:', content);

      // Check if this is a command
      const parsed = parseCommand(content);

      if (parsed.isCommand) {
        debug('Processing command:', parsed.command);
        setIsLoading(true);

        try {
          const result = await executeCommand(parsed.command as string, parsed.args as string[]);

          // Special handling for clear command
          if (parsed.command === 'clear' && result.success) {
            // Clear messages and show welcome message
            const welcomeMessage: Message = {
              role: 'assistant',
              content:
                "Hello! I'm Claude PM, your AI assistant. How can I help you today?\n\n💡 Type /help to see available commands.",
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
        const allMessages = [...messagesRef.current, userMessage];
        debug('Sending', allMessages.length, 'messages to LLM');
        const response = await generateResponse(allMessages);

        debug('Received response from LLM, length:', response?.length || 0);
        debug('Response content preview:', response?.substring(0, 50) || 'EMPTY');

        // Ensure we have a response before adding it
        const responseContent =
          response && response.trim()
            ? response
            : "I processed your request but don't have anything specific to report.";

        const assistantMessage: Message = {
          role: 'assistant',
          content: responseContent,
          id: generateMessageId()
        };
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
    },
    [] // Remove messages dependency to prevent recreation on every message
  );

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: Message = {
      role: 'system',
      content,
      id: generateMessageId()
    };
    setMessages(prev => [...prev, systemMessage]);
    debug('Added system message');
  }, []);

  return {
    messages,
    sendMessage,
    addSystemMessage,
    isLoading
  };
}

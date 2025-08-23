import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { generateResponse } from '../services/llm';
import { debug, getVerbose } from '../utils/logger';
import { parseCommand, executeCommand } from '../commands/registry';
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory';
import { getCurrentProject } from '../utils/projectConfig';
import type { ModelSelectCommand } from '../types/models';

interface QueuedMessage {
  id: string;
  content: string;
  timestamp: number;
}

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
  const [interactiveCommand, setInteractiveCommand] = useState<ModelSelectCommand | null>(null);
  
  // Message queue state
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesRef = useRef<Message[]>([]);
  const processingRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);


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
              "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands.",
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
            "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands.",
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

  // Process a message immediately (internal function)
  const processMessageImmediate = useCallback(
    async (content: string) => {
      debug('processMessageImmediate called with:', content);

      // Check if this is a command
      const parsed = parseCommand(content);

      if (parsed.isCommand) {
        debug('Processing command:', parsed.command);
        setIsLoading(true);

        try {
          const result = await executeCommand(parsed.command as string, parsed.args as string[]);

          // Check for interactive command results
          if (result.interactive && result.interactive.type === 'model-select') {
            setInteractiveCommand({
              type: 'model-select',
              models: result.interactive.models
            });
            debug('Showing interactive model selector');
            return;
          }

          // Special handling for clear command
          if (parsed.command === 'clear' && result.success) {
            // Clear messages and show welcome message
            const welcomeMessage: Message = {
              role: 'assistant',
              content:
                "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands.",
              id: generateMessageId()
            };
            setMessages([welcomeMessage]);
            debug('Cleared messages and reset to welcome message');
          } else {
            const responseMessage: Message = {
              role: 'ui-notification',
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
            role: 'ui-notification',
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
        debug('Error in processMessageImmediate:', error);

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
    []
  );

  // Auto-process queue when processing completes and messages are queued
  useEffect(() => {
    if (!isProcessing && messageQueue.length > 0) {
      debug('Processing completed and queue has messages, triggering processNextMessage');
      // Process next message from queue inline
      (async () => {
        if (processingRef.current || messageQueue.length === 0) {
          debug('processNextMessage: skipping - processing:', processingRef.current, 'queue length:', messageQueue.length);
          return;
        }

        debug('processNextMessage: dequeuing next message');
        setIsProcessing(true);

        // Get and remove the first message from queue
        const nextMessage = messageQueue[0];
        if (!nextMessage) {
          debug('processNextMessage: no message found in queue');
          setIsProcessing(false);
          return;
        }
        
        setMessageQueue(prev => prev.slice(1));

        try {
          await processMessageImmediate(nextMessage.content);
          debug('processNextMessage: completed processing message:', nextMessage.id);
        } catch (error) {
          debug('processNextMessage: error processing message:', error);
        } finally {
          setIsProcessing(false);
          debug('processNextMessage: set processing to false');
        }
      })();
    }
  }, [isProcessing, messageQueue, processMessageImmediate]);

  const sendMessage = useCallback(
    async (content: string) => {
      debug('sendMessage called with:', content);

      // Don't process empty messages
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        debug('sendMessage: ignoring empty message');
        return;
      }

      const queuedMessage: QueuedMessage = {
        id: generateMessageId(),
        content: trimmedContent,
        timestamp: Date.now()
      };

      // If not currently processing, process immediately
      if (!processingRef.current && messageQueue.length === 0) {
        debug('sendMessage: processing immediately (not busy)');
        setIsProcessing(true);
        
        try {
          await processMessageImmediate(queuedMessage.content);
          debug('sendMessage: completed immediate processing');
        } catch (error) {
          debug('sendMessage: error in immediate processing:', error);
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Add to queue and wait for processing
        debug('sendMessage: adding to queue (currently processing or queue not empty)');
        setMessageQueue(prev => [...prev, queuedMessage]);
        debug('sendMessage: queue length after adding:', messageQueue.length + 1);
      }
    },
    [messageQueue, processMessageImmediate]
  );

  const addUINotification = useCallback((content: string) => {
    const notification: Message = {
      role: 'ui-notification',
      content,
      id: generateMessageId()
    };
    setMessages(prev => [...prev, notification]);
    debug('Added system message');
  }, []);

  const handleModelSelect = useCallback(async (modelValue: string) => {
    debug('Model selected:', modelValue);
    setInteractiveCommand(null);
    setIsLoading(true);
    
    try {
      const result = await executeCommand('model', ['switch', modelValue]);
      
      const responseMessage: Message = {
        role: 'ui-notification',
        content: result.content,
        id: generateMessageId()
      };
      setMessages(prev => [...prev, responseMessage]);
      debug('Model switch completed');
    } catch (error) {
      debug('Error switching model:', error);
      
      const errorMessage: Message = {
        role: 'ui-notification',
        content: '❌ Failed to switch model. Please try again.',
        id: generateMessageId()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelModelSelection = useCallback(() => {
    debug('Model selection cancelled');
    setInteractiveCommand(null);
  }, []);

  const triggerModelSelector = useCallback(async () => {
    debug('Triggering model selector via hotkey');
    setIsLoading(true);
    
    try {
      const result = await executeCommand('model', ['switch']);
      
      // Check for interactive command results
      if (result.interactive && result.interactive.type === 'model-select') {
        setInteractiveCommand({
          type: 'model-select',
          models: result.interactive.models
        });
        debug('Showing interactive model selector');
      } else {
        // If not interactive, show the result as a system message
        const responseMessage: Message = {
          role: 'ui-notification',
          content: result.content,
          id: generateMessageId()
        };
        setMessages(prev => [...prev, responseMessage]);
      }
    } catch (error) {
      debug('Error triggering model selector:', error);
      
      const errorMessage: Message = {
        role: 'ui-notification',
        content: '❌ Failed to open model selector. Please try again.',
        id: generateMessageId()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    sendMessage,
    addSystemMessage: addUINotification,
    isLoading,
    interactiveCommand,
    handleModelSelect,
    cancelModelSelection,
    triggerModelSelector,
    // Queue status for UI indicators
    queueLength: messageQueue.length,
    isProcessing,
    queuedMessages: messageQueue
  };
}

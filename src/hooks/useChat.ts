import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { generateResponse } from '../services/llm';
import { debug, getVerbose } from '../utils/logger';
import { parseCommand, executeCommand } from '../commands/registry';
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory';
import { getCurrentProject } from '../utils/projectConfig';
import type { ModelSelectCommand } from '../types/models';
import { DEFAULT_HISTORY_SIZE } from '../constants';
import { RequestContext } from '../utils/requestContext';
import { loggerRegistry } from '../components/RequestLogDisplay';

export interface QueuedMessage {
  content: string;
  timestamp: number;
}

function trimMessages(messages: Message[]): Message[] {
  return messages.slice(-1*DEFAULT_HISTORY_SIZE);
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [interactiveCommand, setInteractiveCommand] = useState<ModelSelectCommand | null>(null);
  const [projectSwitchTrigger, setProjectSwitchTrigger] = useState(0);
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);

  // Message queue state
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const processingRef = useRef(false);
  const shouldSaveRef = useRef(false);

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
          };
          setMessages([welcomeMessage]);
          shouldSaveRef.current = true; // Mark that we need to save the welcome message
          debug('No saved history found, using welcome message');
        } else {
          // Load saved history
          setMessages(trimMessages(savedMessages));
          shouldSaveRef.current = false; // Don't save immediately after loading
          debug('Loaded', savedMessages.length, 'messages from history');
        }
      } catch (error) {
        debug('Error loading chat history:', error);
        // Fallback to welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content:
            "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands.",
        };
        setMessages([welcomeMessage]);
        shouldSaveRef.current = true; // Mark that we need to save the fallback message
      } finally {
        setHistoryLoaded(true);
      }
    };

    initializeChatHistory();
  }, [currentProjectId, projectSwitchTrigger]);


  // Save messages whenever they change (after history is loaded)
  useEffect(() => {
    if (historyLoaded && messages.length > 0 && shouldSaveRef.current) {
      debug('Saving updated chat history with', messages.length, 'messages');
      saveChatHistory(messages)
        .then(() => {
          debug('Chat history saved successfully');
          shouldSaveRef.current = false; // Reset save flag
        })
        .catch(error => {
          debug('Failed to save chat history:', error);
        });
    }
  }, [messages, historyLoaded]);

  // Process a message immediately (internal function)
  const processMessageImmediate = useCallback(
    async (content: string) => {
      debug('processMessageImmediate called with:', content);
      
      // If we're in the middle of a project switch, wait for it to complete
      if (isProjectSwitching) {
        debug('Waiting for project switch to complete before processing message');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Check if this is a command
      const parsed = parseCommand(content);

      if (parsed.isCommand) {
        debug('Processing command:', parsed.command);
        setIsLoading(true);

        try {
          const result = await executeCommand(
            parsed.command as string,
            parsed.args as string[],
            { messageCount: messagesRef.current.length }
          );

          // Check for interactive command results
          if (result.interactive && result.interactive.type === 'model-select') {
            setInteractiveCommand({
              type: 'model-select',
              models: result.interactive.models
            });
            debug('Showing interactive model selector');
            return;
          }

          // Special handling for project switch command
          if (parsed.command === 'project' && 
              (parsed.args?.[0] === 'switch' || parsed.args?.[0] === 'set') && 
              result.success) {
            debug('Project switch command executed, triggering context refresh');
            setIsProjectSwitching(true);
            setProjectSwitchTrigger(prev => prev + 1);
            // Wait for the project context to be updated
            await new Promise(resolve => setTimeout(resolve, 200));
            setIsProjectSwitching(false);
          }

          // Special handling for clear command
          if (parsed.command === 'clear' && result.success) {
            // Clear messages and show welcome message
            const welcomeMessage: Message = {
              role: 'assistant',
              content:
                "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands.",
            };
            setMessages([welcomeMessage]);
            shouldSaveRef.current = true; // Mark for saving
            debug('Cleared messages and reset to welcome message');
          } else {
            const responseMessage: Message = {
              role: 'ui-notification',
              content: result.content,
            };
            setMessages(prev => trimMessages([...prev, responseMessage]));
            shouldSaveRef.current = true; // Mark for saving
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
          };
          setMessages(prev => trimMessages([...prev, errorMessage]));
          shouldSaveRef.current = true; // Mark for saving
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Handle regular chat messages
      const userMessage: Message = { role: 'user', content };

      debug('Adding user message to state');
      setMessages(prev => trimMessages([...prev, userMessage]));
      shouldSaveRef.current = true; // Mark for saving
      setIsLoading(true);
      debug('Set loading state to true');

      try {
        const allMessages = [...messagesRef.current, userMessage];
        debug('Sending', allMessages.length, 'messages to LLM');
        
        // Wrap the entire request processing in a request context
        const response = await RequestContext.run(async () => {
          // Register the logger with the display component
          const logger = RequestContext.getLogger();
          if (logger) {
            loggerRegistry.setLogger(logger);
          }
          
          RequestContext.logStep('prompt_assembly', 'start');
          RequestContext.logStep('prompt_assembly', 'end');
          return await generateResponse(allMessages);
        });

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
        };
        setMessages(prev => trimMessages([...prev, assistantMessage]));
        shouldSaveRef.current = true; // Mark for saving
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
        };
        setMessages(prev => trimMessages([...prev, errorMessage]));
        shouldSaveRef.current = true; // Mark for saving
        debug('Added error message to state');
      } finally {
        setIsLoading(false);
        debug('Set loading state to false');
        
        // Clear request logs after a short delay
        setTimeout(() => {
          // Get the logger from the registry and clear
          const logger = RequestContext.getLogger();
          if (logger) {
            logger.clearLogs();
          }
        }, 500);
      }
    },
    [isProjectSwitching]
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
          debug('processNextMessage: completed processing message');
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
        return;
      }

      const queuedMessage: QueuedMessage = {
        content: trimmedContent,
        timestamp: Date.now()
      };

      // If not currently processing, process immediately
      if (!processingRef.current && messageQueue.length === 0) {
        setIsProcessing(true);

        try {
          await processMessageImmediate(queuedMessage.content);
        } catch (error) {
          debug('sendMessage: error in immediate processing:', error);
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Add to queue and wait for processing
        debug('sendMessage: adding to queue (currently processing or queue not empty)');
        setMessageQueue(prev => [...prev, queuedMessage]);
      }
    },
    [messageQueue, processMessageImmediate]
  );

  const addUINotification = useCallback((content: string) => {
    const notification: Message = {
      role: 'ui-notification',
      content,
    };
    setMessages(prev => trimMessages([...prev, notification]));
    shouldSaveRef.current = true; // Mark for saving
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
      };
      setMessages(prev => trimMessages([...prev, responseMessage]));
      shouldSaveRef.current = true; // Mark for saving
      debug('Model switch completed');
    } catch (error) {
      debug('Error switching model:', error);

      const errorMessage: Message = {
        role: 'ui-notification',
        content: '❌ Failed to switch model. Please try again.',
      };
      setMessages(prev => trimMessages([...prev, errorMessage]));
      shouldSaveRef.current = true; // Mark for saving
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
        };
        setMessages(prev => trimMessages([...prev, responseMessage]));
        shouldSaveRef.current = true; // Mark for saving
      }
    } catch (error) {
      debug('Error triggering model selector:', error);

      const errorMessage: Message = {
        role: 'ui-notification',
        content: '❌ Failed to open model selector. Please try again.',
      };
      setMessages(prev => trimMessages([...prev, errorMessage]));
      shouldSaveRef.current = true; // Mark for saving
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Callback to notify of project switch
  const notifyProjectSwitch = useCallback(async () => {
    debug('Project switch notification received');
    setIsProjectSwitching(true);
    setProjectSwitchTrigger(prev => prev + 1);
    // Wait for the project context to be updated
    await new Promise(resolve => setTimeout(resolve, 200));
    setIsProjectSwitching(false);
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
    notifyProjectSwitch,
    // Queue status for UI indicators
    queueLength: messageQueue.length,
    isProcessing,
    queuedMessages: messageQueue
  };
}

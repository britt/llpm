/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { generateResponse } from '../services/llm';
import { debug, getVerbose } from '../utils/logger';
import { parseCommand, executeCommand } from '../commands/registry';
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory';
import { getCurrentProject } from '../utils/projectConfig';
import type { Model } from '../types/models';
import { DEFAULT_HISTORY_SIZE } from '../constants';
import { RequestContext } from '../utils/requestContext';
import { loggerRegistry } from '../components/RequestLogDisplay';
import { traced } from '../utils/tracing';
import { getSkillRegistry } from '../services/SkillRegistry';

export interface QueuedMessage {
  content: string;
  timestamp: number;
}

function trimMessages(messages: Message[]): Message[] {
  return messages.slice(-1 * DEFAULT_HISTORY_SIZE);
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [modelSelectorModels, setModelSelectorModels] = useState<Model[] | null>(null);
  const [projectSwitchTrigger, setProjectSwitchTrigger] = useState(0);
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Message queue state
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const processingRef = useRef(false);
  const shouldSaveRef = useRef(false);
  const selectedSkillsRef = useRef<string[]>([]);

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
      try {
        // Check if project changed
        const currentProject = await getCurrentProject();
        const newProjectId = currentProject?.id || null;

        if (currentProjectId !== newProjectId) {
          setCurrentProjectId(newProjectId);
          setHistoryLoaded(false);
        }

        const savedMessages = await loadChatHistory();

        if (savedMessages.length === 0) {
          // No saved history, use welcome message
          const welcomeMessage: Message = {
            role: 'assistant',
            content:
              "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands."
          };
          setMessages([welcomeMessage]);
          shouldSaveRef.current = true; // Mark that we need to save the welcome message
        } else {
          // Load saved history
          setMessages(trimMessages(savedMessages));
          shouldSaveRef.current = false; // Don't save immediately after loading
        }
      } catch {
        // Fallback to welcome message
        const welcomeMessage: Message = {
          role: 'assistant',
          content:
            "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands."
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
      saveChatHistory(messages)
        .then(() => {
          shouldSaveRef.current = false; // Reset save flag
        })
        .catch(error => {
          // Silently fail - not critical
        });
    }
  }, [messages, historyLoaded]);

  // Listen for skill selection events to update thinking indicator in real-time
  useEffect(() => {
    const skillRegistry = getSkillRegistry();

    const handleSkillSelected = (event: any) => {
      debug('Skill selected event received:', event.skillName);
      if (!selectedSkillsRef.current.includes(event.skillName)) {
        selectedSkillsRef.current.push(event.skillName);
        debug('Updating selectedSkills state:', selectedSkillsRef.current);
        setSelectedSkills([...selectedSkillsRef.current]);
      }
    };

    debug('Setting up skill.selected event listener');
    // Listen to skill selection events
    skillRegistry.on('skill.selected', handleSkillSelected);

    return () => {
      debug('Removing skill.selected event listener');
      skillRegistry.removeListener('skill.selected', handleSkillSelected);
    };
  }, []);

  // Process a message immediately (internal function)
  const processMessageImmediate = useCallback(
    async (content: string) => {
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
          const result = await executeCommand(parsed.command as string, parsed.args as string[], {
            messageCount: messagesRef.current.length
          });

          // Check for interactive command results
          if (result.interactive && result.interactive.type === 'model-select') {
            setModelSelectorModels(result.interactive.models);
            debug('Showing interactive model selector');
            return;
          }

          // Special handling for project switch command
          if (
            parsed.command === 'project' &&
            (parsed.args?.[0] === 'switch' || parsed.args?.[0] === 'set') &&
            result.success
          ) {
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
                "Hello! I'm LLPM, your AI-powered project manager. How can I help you today?\n\n💡 Type /help to see available commands."
            };
            setMessages([welcomeMessage]);
            shouldSaveRef.current = true; // Mark for saving
            debug('Cleared messages and reset to welcome message');
          } else {
            const responseMessage: Message = {
              role: 'ui-notification',
              content: result.content
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
            content: errorContent
          };
          setMessages(prev => trimMessages([...prev, errorMessage]));
          shouldSaveRef.current = true; // Mark for saving
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Handle regular chat messages - establish request context first, then trace
      const userMessage: Message = { role: 'user', content };

      debug('Adding user message to state');
      setMessages(prev => trimMessages([...prev, userMessage]));
      shouldSaveRef.current = true; // Mark for saving
      selectedSkillsRef.current = []; // Clear previous skills
      setSelectedSkills([]); // Clear previous skills
      setIsLoading(true);
      debug('Set loading state to true');

      try {
        const allMessages = [...messagesRef.current, userMessage];
        debug('Sending', allMessages.length, 'messages to LLM');

        // Wrap the entire request processing in a request context (outer wrapper)
        const response = await RequestContext.run(async () => {
          // Register the logger with the display component
          const logger = RequestContext.getLogger();
          if (logger) {
            loggerRegistry.setLogger(logger);
          }

          // Trace the request flow (inner wrapper)
          return await traced(
            'user.request',
            {
              attributes: {
                'message.length': content.length,
                'message.count': allMessages.length
              },
              openInferenceKind: 'CHAIN' // Phoenix UI span kind for request flow
            },
            async span => {
              RequestContext.logStep('prompt_assembly', 'start');
              RequestContext.logStep('prompt_assembly', 'end');
              const result = await generateResponse(allMessages);
              span.setAttribute('response.length', result?.response?.length || 0);
              return result;
            }
          );
        });

        debug('Received response from LLM, length:', response?.response?.length || 0);
        debug('Response content preview:', response?.response?.substring(0, 50) || 'EMPTY');
        debug('Selected skills:', response?.selectedSkills || []);

        // Update selected skills state
        setSelectedSkills(response?.selectedSkills || []);

        // Ensure we have a response before adding it
        const responseContent =
          response?.response && response.response.trim()
            ? response.response
            : "I processed your request but don't have anything specific to report.";

        const assistantMessage: Message = {
          role: 'assistant',
          content: responseContent
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
          content: errorContent
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
          debug(
            'processNextMessage: skipping - processing:',
            processingRef.current,
            'queue length:',
            messageQueue.length
          );
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
      content
    };
    setMessages(prev => trimMessages([...prev, notification]));
    shouldSaveRef.current = true; // Mark for saving
    debug('Added system message');
  }, []);

  const handleModelSelect = useCallback(async (modelValue: string) => {
    debug('Model selected:', modelValue);
    setModelSelectorModels(null);
    setIsLoading(true);

    try {
      const result = await executeCommand('model', ['switch', modelValue]);

      const responseMessage: Message = {
        role: 'ui-notification',
        content: result.content
      };
      setMessages(prev => trimMessages([...prev, responseMessage]));
      shouldSaveRef.current = true; // Mark for saving
      debug('Model switch completed');
    } catch (error) {
      debug('Error switching model:', error);

      const errorMessage: Message = {
        role: 'ui-notification',
        content: '❌ Failed to switch model. Please try again.'
      };
      setMessages(prev => trimMessages([...prev, errorMessage]));
      shouldSaveRef.current = true; // Mark for saving
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelModelSelection = useCallback(() => {
    debug('Model selection cancelled');
    setModelSelectorModels(null);
  }, []);

  const triggerModelSelector = useCallback(async () => {
    debug('Triggering model selector via hotkey');
    setIsLoading(true);

    try {
      const result = await executeCommand('model', ['switch']);

      // Check for interactive command results
      if (result.interactive && result.interactive.type === 'model-select') {
        setModelSelectorModels(result.interactive.models);
        debug('Showing interactive model selector');
      } else {
        // If not interactive, show the result as a system message
        const responseMessage: Message = {
          role: 'ui-notification',
          content: result.content
        };
        setMessages(prev => trimMessages([...prev, responseMessage]));
        shouldSaveRef.current = true; // Mark for saving
      }
    } catch (error) {
      debug('Error triggering model selector:', error);

      const errorMessage: Message = {
        role: 'ui-notification',
        content: '❌ Failed to open model selector. Please try again.'
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

    // Rescan skills to pick up project-specific skills
    try {
      debug('Rescanning skills after project switch');
      const skillRegistry = getSkillRegistry();
      await skillRegistry.scan();
      const skillCount = skillRegistry.getAllSkills().length;
      debug(`Skills rescanned: ${skillCount} skill(s) discovered`);
    } catch (error) {
      debug('Error rescanning skills:', error);
    }

    // Wait for the project context to be updated
    await new Promise(resolve => setTimeout(resolve, 200));
    setIsProjectSwitching(false);
  }, []);

  return {
    messages,
    sendMessage,
    addSystemMessage: addUINotification,
    isLoading,
    modelSelectorModels,
    handleModelSelect,
    cancelModelSelection,
    triggerModelSelector,
    notifyProjectSwitch,
    // Queue status for UI indicators
    queueLength: messageQueue.length,
    isProcessing,
    queuedMessages: messageQueue,
    selectedSkills
  };
}

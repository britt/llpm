import React, { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import Link from 'ink-link';
import SelectInput from 'ink-select-input';
import type { Message } from '../types';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';
import { getCurrentProject, listProjects, setCurrentProject as setCurrentProjectConfig } from '../utils/projectConfig';
import type { Project } from '../types/project';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onAddSystemMessage: (message: string) => void;
  isLoading: boolean;
  interactiveCommand?: {
    type: 'model-select';
    models: Array<{id: string, label: string, value: string}>;
  } | null;
  onModelSelect?: (modelValue: string) => void;
  onCancelModelSelection?: () => void;
  queueLength?: number;
  isProcessing?: boolean;
}

export const ChatInterface = memo(function ChatInterface({ 
  messages, 
  onSendMessage, 
  onAddSystemMessage, 
  isLoading, 
  interactiveCommand,
  onModelSelect,
  onCancelModelSelection,
  queueLength = 0,
  isProcessing = false
}: ChatInterfaceProps) {
  const [displayInput, setDisplayInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [displayCursor, setDisplayCursor] = useState(0);
  
  // Use refs to avoid re-renders during typing
  const inputRef = useRef('');
  const cursorRef = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Immediate update function for lightning fast response
  const updateDisplay = useCallback(() => {
    setDisplayInput(inputRef.current);
    setDisplayCursor(cursorRef.current);
  }, []);

  // Load input history on mount
  useEffect(() => {
    loadInputHistory().then(history => {
      setInputHistory(history);
    });
  }, []);

  // Load current project on mount and periodically
  useEffect(() => {
    const loadCurrentProject = async () => {
      try {
        const project = await getCurrentProject();
        setCurrentProject(project);
      } catch (error) {
        console.error('Failed to load current project:', error);
      }
    };

    loadCurrentProject();

    // Check for project changes every 30 seconds (reduced frequency)
    const interval = setInterval(loadCurrentProject, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle project selection - memoized to prevent re-creation
  const handleProjectSelect = useCallback(async (item: { label: string; value: string }) => {
    try {
      if (item.value === '__create_new__') {
        // Handle "Create New Project" option
        inputRef.current = '/project add ';
        cursorRef.current = inputRef.current.length;
        setDisplayInput(inputRef.current);
        setDisplayCursor(inputRef.current.length);
        setShowProjectSelector(false);
        
        // Add system message with rich formatting and instructions
        const instructionMessage = `📝 **Creating a New Project**

To add a new project, complete the command with these parameters:

**Command Format:**
\`/project add <name> <repository> <path>\`

**Parameters:**
• **name** - A descriptive name for your project (e.g., "My Web App")
• **repository** - GitHub repository URL (e.g., "https://github.com/user/repo")
• **path** - Local file system path (e.g., "/Users/you/projects/my-app")

**Example:**
\`/project add "E-commerce Site" "https://github.com/myuser/shop" "/Users/john/projects/shop"\`

💡 **Tip:** Use quotes around names with spaces`;
        
        onAddSystemMessage(instructionMessage);
        return;
      } else {
        await setCurrentProjectConfig(item.value);
      }
      
      const updatedProject = await getCurrentProject();
      setCurrentProject(updatedProject);
      setShowProjectSelector(false);
    } catch (error) {
      console.error('Failed to set current project:', error);
      setShowProjectSelector(false);
    }
  }, [onAddSystemMessage]);

  // Memoize project selector items
  const projectItems = useMemo(() => {
    const items = availableProjects.map(project => ({
      label: project.name,
      value: project.id
    }));
    
    // Add "Create New" option
    items.unshift({
      label: '(Create New Project)',
      value: '__create_new__'
    });
    
    return items;
  }, [availableProjects]);

  // Handle input submission - memoized to prevent re-creation
  const handleInputSubmit = useCallback(() => {
    const currentInput = inputRef.current;
    if (currentInput.trim() && !isLoading) {
      // Add to history (avoid duplicates)
      setInputHistory(prev => {
        const newHistory = [currentInput, ...prev.filter(h => h !== currentInput)];
        const limitedHistory = newHistory.slice(0, 100); // Keep last 100 commands
        
        // Save to disk asynchronously
        saveInputHistory(limitedHistory);
        
        return limitedHistory;
      });
      
      onSendMessage(currentInput.trim());
      inputRef.current = '';
      cursorRef.current = 0;
      setDisplayInput('');
      setDisplayCursor(0);
      setHistoryIndex(-1);
    }
  }, [isLoading, onSendMessage]);

  // Memoized function to parse content and render URLs as links
  const renderContentWithLinks = useCallback((content: string) => {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = content.match(urlRegex) || [];
    
    if (urls.length === 0) {
      return content;
    }
    
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    
    urls.forEach((url, index) => {
      const urlIndex = content.indexOf(url, lastIndex);
      
      // Add text before the URL
      if (urlIndex > lastIndex) {
        result.push(content.slice(lastIndex, urlIndex));
      }
      
      // Add the link
      result.push(
        <Link key={`link-${index}`} url={url}>
          <Text color="cyan" underline>{url}</Text>
        </Link>
      );
      
      lastIndex = urlIndex + url.length;
    });
    
    // Add remaining text after the last URL
    if (lastIndex < content.length) {
      result.push(content.slice(lastIndex));
    }
    
    return result;
  }, []);

  // Individual message component to prevent full rerenders
  const MessageItem = memo(({ message, index }: { message: Message; index: number }) => {
    const speakerIndicator = useMemo(() => {
      return message.role === 'user' ? '👤 You:   ' : message.role === 'system' ? '⚙️ System: ' : '🤖 PM:    ';
    }, [message.role]);
    
    const messageColor = useMemo(() => {
      return message.role === 'user' ? 'blue' : message.role === 'system' ? 'magenta' : 'white';
    }, [message.role]);
    
    // Memoize rendered content to prevent re-processing on every render
    const renderedContent = useMemo(() => {
      return renderContentWithLinks(message.content);
    }, [message.content, renderContentWithLinks]);
    
    return (
      <Box key={message.id || `fallback-${index}`} marginBottom={1}>
        <Box flexDirection="row">
          <Text color={messageColor} bold>
            {speakerIndicator}
          </Text>
          <Box flexDirection="column" flexShrink={1}>
            <Text color={messageColor} bold>
              {renderedContent}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  });

  // Memoize the rendered messages list to prevent unnecessary re-renders
  const renderedMessages = useMemo(() => {
    return messages.map((message, index) => (
      <MessageItem key={message.id || `fallback-${index}`} message={message} index={index} />
    ));
  }, [messages]);


  // BLAZING FAST input handler - uses refs to avoid React re-renders
  useInput((inputChar, key) => {
    // Skip all input handling when selectors are shown
    if (showProjectSelector || interactiveCommand?.type === 'model-select') {
      // Handle ESC to cancel project selector
      if (key.escape && showProjectSelector) {
        setShowProjectSelector(false);
      }
      // Handle ESC to cancel model selector
      if (key.escape && interactiveCommand?.type === 'model-select') {
        onCancelModelSelection?.();
      }
      return;
    }

    // Handle project selector
    if (key.shift && key.tab) {
      setShowProjectSelector(true);
      // Load available projects
      listProjects().then(projects => {
        setAvailableProjects(projects);
      }).catch(error => {
        console.error('Failed to load projects:', error);
        setAvailableProjects([]);
      });
      return;
    }

    // Handle Enter - submit input
    if (key.return) {
      handleInputSubmit();
      return;
    }

    // Handle Ctrl+U - clear input
    if (key.ctrl && inputChar === 'u') {
      inputRef.current = '';
      cursorRef.current = 0;
      setDisplayInput('');
      setDisplayCursor(0);
      setHistoryIndex(-1);
      return;
    }

    // Handle Ctrl+E - move cursor to end
    if (key.ctrl && inputChar === 'e') {
      cursorRef.current = inputRef.current.length;
      updateDisplay();
      return;
    }

    // Handle Ctrl+A - move cursor to beginning
    if (key.ctrl && inputChar === 'a') {
      cursorRef.current = 0;
      updateDisplay();
      return;
    }

    // Handle arrow keys for cursor movement
    if (key.leftArrow) {
      cursorRef.current = Math.max(0, cursorRef.current - 1);
      updateDisplay();
      return;
    }

    if (key.rightArrow) {
      cursorRef.current = Math.min(inputRef.current.length, cursorRef.current + 1);
      updateDisplay();
      return;
    }

    if (key.upArrow && !key.ctrl && !key.shift) {
      // Navigate up in history
      if (inputHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        const historyText = inputHistory[newIndex];
        if (historyText) {
          setHistoryIndex(newIndex);
          inputRef.current = historyText;
          cursorRef.current = historyText.length;
          setDisplayInput(historyText);
          setDisplayCursor(historyText.length);
        }
      }
      return;
    }

    if (key.downArrow && !key.ctrl && !key.shift) {
      // Navigate down in history
      if (historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        if (newIndex < 0) {
          setHistoryIndex(-1);
          inputRef.current = '';
          cursorRef.current = 0;
          setDisplayInput('');
          setDisplayCursor(0);
        } else {
          const historyText = inputHistory[newIndex];
          if (historyText) {
            setHistoryIndex(newIndex);
            inputRef.current = historyText;
            cursorRef.current = historyText.length;
            setDisplayInput(historyText);
            setDisplayCursor(historyText.length);
          }
        }
      }
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      if (cursorRef.current > 0) {
        const currentInput = inputRef.current;
        const newInput = currentInput.slice(0, cursorRef.current - 1) + currentInput.slice(cursorRef.current);
        inputRef.current = newInput;
        cursorRef.current = cursorRef.current - 1;
        updateDisplay();
      }
      return;
    }

    // Handle regular character input - FASTEST PATH
    if (inputChar && !key.ctrl && !key.meta && inputChar.length === 1) {
      const currentInput = inputRef.current;
      const cursor = cursorRef.current;
      const newInput = currentInput.slice(0, cursor) + inputChar + currentInput.slice(cursor);
      inputRef.current = newInput;
      cursorRef.current = cursor + 1;
      updateDisplay();
      return;
    }
  });

  if (interactiveCommand?.type === 'model-select') {
    const modelItems = interactiveCommand.models.map(model => ({
      label: model.label,
      value: model.value
    }));

    return (
      <Box flexDirection="column" height="100%">
        {/* Messages - no border, fills available space */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {messages.map((message, index) => (
            <MessageItem key={message.id || `fallback-${index}`} message={message} index={index} />
          ))}
          {(isLoading || isProcessing) && (
            <Box>
              <Text color="red">
                <Spinner type="aesthetic" />
                {' '}PM is thinking...
                {queueLength > 0 && (
                  <Text color="yellow"> ({queueLength} message{queueLength !== 1 ? 's' : ''} queued)</Text>
                )}
              </Text>
            </Box>
          )}
        </Box>

        {/* Model Selector */}
        <Box borderStyle="single" paddingX={1}>
          <Box flexDirection="column">
            <Text color="green" bold>Select Model (ESC to cancel):</Text>
            <SelectInput
              items={modelItems}
              onSelect={(item) => onModelSelect?.(item.value)}
              onHighlight={() => {}}
            />
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                💡 Only configured providers are shown. Use /model providers to see configuration status.
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Project Status */}
        <Box paddingX={1} paddingY={0}>
          {currentProject && (
            <Text color="blue" dimColor>
              📁 {currentProject.name} | 🗂️ {currentProject.path}
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  if (showProjectSelector) {
    return (
      <Box flexDirection="column" height="100%">
        {/* Messages - no border, fills available space */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {messages.map((message, index) => (
            <MessageItem key={message.id || `fallback-${index}`} message={message} index={index} />
          ))}
          {(isLoading || isProcessing) && (
            <Box>
              <Text color="red">
                <Spinner type="aesthetic" />
                {' '}PM is thinking...
                {queueLength > 0 && (
                  <Text color="yellow"> ({queueLength} message{queueLength !== 1 ? 's' : ''} queued)</Text>
                )}
              </Text>
            </Box>
          )}
        </Box>

        {/* Project Selector */}
        <Box borderStyle="single" paddingX={1}>
          <Box flexDirection="column">
            <Text color="cyan" bold>Select Project (ESC to cancel):</Text>
            <SelectInput
              items={projectItems}
              onSelect={handleProjectSelect}
              onHighlight={() => {}}
            />
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                💡 Create New: Use format "/project add {'<name> <repository> <path>'}"
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Project Status */}
        <Box paddingX={1} paddingY={0}>
          <Text dimColor>
            Project: {currentProject ? (
              <Text color="cyan" bold>{currentProject.name}</Text>
            ) : (
              <Text color="gray">None</Text>
            )}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Messages - no border, fills available space */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {renderedMessages}
        {(isLoading || isProcessing) && (
          <Box>
            <Text color="red">
              <Spinner type="aesthetic" />
              {' '}PM is thinking...
              {queueLength > 0 && (
                <Text color="yellow"> ({queueLength} message{queueLength !== 1 ? 's' : ''} queued)</Text>
              )}
            </Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box borderStyle="single" paddingX={1}>
        {/* BLAZING FAST input rendering with batched updates */}
        <Text>
          <Text color="cyan" bold>&gt; </Text>
          {displayInput.length > 0 || displayCursor > 0 ? (
            <>
              {displayInput.slice(0, displayCursor)}
              <Text backgroundColor="white" color="black">
                {displayInput[displayCursor] || ' '}
              </Text>
              {displayInput.slice(displayCursor + 1)}
            </>
          ) : (
            <>
              <Text backgroundColor="white" color="black"> </Text>
              <Text dimColor>Type your message...</Text>
            </>
          )}
        </Text>
      </Box>

      {/* Project Status */}
      <Box paddingX={1} paddingY={0}>
        <Text dimColor>
          project: {currentProject ? (
            <Text color="cyan" bold>{currentProject.name}</Text>
          ) : (
            <Text color="gray">none</Text>
          )} <Text color="blackBright">(shift+tab: switch project)</Text>
        </Text>
      </Box>
    </Box>
  );
});
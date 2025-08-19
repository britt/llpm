import React, { useState, useEffect, memo, useMemo } from 'react';
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
  isLoading: boolean;
}

export const ChatInterface = memo(function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cursorPos, setCursorPos] = useState(0);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

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

    // Check for project changes every 10 seconds
    const interval = setInterval(loadCurrentProject, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle project selection
  const handleProjectSelect = async (item: { label: string; value: string }) => {
    try {
      if (item.value === '') {
        // Clear current project by setting it to empty
        const { loadProjectConfig, saveProjectConfig } = await import('../utils/projectConfig');
        const config = await loadProjectConfig();
        config.currentProject = undefined;
        await saveProjectConfig(config);
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
  };

  // Memoize project selector items
  const projectItems = useMemo(() => {
    const items = availableProjects.map(project => ({
      label: project.name,
      value: project.id
    }));
    
    // Add "None" option to clear current project
    items.unshift({
      label: '(None)',
      value: ''
    });
    
    return items;
  }, [availableProjects]);

  // Memoize cursor display to prevent unnecessary rerenders
  const cursorDisplay = useMemo(() => {
    return (
      <Text>
        {'> '}
        {input.slice(0, cursorPos)}
        <Text backgroundColor="white" color="black">
          {cursorPos < input.length ? input[cursorPos] : ' '}
        </Text>
        {input.slice(cursorPos + 1)}
      </Text>
    );
  }, [input, cursorPos]);

  // Function to parse content and render URLs as links
  const renderContentWithLinks = useMemo(() => {
    return (content: string) => {
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
    };
  }, []);

  // Individual message component to prevent full rerenders
  const MessageItem = memo(({ message, index }: { message: Message; index: number }) => (
    <Box key={message.id || `fallback-${index}`} marginBottom={1}>
      <Text color={message.role === 'user' ? 'blue' : message.role === 'system' ? 'magenta' : 'gray'} bold>
        {message.role === 'user' ? 'You: ' : message.role === 'system' ? 'System: ' : 'PM: '}
        {renderContentWithLinks(message.content)}
      </Text>
    </Box>
  ));

  useInput((inputChar, key) => {
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

    // Handle ESC to cancel project selector
    if (key.escape && showProjectSelector) {
      setShowProjectSelector(false);
      return;
    }

    // Skip normal input handling when project selector is shown
    if (showProjectSelector) {
      return;
    }

    if (key.return && input.trim() && !isLoading) {
      const message = input.trim();
      
      // Add to history (avoid duplicates)
      setInputHistory(prev => {
        const newHistory = [message, ...prev.filter(h => h !== message)];
        const limitedHistory = newHistory.slice(0, 100); // Keep last 100 commands
        
        // Save to disk asynchronously
        saveInputHistory(limitedHistory);
        
        return limitedHistory;
      });
      
      onSendMessage(message);
      setInput('');
      setCursorPos(0);
      setHistoryIndex(-1);
    } else if (key.upArrow) {
      // Navigate up in history
      if (inputHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(newIndex);
        const historyText = inputHistory[newIndex];
        if (historyText) {
          setInput(historyText);
          setCursorPos(historyText.length);
        }
      }
    } else if (key.downArrow) {
      // Navigate down in history
      if (historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        if (newIndex < 0) {
          setHistoryIndex(-1);
          setInput('');
          setCursorPos(0);
        } else {
          setHistoryIndex(newIndex);
          const historyText = inputHistory[newIndex];
          if (historyText) {
            setInput(historyText);
            setCursorPos(historyText.length);
          }
        }
      }
    } else if (key.ctrl && inputChar === 'u') {
      // Ctrl+U: Clear line from cursor to beginning
      setInput(prev => prev.slice(cursorPos));
      setCursorPos(0);
      setHistoryIndex(-1);
    } else if (key.ctrl && inputChar === 'k') {
      // Ctrl+K: Clear line from cursor to end
      setInput(prev => prev.slice(0, cursorPos));
      setHistoryIndex(-1);
    } else if (key.ctrl && inputChar === 'a') {
      // Ctrl+A: Move cursor to beginning of line
      setCursorPos(0);
    } else if (key.ctrl && inputChar === 'e') {
      // Ctrl+E: Move cursor to end of line
      setCursorPos(input.length);
    } else if (key.ctrl && inputChar === 'w') {
      // Ctrl+W: Delete word backwards
      const beforeCursor = input.slice(0, cursorPos);
      const afterCursor = input.slice(cursorPos);
      const words = beforeCursor.split(/\s+/);
      words.pop(); // Remove last word
      const newBeforeCursor = words.join(' ');
      const newInput = newBeforeCursor + (newBeforeCursor ? ' ' : '') + afterCursor;
      setInput(newInput.trim());
      setCursorPos(newBeforeCursor.length + (newBeforeCursor ? 1 : 0));
      setHistoryIndex(-1);
    } else if (key.ctrl && inputChar === 'l') {
      // Ctrl+L: Clear screen (handled by sending /clear command)
      onSendMessage('/clear');
      setInput('');
      setCursorPos(0);
      setHistoryIndex(-1);
    } else if (key.leftArrow) {
      // Left arrow: Move cursor left
      setCursorPos(Math.max(0, cursorPos - 1));
    } else if (key.rightArrow) {
      // Right arrow: Move cursor right  
      setCursorPos(Math.min(input.length, cursorPos + 1));
    } else if (key.ctrl && (inputChar === 'b' || key.leftArrow)) {
      // Ctrl+B: Move cursor left (alternative)
      setCursorPos(Math.max(0, cursorPos - 1));
    } else if (key.ctrl && (inputChar === 'f' || key.rightArrow)) {
      // Ctrl+F: Move cursor right (alternative)
      setCursorPos(Math.min(input.length, cursorPos + 1));
    } else if (key.ctrl && inputChar === 'd') {
      // Ctrl+D: Delete character at cursor
      setInput(prev => prev.slice(0, cursorPos) + prev.slice(cursorPos + 1));
      setHistoryIndex(-1);
    } else if (key.backspace || key.delete) {
      // Backspace: Delete character before cursor
      if (cursorPos > 0) {
        setInput(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(cursorPos - 1);
        setHistoryIndex(-1);
      }
    } else if (!key.ctrl && !key.meta && !key.return && inputChar) {
      // Regular character input: Insert at cursor position
      setInput(prev => prev.slice(0, cursorPos) + inputChar + prev.slice(cursorPos));
      setCursorPos(cursorPos + 1);
      setHistoryIndex(-1);
    }
  });

  if (showProjectSelector) {
    return (
      <Box flexDirection="column" height="100%">
        {/* Messages - no border, fills available space */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {messages.map((message, index) => (
            <MessageItem key={message.id || `fallback-${index}`} message={message} index={index} />
          ))}
          {isLoading && (
            <Box>
              <Text color="yellow">
                <Spinner type="dots" />
                {' '}PM is thinking...
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
        {messages.map((message, index) => (
          <MessageItem key={message.id || `fallback-${index}`} message={message} index={index} />
        ))}
        {isLoading && (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
              {' '}PM is thinking...
            </Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box borderStyle="single" paddingX={1}>
        {cursorDisplay}
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
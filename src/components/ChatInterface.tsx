import React, { useState, useEffect, memo, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import Link from 'ink-link';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type { Message } from '../types';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';
import { getCurrentProject, listProjects, setCurrentProject as setCurrentProjectConfig } from '../utils/projectConfig';
import type { Project } from '../types/project';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onAddSystemMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInterface = memo(function ChatInterface({ messages, onSendMessage, onAddSystemMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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
      if (item.value === '__create_new__') {
        // Handle "Create New Project" option
        setInput('/project add ');
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
  };

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

  // Handle input submission
  const handleInputSubmit = (value: string) => {
    if (value.trim() && !isLoading) {
      // Add to history (avoid duplicates)
      setInputHistory(prev => {
        const newHistory = [value, ...prev.filter(h => h !== value)];
        const limitedHistory = newHistory.slice(0, 100); // Keep last 100 commands
        
        // Save to disk asynchronously
        saveInputHistory(limitedHistory);
        
        return limitedHistory;
      });
      
      onSendMessage(value.trim());
      setInput('');
      setHistoryIndex(-1);
    }
  };

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
  const MessageItem = memo(({ message, index }: { message: Message; index: number }) => {
    const speakerIndicator = message.role === 'user' ? '👤 You:   ' : message.role === 'system' ? '⚙️ System: ' : '🤖 PM:    ';
    
    return (
      <Box key={message.id || `fallback-${index}`} marginBottom={1}>
        <Box flexDirection="row">
          <Text color={message.role === 'user' ? 'blue' : message.role === 'system' ? 'magenta' : 'white'} bold>
            {speakerIndicator}
          </Text>
          <Box flexDirection="column" flexShrink={1}>
            <Text color={message.role === 'user' ? 'blue' : message.role === 'system' ? 'magenta' : 'white'} bold>
              {renderContentWithLinks(message.content)}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  });

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

    // Handle history navigation when not using TextInput focus
    if (key.upArrow) {
      // Navigate up in history
      if (inputHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        const historyText = inputHistory[newIndex];
        if (historyText) {
          setHistoryIndex(newIndex);
          setInput(historyText);
        }
      }
    } else if (key.downArrow) {
      // Navigate down in history
      if (historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        if (newIndex < 0) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          const historyText = inputHistory[newIndex];
          if (historyText) {
            setHistoryIndex(newIndex);
            setInput(historyText);
          }
        }
      }
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
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleInputSubmit}
          placeholder="Type your message..."
        />
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
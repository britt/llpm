import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import clipboardy from 'clipboardy';
import type { Message } from '../types';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';
import {
  getCurrentProject,
  listProjects,
  setCurrentProject as setCurrentProjectConfig
} from '../utils/projectConfig';
import type { Project } from '../types/project';
import type { ModelSelectCommand } from '../types/models';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onAddSystemMessage: (message: string) => void;
  isLoading: boolean;
  interactiveCommand?: ModelSelectCommand | null;
  onModelSelect?: (modelValue: string) => void;
  onCancelModelSelection?: () => void;
  onTriggerModelSelector?: () => void;
  isProcessing?: boolean;
  queuedMessages?: Array<{ id: string; content: string; timestamp: number }>;
}

const ThinkingIndicator = memo(() => {
  return (
    <Box>
      <Text color="red">
        <Spinner type="aesthetic" /> PM is thinking...
      </Text>
    </Box>
  );
});

const QueuedMessage = memo(
  ({ message }: { message: { id: string; content: string; timestamp: number } }) => {
    return (
      <Box>
        <Text color="gray" dimColor>{message.content}</Text>
      </Box>
    );
  }
);

const MessageQueue = memo(
  ({
    messages: queuedMessages
  }: {
    messages?: Array<{ id: string; content: string; timestamp: number }>;
  }) => {
    if (!queuedMessages || queuedMessages.length === 0) return null;

    return (
      <Box flexDirection="column">
        {queuedMessages.map(queuedMsg => (
          <QueuedMessage key={queuedMsg.id} message={queuedMsg} />
        ))}
      </Box>
    );
  }
);

const ProjectStatus = memo(({ project }: { project: Project | null }) => {
  return (
    <Box paddingX={1} paddingY={0}>
      <Text dimColor>
        project:{' '}
        {project ? (
          <Text color="cyan" bold>
            {project.name}
          </Text>
        ) : (
          <Text color="gray">none</Text>
        )}{' '}
        <Text color="blackBright">(shift+tab: switch project, ctrl+tab: switch model)</Text>
      </Text>
    </Box>
  );
});

// Individual message component to prevent full rerenders
const MessageItem = memo(({ message }: { message: Message }) => {
  const speakerIndicator = useMemo(() => {
    return message.role === 'user'
      ? '👤 You:   '
      : message.role === 'system'
        ? '⚙️ System: '
        : '🤖 PM:    ';
  }, [message.role]);

  const speakerColor = useMemo(() => {
    return message.role === 'user' ? 'gray' : message.role === 'system' ? 'yellow' : 'white';
  }, [message.role]);

  const messageColor = useMemo(() => {
    return message.role === 'user' ? 'gray' : message.role === 'system' ? 'white' : 'white';
  }, [message.role]);

  return (
    <Box marginBottom={1}>
      <Box flexDirection="row">
        <Text color={speakerColor} bold>
          {speakerIndicator}
        </Text>
        <Box flexDirection="column" flexShrink={1}>
          <Text color={messageColor} bold>
            {message.content}
          </Text>
        </Box>
      </Box>
    </Box>
  );
});

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageItem key={message.id || `fallback-${index}`} message={message} />
      ))}
    </>
  );
}

const ModelSelector = memo(
  ({
    command,
    onModelSelect
  }: {
    command: ModelSelectCommand;
    onModelSelect?: (modelValue: string) => void;
  }) => {
    const models = command.models.map(model => ({
      label: model.label,
      value: model.value
    }));

    return (
      <Box borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          <Text color="green" bold>
            Select Model (ESC to cancel):
          </Text>
          <SelectInput
            items={models}
            onSelect={item => onModelSelect?.(item.value)}
            onHighlight={() => {}}
          />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              💡 Only configured providers are shown. Use /model providers to see configuration
              status.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }
);

const ProjectSelector = memo(
  ({
    onProjectSelect
  }: {
    onProjectSelect: (projectValue: { label: string; value: string }) => void;
  }) => {
    const [projects, setProjects] = useState([] as Project[]);
    // Load available projects
    listProjects()
      .then(projects => {
        setProjects(projects);
      })
      .catch(error => {
        console.error('Failed to load projects:', error);
        setProjects([]);
      });

    const items = projects.map(project => ({
      label: project.name,
      value: project.id
    }));

    // Add "Create New" option
    items.unshift({
      label: '(Create New Project)',
      value: '__create_new__'
    });

    return (
      <Box borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          <Text color="cyan" bold>
            Select Project (ESC to cancel):
          </Text>
          <SelectInput items={items} onSelect={onProjectSelect} onHighlight={() => {}} />
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              💡 Create New: Use format "/project add {'<name> <owner/repo> <path> [description]'}"
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }
);

export const ChatInterface = memo(function ChatInterface({
  messages,
  onSendMessage,
  onAddSystemMessage,
  isLoading,
  interactiveCommand,
  onModelSelect,
  onCancelModelSelection,
  onTriggerModelSelector,
  isProcessing = false,
  queuedMessages = []
}: ChatInterfaceProps) {
  const [displayInput, setDisplayInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [displayCursor, setDisplayCursor] = useState(0);

  // Use refs to avoid re-renders during typing
  const inputRef = useRef('');
  const cursorRef = useRef(0);

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
  const handleProjectSelect = useCallback(
    async (item: { label: string; value: string }) => {
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
\`/project add <name> <repository> <path> [description]\`

**Parameters:**
• **name** - A descriptive name for your project (e.g., "My Web App")
• **repository** - GitHub owner/repo (e.g., "user/repo") or full URL (e.g., "https://github.com/user/repo") 
• **path** - Local file system path (e.g., "/Users/you/projects/my-app")
• **description** - Optional description of the project (e.g., "Task management web app")

**Repository Formats:**
• GitHub shorthand: "user/my-app" (auto-converts to https://github.com/user/my-app)
• Full URL: "https://github.com/user/my-app"

**Examples:**
\`/project add "E-commerce Site" "myuser/shop" "/Users/john/projects/shop" "Online store for selling handmade crafts"\`
\`/project add "Web App" "https://github.com/user/webapp" "/path/to/webapp" "Full stack application"\`

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
    },
    [onAddSystemMessage]
  );

  // Handle input submission - memoized to prevent re-creation
  const handleInputSubmit = useCallback(() => {
    const currentInput = inputRef.current;
    if (currentInput.trim()) {
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
  }, [onSendMessage]);

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

      return;
    }

    // Handle model selector
    if (key.ctrl && key.tab) {
      onTriggerModelSelector?.();
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

    // Handle Ctrl+V / Cmd+V - paste content from clipboard
    if ((key.ctrl || key.meta) && inputChar === 'v') {
      try {
        const clipboardContent = clipboardy.readSync();
        if (clipboardContent) {
          // Replace newlines with spaces to keep single-line input
          const processedContent = clipboardContent.replace(/\r?\n/g, ' ').trim();
          
          if (processedContent) {
            const currentInput = inputRef.current;
            const cursor = cursorRef.current;
            const newInput = currentInput.slice(0, cursor) + processedContent + currentInput.slice(cursor);
            inputRef.current = newInput;
            cursorRef.current = cursor + processedContent.length;
            updateDisplay();
          }
        }
      } catch (error) {
        // Silently ignore clipboard errors - clipboard might be empty or inaccessible
        console.error('Failed to read clipboard:', error);
      }
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
        const newInput =
          currentInput.slice(0, cursorRef.current - 1) + currentInput.slice(cursorRef.current);
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

  let inputComponent = (<Box borderStyle="single" paddingX={1}>
    {/* BLAZING FAST input rendering with batched updates */}
    <Text>
      <Text color="cyan" bold>
        &gt;{' '}
      </Text>
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
          <Text backgroundColor="white" color="black">
            {' '}
          </Text>
          <Text dimColor>Type your message...</Text>
        </>
      )}
    </Text>
  </Box>);
  if (showProjectSelector) {
    inputComponent = <ProjectSelector onProjectSelect={handleProjectSelect} />;
  }
  if (interactiveCommand?.type === 'model-select') {
    inputComponent = <ModelSelector command={interactiveCommand} onModelSelect={onModelSelect} />;
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Messages - no border, fills available space */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        <MessageList messages={messages} />
        {/* Show queued messages in light text */}
        <MessageQueue messages={queuedMessages} />
        {(isLoading || isProcessing) && <ThinkingIndicator />}
      </Box>
      {/* Input */}
      {inputComponent}
      {/* Project Status */}
      <ProjectStatus project={currentProject} />
    </Box>
  );
});

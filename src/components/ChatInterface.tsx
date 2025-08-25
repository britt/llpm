import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { Message } from '../types';
import {
  getCurrentProject,
  listProjects,
  setCurrentProject as setCurrentProjectConfig
} from '../utils/projectConfig';
import type { Project } from '../types/project';
import type { ModelSelectCommand, ModelConfig } from '../types/models';
import { loadCurrentModel } from '../utils/modelStorage';
import ShellInput, { hotKey } from './ShellInput';

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
      <Text color="red">PM is thinking...</Text>
    </Box>
  );
});

const QueuedMessage = memo(
  ({ message }: { message: { id: string; content: string; timestamp: number } }) => {
    return (
      <Box>
        <Text color="gray" dimColor>
          {message.content}
        </Text>
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

const ProjectStatus = memo(
  ({ project, model }: { project: Project | null; model: ModelConfig | null }) => {
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
          | model:{' '}
          {model ? (
            <Text color="green" bold>
              {model.displayName}
            </Text>
          ) : (
            <Text color="gray">none</Text>
          )}{' '}
          <Text color="blackBright">(shift+tab: switch project, option+m: switch model)</Text>
        </Text>
      </Box>
    );
  }
);

// Individual message component to prevent full rerenders
const MessageItem = memo(({ message }: { message: Message }) => {
  const speakerIndicator = useMemo(() => {
    return message.role === 'user'
      ? '👤 You:    '
      : message.role === 'ui-notification'
        ? '⚙️ System:  '
        : '🤖 PM:     ';
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
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Load current project on mount
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
  }, []);

  // Load current model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await loadCurrentModel();
        setCurrentModel(model);
      } catch (error) {
        console.error('Failed to load current model:', error);
      }
    };

    loadModel();
  }, []);

  // Handle project selection - memoized to prevent re-creation
  const handleProjectSelect = useCallback(
    async (item: { label: string; value: string }) => {
      try {
        if (item.value === '__create_new__') {
          // Handle "Create New Project" option
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
  const handleInputSubmit = useCallback(
    (input: string) => {
      onSendMessage(input.trim());
    },
    [onSendMessage]
  );

  const showProjectSelectorHotKey = hotKey(
    (inputChar, key) => key.shift && key.tab,
    () => setShowProjectSelector(true)
  );

  const hideProjectSelectorHotKey = hotKey(
    useCallback((inputChar, key) => key.escape && showProjectSelector, [showProjectSelector]),
    () => setShowProjectSelector(false)
  );

  const showModelSelectorHotKey = hotKey(
    (inputChar, key) => key.meta && inputChar === 'm',
    useCallback(() => onTriggerModelSelector?.(), [onTriggerModelSelector])
  );

  const hideModelSelectorHotKey = hotKey(
    useCallback((inputChar, key) => key.escape && interactiveCommand?.type === 'model-select', [interactiveCommand]),
    useCallback(() => onCancelModelSelection?.(), [onCancelModelSelection])
  );

  let inputComponent = (
    <ShellInput
      hotKeys={[
        showProjectSelectorHotKey,
        hideProjectSelectorHotKey,
        showModelSelectorHotKey,
        hideModelSelectorHotKey
      ]}
      onSubmit={handleInputSubmit}
    />
  );
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
      <ProjectStatus project={currentProject} model={currentModel} />
    </Box>
  );
});

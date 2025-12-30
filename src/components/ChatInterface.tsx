import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Box, Text, useInput, Static } from 'ink';
import type { Message } from '../types';
import {
  getCurrentProject,
  setCurrentProject as setCurrentProjectConfig
} from '../utils/projectConfig';
import type { Project } from '../types/project';
import type { Model, ModelConfig } from '../types/models';
import { loadCurrentModel } from '../utils/modelStorage';
import HybridInput from './HybridInput';
import ProjectSelector from './ProjectSelector';
import ModelSelector from './ModelSelector';
import NotesSelector from './NotesSelector';
import type { QueuedMessage } from '../hooks/useChat';
import { RequestLogDisplay } from './RequestLogDisplay';
import { renderMarkdown, isASCIICapableTerminal } from '../utils/markdownRenderer';
import { useScreenSize } from "fullscreen-ink";

interface ChatInterfaceProps {
  completedMessages: Message[];
  activeMessages: Message[];
  hiddenLinesCount?: number;
  totalLines?: number;
  showAllHistory?: boolean;
  onToggleHistory?: () => void;
  onSendMessage: (message: string) => void;
  onAddSystemMessage: (message: string) => void;
  isLoading: boolean;
  modelSelectorModels?: Model[] | null;
  onModelSelect?: (modelValue: string) => void;
  onCancelModelSelection?: () => void;
  onTriggerModelSelector?: () => void;
  onProjectSwitch?: () => Promise<void>;
  isProcessing?: boolean;
  queuedMessages?: Array<QueuedMessage>;
  selectedSkills?: string[];
}

const ThinkingIndicator = memo(
  ({ isVisible, selectedSkills }: { isVisible: boolean; selectedSkills?: string[] }) => {
    if (!isVisible) return null;

    return (
      <Box flexDirection="column" paddingX={1} paddingY={1} height={8}>
        <Box>
          <Text color="red">PM is thinking...</Text>
          {selectedSkills && selectedSkills.length > 0 && (
            <Text color="cyan" dimColor>
              {' '}
              (using skill{selectedSkills.length > 1 ? 's' : ''}: {selectedSkills.join(', ')})
            </Text>
          )}
        </Box>
        <RequestLogDisplay />
      </Box>
    );
  }
);

const QueuedMessageItem = memo(({ message }: { message: QueuedMessage }) => {
  return (
    <Box>
      <Text color="gray" dimColor>
        {message.content}
      </Text>
    </Box>
  );
});

const MessageQueue = memo(({ messages: queuedMessages }: { messages?: Array<QueuedMessage> }) => {
  if (!queuedMessages || queuedMessages.length === 0) return null;

  return (
    <Box flexDirection="column">
      {queuedMessages.map((queuedMsg, i) => (
        <QueuedMessageItem key={`queued-message-${i}`} message={queuedMsg} />
      ))}
    </Box>
  );
});

const CollapseIndicator = memo(
  ({
    hiddenLinesCount,
    totalLines,
    showAllHistory
  }: {
    hiddenLinesCount: number;
    totalLines: number;
    showAllHistory: boolean;
  }) => {
    if (hiddenLinesCount === 0 && !showAllHistory) return null;

    const visibleLines = totalLines - hiddenLinesCount;

    return (
      <Box paddingX={1} paddingY={0} marginBottom={1}>
        <Text dimColor>
          {showAllHistory ? (
            <>
              Showing all {totalLines} lines — <Text color="cyan">/history tail</Text> to collapse
            </>
          ) : (
            <>
              Showing last {visibleLines} lines ({hiddenLinesCount} hidden) —{' '}
              <Text color="cyan">/history all</Text> | <Text color="cyan">/history export</Text>
            </>
          )}
        </Text>
      </Box>
    );
  }
);

const ProjectStatus = memo(
  ({ project, model }: { project: Project | null; model: ModelConfig | null }) => {
    return (
      <Box paddingX={1} paddingY={0}>
        <Text color="white">
          project:{' '}
          {project ? (
            <Text color="cyanBright" bold>
              {project.name}
            </Text>
          ) : (
            <Text color="gray">none</Text>
          )}{' '}
          | model:{' '}
          {model ? (
            <Text color="greenBright" bold>
              {model.displayName}
            </Text>
          ) : (
            <Text color="gray">none</Text>
          )}{' '}
          <Text color="gray">
            (shift+tab: switch project, option+m: switch model, option+n: notes)
          </Text>
        </Text>
      </Box>
    );
  }
);

// Individual message component to prevent full rerenders
const MessageItem = memo(({ message }: { message: Message }) => {
  const isSystemMessage = message.role === 'system' || message.role === 'ui-notification';
  const isUserMessage = message.role === 'user';

  // const backgroundColor = useMemo(() => {
  //   if (message.role === 'system' || message.role === 'ui-notification') return '#2e1d11';
  //   if (message.role === 'assistant') return 'black';
  //   return '#333';
  // }, [message.role]);
  const backgroundColor = '';

  const textColor = useMemo(() => {
    if (message.role === 'system' || message.role === 'ui-notification') return '#cb9774';
    if (message.role === 'user') return 'white';
    // All messages use white text for consistency
    return 'brightWhite';
  }, [message.role]);

  // Render markdown synchronously for assistant messages
  const displayContent = useMemo(() => {
    if (isSystemMessage) {
      return `System: ${message.content}`;
    }
    if (isUserMessage) {
      return `> ${message.content}`;
    }
    // For assistant messages, render markdown if terminal supports it
    if (message.role === 'assistant' && isASCIICapableTerminal()) {
      try {
        return renderMarkdown(message.content);
      } catch (error) {
        console.error('Failed to render markdown:', error);
        return message.content;
      }
    }
    return message.content;
  }, [message.role, message.content, isSystemMessage, isUserMessage]);

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      backgroundColor={backgroundColor}
      width="100%"
    >
      <Text color={textColor}>{displayContent}</Text>
    </Box>
  );
});

// Message buffering is implemented in index.ts App component
// Only RENDER_WINDOW_SIZE messages are passed here to reduce rerenders
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageItem key={message.id || `fallback-${index}`} message={message} />
      ))}
    </>
  );
}

function InputComponent({
  activeInput,
  models,
  onProjectSelect,
  onModelSelect,
  onSubmit,
  onInsertNote,
  setActiveInput
}: {
  activeInput: 'main' | 'project' | 'model' | 'notes';
  onProjectSelect: (projectValue: { label: string; value: string }) => void;
  models: Model[];
  onModelSelect: (modelValue: string) => void;
  onSubmit: (input: string) => void;
  onInsertNote: (noteContent: string) => void;
  setActiveInput: (input: 'main' | 'project' | 'model' | 'notes') => void;
}) {
  switch (activeInput) {
    case 'project':
      return <ProjectSelector onProjectSelect={onProjectSelect} />;
    case 'model':
      return <ModelSelector models={models} onModelSelect={onModelSelect} />;
    case 'notes':
      return (
        <NotesSelector
          onClose={() => {
            setActiveInput('main');
          }}
          onInsertNote={(noteContent: string) => {
            onInsertNote(noteContent);
            setActiveInput('main');
          }}
        />
      );
    default:
      return (
        <HybridInput
          focus={activeInput === 'main'}
          placeholder="Type your message..."
          onSubmit={onSubmit}
          onShowModelSelector={() => {
            setActiveInput('model');
          }}
          onShowProjectSelector={() => {
            setActiveInput('project');
          }}
          onShowNotesSelector={() => {
            setActiveInput('notes');
          }}
        />
      );
  }
}

const ViewMessages = memo(function ViewMessages({
  completedMessages,
  activeMessages,
  queuedMessages,
  hiddenLinesCount,
  totalLines,
  showAllHistory
}: {
  completedMessages: Message[];
  activeMessages: Message[];
  queuedMessages: QueuedMessage[];
  hiddenLinesCount?: number;
  totalLines?: number;
  showAllHistory?: boolean;
}) {
  return (
    <Box flexDirection="column">
      {/* Static zone: Completed messages render once and never update */}
      {/* This eliminates flicker when typing in input */}
      {completedMessages.length > 0 && (
      <Static items={completedMessages}>
        {message => <MessageItem key={message.id} message={message} />}
      </Static>
      )}
      {/* Dynamic zone: Active messages and UI elements that need to update */}
      {/* Active messages must be in dynamic zone so new messages appear immediately */}
      <Box flexDirection="column">
        {/* Show collapse indicator if there are hidden lines */}
        {hiddenLinesCount !== undefined && totalLines !== undefined && (
          <CollapseIndicator
            hiddenLinesCount={hiddenLinesCount}
            totalLines={totalLines}
            showAllHistory={showAllHistory || false}
          />
        )}
        {/* Active messages - must be dynamic so new messages appear */}
        <MessageList messages={activeMessages} />
        {/* Show queued messages in light text */}
        <MessageQueue messages={queuedMessages} />
      </Box>
    </Box>
  );
});

export const ChatInterface = memo(function ChatInterface({
  completedMessages,
  activeMessages,
  hiddenLinesCount = 0,
  totalLines = 0,
  showAllHistory = false,
  onToggleHistory: _onToggleHistory,
  onSendMessage,
  isLoading,
  modelSelectorModels,
  onModelSelect,
  onCancelModelSelection,
  onTriggerModelSelector,
  onProjectSwitch,
  isProcessing = false,
  queuedMessages = [],
  selectedSkills = []
}: ChatInterfaceProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null);
  const [activeInput, setActiveInput] = useState<'main' | 'project' | 'model' | 'notes'>('main');

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

  // Load current model on mount and when messages change (to detect model switches)
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


  useEffect(() => {
    if (activeInput === 'model') {
      onTriggerModelSelector?.();
    }
  }, [activeInput, onTriggerModelSelector]);

  // Handle project selection - memoized to prevent re-creation
  const handleProjectSelect = useCallback(
    async (item: { label: string; value: string }) => {
      try {
        if (item.value === '__create_new__') {
          // Handle "Create New Project" option - show help command
          setActiveInput('main');

          // Directly invoke the project help command to show proper usage
          onSendMessage('/project help');
          return;
        } else {
          await setCurrentProjectConfig(item.value);
        }

        const updatedProject = await getCurrentProject();
        setCurrentProject(updatedProject);
        setActiveInput('main');

        // Notify the chat system that project has switched and wait for it to complete
        if (onProjectSwitch) {
          await onProjectSwitch();
        }
      } catch (error) {
        console.error('Failed to set current project:', error);
        setActiveInput('main');
      }
    },
    [onSendMessage, onProjectSwitch]
  );

  // Handle input submission - memoized to prevent re-creation
  const handleInputSubmit = useCallback(
    (input: string) => {
      onSendMessage(input.trim());
    },
    [onSendMessage]
  );

  // Global hotkey handling for input focus management
  useInput(
    (inputChar, key) => {
      // Cancel model selection, project selector, and notes selector
      if (key.escape) {
        onCancelModelSelection?.();
        setActiveInput('main');
      }
    },
    { isActive: activeInput !== 'main' }
  );

  // Handle note insertion
  const handleInsertNote = useCallback(
    (noteContent: string) => {
      onSendMessage(noteContent);
      setActiveInput('main');
    },
    [onSendMessage]
  );

  const { height } = useScreenSize();
  return (
    <Box flexDirection="column" minHeight={height}>
      {/* Messages - two-zone rendering: Static (completed) + Dynamic (active) */}
      <ViewMessages
        completedMessages={completedMessages}
        activeMessages={activeMessages}
        queuedMessages={queuedMessages}
        hiddenLinesCount={hiddenLinesCount}
        totalLines={totalLines}
        showAllHistory={showAllHistory}
      />
      {/* Thinking indicator outside flex container */}
      <ThinkingIndicator isVisible={isLoading || isProcessing} selectedSkills={selectedSkills} />
      <Box flexDirection="column">
        {/* Input */}
        <InputComponent
          activeInput={activeInput}
          models={modelSelectorModels || []}
          onProjectSelect={handleProjectSelect}
          onModelSelect={async (modelValue: string) => {
            setActiveInput('main');
            // Await the model switch to complete before reloading
            await onModelSelect?.(modelValue);
            // Reload model from storage after selection to update display
            try {
              const model = await loadCurrentModel();
              setCurrentModel(model);
            } catch (error) {
              console.error('Failed to reload model after selection:', error);
            }
          }}
          onSubmit={handleInputSubmit || (() => {})}
          onInsertNote={handleInsertNote || (() => {})}
          setActiveInput={setActiveInput || (() => {})}
        />
        {/* Project Status */}
        <ProjectStatus project={currentProject} model={currentModel} />
      </Box>
    </Box>
  );
});

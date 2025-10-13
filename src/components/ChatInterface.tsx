import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Message } from '../types';
import {
  getCurrentProject,
  setCurrentProject as setCurrentProjectConfig
} from '../utils/projectConfig';
import type { Project } from '../types/project';
import type { ModelSelectCommand, ModelConfig } from '../types/models';
import { loadCurrentModel } from '../utils/modelStorage';
import HybridInput from './HybridInput';
import ProjectSelector from './ProjectSelector';
import ModelSelector from './ModelSelector';
import NotesSelector from './NotesSelector';
import type { QueuedMessage } from '../hooks/useChat';
import { RequestLogDisplay } from './RequestLogDisplay';
import { renderMarkdown, isASCIICapableTerminal } from '../utils/markdownRenderer';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onAddSystemMessage: (message: string) => void;
  isLoading: boolean;
  interactiveCommand?: ModelSelectCommand | null;
  onModelSelect?: (modelValue: string) => void;
  onCancelModelSelection?: () => void;
  onTriggerModelSelector?: () => void;
  onProjectSwitch?: () => Promise<void>;
  isProcessing?: boolean;
  queuedMessages?: Array<QueuedMessage>;
}

const ThinkingIndicator = memo(() => {
  return (
    <Box flexDirection="column">
      <Text color="red">PM is thinking...</Text>
      <RequestLogDisplay isVisible={true} />
    </Box>
  );
});

const QueuedMessageItem = memo(
  ({ message }: {  message: QueuedMessage }) => {
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
    messages?: Array<QueuedMessage>;
  }) => {
    if (!queuedMessages || queuedMessages.length === 0) return null;

    return (
      <Box flexDirection="column">
        {queuedMessages.map((queuedMsg, i) => (
          <QueuedMessageItem key={`queued-message-${i}`} message={queuedMsg} />
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
          <Text color="blackBright">(shift+tab: switch project, option+m: switch model, option+n: notes)</Text>
        </Text>
      </Box>
    );
  }
);

// Individual message component to prevent full rerenders
const MessageItem = memo(({ message }: { message: Message }) => {
  const [renderedContent, setRenderedContent] = useState<string>(message.content);
  const [isRendering, setIsRendering] = useState(false);

  const backgroundColor = useMemo(() => {
    if (message.role === 'system' || message.role === 'ui-notification') return '#2e1d11';
    if (message.role === 'assistant') return 'black';
    return '#333';
  }, [message.role]);

  const textColor = useMemo(() => {
    if (message.role === 'system' || message.role === 'ui-notification') return '#cb9774';
    if (message.role === 'user') return 'white';
    // All messages use white text for consistency
    return 'brightWhite';
  }, [message.role]);
  
  const prefix = useMemo(() => {
    if (message.role === 'system' || message.role === 'ui-notification') return 'System:\n';
    return undefined
  }, [message.role]);


  const isSystemMessage = message.role === 'system' || message.role === 'ui-notification';
  const isUserMessage = message.role === 'user';
  const shouldAddPadding = !isSystemMessage && !isUserMessage;

  // Determine if this message should be rendered with markdown
  const shouldRenderMarkdown = useMemo(() => {
    // Only render markdown for assistant messages
    if (message.role === 'assistant') {
      // Check if rendering is enabled
      return isASCIICapableTerminal();
    }
    return false;
  }, [message.role]);

  // Prepend emoji to system and user messages
  const displayContent = useMemo(() => {
    if (isSystemMessage) {
      return `System: ${message.content}`;
    }
    if (isUserMessage) {
      return `> ${message.content}`;
    }
    // For PM messages, use rendered content
    return isRendering ? message.content : renderedContent;
  }, [message.role, isRendering, message.content, renderedContent]);

  // Render markdown for PM messages
  useEffect(() => {
    // Always reset renderedContent immediately when message changes
    setRenderedContent(message.content);

    if (!shouldRenderMarkdown) {
      return;
    }

    setIsRendering(true);
    renderMarkdown(message.content)
      .then((rendered) => {
        setRenderedContent(rendered);
        setIsRendering(false);
      })
      .catch((error) => {
        console.error('Failed to render markdown:', error);
        setRenderedContent(message.content);
        setIsRendering(false);
      });
  }, [message.content, shouldRenderMarkdown]);


  return (
    <Box
      marginBottom={1}
      flexDirection="column"
      paddingX={1}
      paddingY={shouldAddPadding ? 1 : 0}
      backgroundColor={backgroundColor}
    >
      <Text color={textColor}>
        {displayContent}
      </Text>
    </Box>
  );
});

// TODO: implement buffering of messages
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageItem key={message.id || `fallback-${index}`} message={message} />
      ))}
    </>
  );
}

export const ChatInterface = memo(function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  interactiveCommand,
  onModelSelect,
  onCancelModelSelection,
  onTriggerModelSelector,
  onProjectSwitch,
  isProcessing = false,
  queuedMessages = []
}: ChatInterfaceProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showNotesSelector, setShowNotesSelector] = useState(false);
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
          // Handle "Create New Project" option - show help command
          setShowProjectSelector(false);
          setActiveInput('main');

          // Directly invoke the project help command to show proper usage
          onSendMessage('/project help');
          return;
        } else {
          await setCurrentProjectConfig(item.value);
        }

        const updatedProject = await getCurrentProject();
        setCurrentProject(updatedProject);
        setShowProjectSelector(false);
        setActiveInput('main');
        
        // Notify the chat system that project has switched and wait for it to complete
        if (onProjectSwitch) {
          await onProjectSwitch();
        }
      } catch (error) {
        console.error('Failed to set current project:', error);
        setShowProjectSelector(false);
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
  useInput((inputChar, key) => {
    // Cancel model selection, project selector, and notes selector
    if (key.escape) {
      onCancelModelSelection?.();
      setShowProjectSelector(false);
      setShowNotesSelector(false);
      setActiveInput('main');
    }
  }, { isActive: activeInput !== 'main' });


  // Update active input state when selectors show/hide
  useEffect(() => {
    if (showProjectSelector) {
      setActiveInput('project');
    } else if (showNotesSelector) {
      setActiveInput('notes');
    } else if (interactiveCommand?.type === 'model-select') {
      setActiveInput('model');
    } else {
      setActiveInput('main');
    }
  }, [showProjectSelector, showNotesSelector, interactiveCommand]);

  // Handle note insertion
  const handleInsertNote = useCallback(
    (noteContent: string, noteId: number) => {
      onSendMessage(noteContent);
      setShowNotesSelector(false);
      setActiveInput('main');
    },
    [onSendMessage]
  );

  let inputComponent = (
    <HybridInput
      focus={activeInput === 'main'}
      placeholder="Type your message..."
      onSubmit={handleInputSubmit}
      onShowModelSelector={() => {onTriggerModelSelector?.(); setActiveInput('model')}}
      onShowProjectSelector={() => {setShowProjectSelector(true); setActiveInput('project')}}
      onShowNotesSelector={() => {setShowNotesSelector(true); setActiveInput('notes')}}
    />
  );

  if (showProjectSelector) {
    inputComponent = (
      <ProjectSelector
        onProjectSelect={handleProjectSelect}
      />
    );
  }

  if (showNotesSelector) {
    inputComponent = (
      <NotesSelector
        onClose={() => {setShowNotesSelector(false); setActiveInput('main')}}
        onInsertNote={handleInsertNote}
      />
    );
  }

  if (interactiveCommand?.type === 'model-select') {
    inputComponent = (
      <ModelSelector
        command={interactiveCommand}
        onModelSelect={onModelSelect}
      />
    );
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

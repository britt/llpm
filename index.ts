#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { ChatInterface } from './src/components/ChatInterface';
import { useChat } from './src/hooks/useChat';
import { setVerbose, debug } from './src/utils/logger';
import { ensureDefaultSystemPromptFile } from './src/utils/systemPrompt';
import { validateEnvironment } from './src/utils/validation';
import { credentialManager } from './src/utils/credentialManager';
import { modelRegistry } from './src/services/modelRegistry';
import { initializeTelemetry } from './src/utils/telemetry';
import { filterMessagesByLines } from './src/utils/messageLineCounter';
import { getMaxRenderedLines } from './src/utils/chatConfig';
import { getSkillRegistry } from './src/services/SkillRegistry';
import { listProjects, getCurrentProject, setCurrentProject } from './src/utils/projectConfig';

// Re-export validateEnvironment for external use
export { validateEnvironment } from './src/utils/validation';

export function App() {
  const {
    messages,
    sendMessage,
    addSystemMessage,
    isLoading,
    modelSelectorModels,
    handleModelSelect,
    cancelModelSelection,
    triggerModelSelector,
    notifyProjectSwitch,
    isProcessing,
    queuedMessages,
    selectedSkills
  } = useChat();

  // State to track whether to show all history or just the tail
  const [showAllHistory, setShowAllHistory] = React.useState(false);
  const [maxRenderedLines, setMaxRenderedLines] = React.useState(300);

  // Number of recent messages to keep in dynamic zone (rest go to static)
  // Keep this as low as possible to minimize flicker - only streaming/updating messages need to be dynamic
  // When not loading: 0 messages in dynamic zone = zero flicker when typing
  // When loading: 1 message in dynamic zone = only the streaming message can update
  const DYNAMIC_MESSAGE_COUNT = isLoading ? 1 : 0;

  // Track messages that have been moved to static zone
  // Static zone NEVER recalculates - only accumulates new messages
  const [staticMessages, setStaticMessages] = React.useState<typeof messages>([]);

  // Load max rendered lines configuration on mount
  React.useEffect(() => {
    getMaxRenderedLines().then(setMaxRenderedLines);
  }, []);

  // Update static messages when new messages should move from dynamic to static
  React.useEffect(() => {
    const messagesToShow = showAllHistory
      ? messages
      : filterMessagesByLines(messages, maxRenderedLines).visibleMessages;

    // Calculate how many messages should be in static zone
    const splitIndex = Math.max(0, messagesToShow.length - DYNAMIC_MESSAGE_COUNT);
    const shouldBeStatic = messagesToShow.slice(0, splitIndex);

    // Only update static messages if new ones should be added
    // Compare by length first for performance, then by last message ID to detect actual changes
    if (shouldBeStatic.length > staticMessages.length) {
      const lastStaticId = staticMessages[staticMessages.length - 1]?.id;
      const newLastStaticId = shouldBeStatic[staticMessages.length]?.id;

      // Only update if there's actually a new message (not just a re-render)
      if (lastStaticId !== newLastStaticId) {
        setStaticMessages(shouldBeStatic);
      }
    } else if (shouldBeStatic.length < staticMessages.length) {
      // If we should have fewer static messages (e.g., after filtering), update
      setStaticMessages(shouldBeStatic);
    }
  }, [messages, showAllHistory, maxRenderedLines, staticMessages]);

  // Split messages into static (completed) and dynamic (active) zones
  const { completedMessages, activeMessages, hiddenLinesCount, totalLines } = React.useMemo(() => {
    if (showAllHistory) {
      // When showing all history, use static messages + dynamic messages
      const totalLines = messages.reduce((sum, msg) => {
        const lines = (msg.content.match(/\n/g) || []).length;
        return sum + (msg.content.endsWith('\n') ? lines : lines + 1);
      }, 0);

      // Active messages are everything after static messages
      const activeStartIndex = staticMessages.length;
      const activeMessages = messages.slice(activeStartIndex);

      return {
        completedMessages: staticMessages,
        activeMessages,
        hiddenLinesCount: 0,
        totalLines
      };
    }

    // When not showing all history, filter by line count first
    const { visibleMessages, hiddenLinesCount, totalLines } = filterMessagesByLines(messages, maxRenderedLines);

    // Active messages are everything after static messages in the visible range
    const activeStartIndex = staticMessages.length;
    const activeMessages = visibleMessages.slice(activeStartIndex);

    return {
      completedMessages: staticMessages,
      activeMessages,
      hiddenLinesCount,
      totalLines
    };
  }, [messages, showAllHistory, maxRenderedLines, staticMessages, isLoading]);

  return React.createElement(ChatInterface, {
    completedMessages,
    activeMessages,
    hiddenLinesCount,
    totalLines,
    showAllHistory,
    onToggleHistory: () => setShowAllHistory(!showAllHistory),
    onSendMessage: sendMessage,
    onAddSystemMessage: addSystemMessage,
    isLoading,
    modelSelectorModels,
    onModelSelect: handleModelSelect,
    onCancelModelSelection: cancelModelSelection,
    onTriggerModelSelector: triggerModelSelector,
    onProjectSwitch: notifyProjectSwitch,
    isProcessing,
    queuedMessages,
    selectedSkills
  });
}

// Check if raw mode is supported
function isRawModeSupported(): boolean {
  try {
    // Check if we're in a TTY and stdin supports raw mode
    return process.stdin.isTTY && typeof process.stdin.setRawMode === 'function';
  } catch {
    return false;
  }
}

if (import.meta.main) {
  (async () => {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isVerbose = args.includes('--verbose') || args.includes('-v');

    if (isVerbose) {
      setVerbose(true);
      debug('Verbose mode enabled');
      debug('Command line args:', args);
    }

    // Parse profile flag
    const profileFlagIndex = args.findIndex(arg => arg === '--profile' || arg === '-p');
    if (profileFlagIndex !== -1 && profileFlagIndex + 1 < args.length) {
      const profileName = args[profileFlagIndex + 1];
      credentialManager.setProfileOverride(profileName ?? '');
      debug(`Profile set to: ${profileName}`);
    }

    debug('Starting LLPM CLI');
    await validateEnvironment();

    // Initialize telemetry if enabled
    debug('Initializing telemetry');
    initializeTelemetry({
      serviceName: 'llpm',
      serviceVersion: '0.16.0',
    });
    debug('Telemetry initialization completed');

    // Initialize model registry with credentials
    debug('Initializing model registry');
    await modelRegistry.init();
    debug('Model registry initialized');

    // Initialize skill registry and scan for skills
    debug('Initializing skill registry');
    const skillRegistry = getSkillRegistry();
    await skillRegistry.scan();
    debug(`Skill registry initialized, discovered ${skillRegistry.getAllSkills().length} skills`);

    // Ensure default system prompt file exists
    try {
      await ensureDefaultSystemPromptFile();
      debug('System prompt file initialization completed');
    } catch (error) {
      debug('Failed to initialize system prompt file:', error);
      // Don't exit on this error - it's not critical for the app to run
    }

    // Auto-detect project based on current working directory
    try {
      const cwd = process.cwd();
      debug('Current working directory:', cwd);

      const currentProject = await getCurrentProject();
      const allProjects = await listProjects();

      // Find a project that matches the current directory
      const matchingProject = allProjects.find(project => {
        // Check if CWD matches project path exactly or is within project path
        return cwd === project.path || cwd.startsWith(project.path + '/');
      });

      if (matchingProject) {
        // Only auto-switch if there's no current project or if the matching project is different
        if (!currentProject || currentProject.id !== matchingProject.id) {
          await setCurrentProject(matchingProject.id);
          debug(`Auto-detected and switched to project: ${matchingProject.name} (${matchingProject.id})`);
        } else {
          debug(`Current directory matches active project: ${matchingProject.name}`);
        }
      } else {
        debug('No matching project found for current directory');
      }
    } catch (error) {
      debug('Error during project auto-detection:', error);
      // Don't exit on this error - it's not critical for the app to run
    }

    // Check if raw mode is supported
    if (!isRawModeSupported()) {
      console.error('❌ Error: Raw mode is not supported on this terminal.');
      console.error('');
      console.error('This typically happens when:');
      console.error('1. Running in a non-interactive environment (pipes, scripts, etc.)');
      console.error('2. Terminal does not support raw input mode');
      console.error('3. Running in certain CI/CD environments');
      console.error('');
      console.error('To fix this:');
      console.error('1. Run in an interactive terminal (like Terminal.app, iTerm2, etc.)');
      console.error('2. Ensure stdin is connected to a terminal');
      console.error('3. Try running directly: bun run index.ts');
      process.exit(1);
    }

    debug('Raw mode supported, rendering React app');

    render(React.createElement(App));
  })();
}

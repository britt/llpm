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
    queuedMessages
  } = useChat();

  // State to track whether to show all history or just the tail
  const [showAllHistory, setShowAllHistory] = React.useState(false);
  const [maxRenderedLines, setMaxRenderedLines] = React.useState(300);

  // Load max rendered lines configuration on mount
  React.useEffect(() => {
    getMaxRenderedLines().then(setMaxRenderedLines);
  }, []);

  // Filter messages based on line count (unless showing all history)
  // Full history is still maintained in useChat hook
  const { visibleMessages, hiddenLinesCount, totalLines } = React.useMemo(() => {
    if (showAllHistory) {
      // Show all messages
      const totalLines = messages.reduce((sum, msg) => {
        const lines = (msg.content.match(/\n/g) || []).length;
        return sum + (msg.content.endsWith('\n') ? lines : lines + 1);
      }, 0);
      return {
        visibleMessages: messages,
        hiddenLinesCount: 0,
        totalLines
      };
    }

    return filterMessagesByLines(messages, maxRenderedLines);
  }, [messages, showAllHistory, maxRenderedLines]);

  return React.createElement(ChatInterface, {
    messages: visibleMessages,
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
    queuedMessages
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
      credentialManager.setProfileOverride(profileName);
      debug(`Profile set to: ${profileName}`);
    }

    debug('Starting LLPM CLI');
    await validateEnvironment();

    // Initialize telemetry if enabled
    debug('Initializing telemetry');
    initializeTelemetry({
      serviceName: 'llpm',
      serviceVersion: '0.15.0',
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

#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { ChatInterface } from './src/components/ChatInterface';
import { useChat } from './src/hooks/useChat';
import { setVerbose, debug } from './src/utils/logger';
import { ensureDefaultSystemPromptFile } from './src/utils/systemPrompt';
import { credentialManager } from './src/utils/credentialManager';

export async function validateEnvironment() {
  debug('Validating credentials (environment variables and profiles)');
  
  const hasOpenAI = !!(await credentialManager.getOpenAIAPIKey());
  const hasAnthropic = !!(await credentialManager.getAnthropicAPIKey());
  const hasGroq = !!(await credentialManager.getGroqAPIKey());
  const hasVertex = !!(await credentialManager.getGoogleVertexProjectId());
  
  if (!hasOpenAI && !hasAnthropic && !hasGroq && !hasVertex) {
    const currentProfile = credentialManager.getCurrentProfileName();
    debug('No AI provider credentials found');
    console.error('❌ Error: At least one AI provider credential is required');
    console.error('');
    console.error(`Currently active profile: ${currentProfile}`);
    console.error('');
    console.error('🔧 Setup options:');
    console.error('');
    console.error('1. Environment Variables:');
    console.error('  OPENAI_API_KEY=your-key-here');
    console.error('  ANTHROPIC_API_KEY=your-key-here');
    console.error('  GROQ_API_KEY=your-key-here');
    console.error('  GOOGLE_VERTEX_PROJECT_ID=your-project-id');
    console.error('');
    console.error('2. Stored Credentials (persistent):');
    console.error('  /credentials set openai apiKey your-key-here');
    console.error('  /credentials set anthropic apiKey your-key-here');
    console.error('  /credentials set groq apiKey your-key-here');
    console.error('  /credentials set googleVertex projectId your-project-id');
    console.error('');
    console.error('3. Different Profile:');
    console.error('  llpm --profile work');
    console.error('  /credentials profile create work');
    console.error('');
    console.error('Get API keys from:');
    console.error('• OpenAI: https://platform.openai.com/api-keys');
    console.error('• Anthropic: https://console.anthropic.com/');
    console.error('• Groq: https://console.groq.com/keys');
    process.exit(1);
  }
  
  debug('Environment validation passed');
  debug('Available providers:', { hasOpenAI, hasAnthropic, hasGroq, hasVertex });
}

export function App() {
  const { 
    messages, 
    sendMessage, 
    addSystemMessage, 
    isLoading,
    interactiveCommand,
    handleModelSelect,
    cancelModelSelection,
    triggerModelSelector,
    isProcessing,
    queuedMessages
  } = useChat();

  return React.createElement(ChatInterface, {
    messages,
    onSendMessage: sendMessage,
    onAddSystemMessage: addSystemMessage,
    isLoading,
    interactiveCommand,
    onModelSelect: handleModelSelect,
    onCancelModelSelection: cancelModelSelection,
    onTriggerModelSelector: triggerModelSelector,
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

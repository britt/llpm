#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { ChatInterface } from './src/components/ChatInterface';
import { useChat } from './src/hooks/useChat';
import { setVerbose, debug } from './src/utils/logger';
import { ensureDefaultSystemPromptFile } from './src/utils/systemPrompt';

export function validateEnvironment() {
  debug('Validating environment variables');
  
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasVertex = !!process.env.GOOGLE_VERTEX_PROJECT_ID;
  
  if (!hasOpenAI && !hasAnthropic && !hasGroq && !hasVertex) {
    debug('No AI provider API keys found in environment');
    console.error('❌ Error: At least one AI provider API key is required');
    console.error('');
    console.error('Please configure at least one provider:');
    console.error('');
    console.error('OpenAI:');
    console.error('  OPENAI_API_KEY=your-key-here');
    console.error('  Get key from: https://platform.openai.com/api-keys');
    console.error('');
    console.error('Anthropic:');
    console.error('  ANTHROPIC_API_KEY=your-key-here');
    console.error('  Get key from: https://console.anthropic.com/');
    console.error('');
    console.error('Groq:');
    console.error('  GROQ_API_KEY=your-key-here');
    console.error('  Get key from: https://console.groq.com/keys');
    console.error('');
    console.error('Google Vertex AI:');
    console.error('  GOOGLE_VERTEX_PROJECT_ID=your-project-id');
    console.error('  GOOGLE_VERTEX_REGION=us-central1  # optional');
    console.error('');
    console.error('Setup:');
    console.error('1. Copy .env.example to .env: cp .env.example .env');
    console.error('2. Edit .env and add your API key(s)');
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

    debug('Starting LLPM CLI');
    validateEnvironment();

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

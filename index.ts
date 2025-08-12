#!/usr/bin/env bun
import React from 'react';
import { render, Text, Box } from 'ink';
import { ChatInterface } from './src/components/ChatInterface';
import { useChat } from './src/hooks/useChat';
import { setVerbose, debug } from './src/utils/logger';

export function validateEnvironment() {
  debug('Validating environment variables');
  if (!process.env.OPENAI_API_KEY) {
    debug('OPENAI_API_KEY not found in environment');
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    console.error('');
    console.error('Please set your OpenAI API key:');
    console.error('1. Copy .env.example to .env: cp .env.example .env');
    console.error('2. Edit .env and add your API key: OPENAI_API_KEY=your-key-here');
    console.error('3. Get your API key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }
  debug('Environment validation passed');
}

export function App() {
  const { messages, sendMessage, isLoading } = useChat();

  return React.createElement(ChatInterface, {
    messages,
    onSendMessage: sendMessage,
    isLoading
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
  // Parse command line arguments
  const args = process.argv.slice(2);
  const isVerbose = args.includes('--verbose') || args.includes('-v');
  
  if (isVerbose) {
    setVerbose(true);
    debug('Verbose mode enabled');
    debug('Command line args:', args);
  }
  
  debug('Starting Claude PM CLI');
  validateEnvironment();
  
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
}
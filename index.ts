#!/usr/bin/env bun
import React from 'react';
import { render, Text, Box } from 'ink';
import { ChatInterface } from './src/components/ChatInterface';
import { useChat } from './src/hooks/useChat';

export function validateEnvironment() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    console.error('');
    console.error('Please set your OpenAI API key:');
    console.error('1. Copy .env.example to .env: cp .env.example .env');
    console.error('2. Edit .env and add your API key: OPENAI_API_KEY=your-key-here');
    console.error('3. Get your API key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }
}

export function App() {
  const { messages, sendMessage, isLoading } = useChat();

  return React.createElement(ChatInterface, {
    messages,
    onSendMessage: sendMessage,
    isLoading
  });
}

if (import.meta.main) {
  validateEnvironment();
  render(React.createElement(App));
}
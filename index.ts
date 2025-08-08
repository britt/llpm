#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { ChatInterface } from './src/components/ChatInterface';
import { useChat } from './src/hooks/useChat';

export function App() {
  const { messages, sendMessage, isLoading } = useChat();

  return React.createElement(ChatInterface, {
    messages,
    onSendMessage: sendMessage,
    isLoading
  });
}

if (import.meta.main) {
  render(React.createElement(App));
}
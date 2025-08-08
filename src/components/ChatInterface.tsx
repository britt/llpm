import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('');

  useInput((inputChar, key) => {
    if (key.return && input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    } else if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && !key.return && inputChar) {
      setInput(prev => prev + inputChar);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text bold>Claude PM - AI Assistant</Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {messages.map((message, index) => (
          <Box key={index} marginBottom={1}>
            <Text color={message.role === 'user' ? 'blue' : 'green'} bold>
              {message.role === 'user' ? 'You: ' : 'Assistant: '}
            </Text>
            <Text>{message.content}</Text>
          </Box>
        ))}
        {isLoading && (
          <Box>
            <Text color="yellow">Assistant is typing...</Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box borderStyle="single" paddingX={1}>
        <Text>
          {'> '}
          {input}
          <Text backgroundColor="white" color="black"> </Text>
        </Text>
      </Box>
    </Box>
  );
}
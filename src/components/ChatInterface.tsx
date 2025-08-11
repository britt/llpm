import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Message } from '../types';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load input history on mount
  useEffect(() => {
    loadInputHistory().then(history => {
      setInputHistory(history);
    });
  }, []);

  useInput((inputChar, key) => {
    if (key.return && input.trim() && !isLoading) {
      const message = input.trim();
      
      // Add to history (avoid duplicates)
      setInputHistory(prev => {
        const newHistory = [message, ...prev.filter(h => h !== message)];
        const limitedHistory = newHistory.slice(0, 100); // Keep last 100 commands
        
        // Save to disk asynchronously
        saveInputHistory(limitedHistory);
        
        return limitedHistory;
      });
      
      onSendMessage(message);
      setInput('');
      setHistoryIndex(-1);
    } else if (key.upArrow) {
      // Navigate up in history
      if (inputHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
      }
    } else if (key.downArrow) {
      // Navigate down in history
      if (historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        if (newIndex < 0) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(inputHistory[newIndex]);
        }
      }
    } else if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      setHistoryIndex(-1); // Reset history navigation when editing
    } else if (!key.ctrl && !key.meta && !key.return && inputChar) {
      setInput(prev => prev + inputChar);
      setHistoryIndex(-1); // Reset history navigation when typing
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
          <Box key={message.id || `msg-${index}`} marginBottom={1}>
            <Text color={message.role === 'user' ? 'blue' : message.role === 'system' ? 'magenta' : 'green'} bold>
              {message.role === 'user' ? 'You: ' : message.role === 'system' ? 'System: ' : 'PM: '}
            </Text>
            <Text>{message.content}</Text>
          </Box>
        ))}
        {isLoading && (
          <Box>
            <Text color="yellow">PM is typing...</Text>
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
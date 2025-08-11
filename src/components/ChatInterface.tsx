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
  const [cursorPos, setCursorPos] = useState(0);

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
      setCursorPos(0);
      setHistoryIndex(-1);
    } else if (key.upArrow) {
      // Navigate up in history
      if (inputHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(newIndex);
        const historyText = inputHistory[newIndex];
        setInput(historyText);
        setCursorPos(historyText.length);
      }
    } else if (key.downArrow) {
      // Navigate down in history
      if (historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        if (newIndex < 0) {
          setHistoryIndex(-1);
          setInput('');
          setCursorPos(0);
        } else {
          setHistoryIndex(newIndex);
          const historyText = inputHistory[newIndex];
          setInput(historyText);
          setCursorPos(historyText.length);
        }
      }
    } else if (key.ctrl && inputChar === 'u') {
      // Ctrl+U: Clear line from cursor to beginning
      setInput(prev => prev.slice(cursorPos));
      setCursorPos(0);
      setHistoryIndex(-1);
    } else if (key.ctrl && inputChar === 'k') {
      // Ctrl+K: Clear line from cursor to end
      setInput(prev => prev.slice(0, cursorPos));
      setHistoryIndex(-1);
    } else if (key.ctrl && inputChar === 'a') {
      // Ctrl+A: Move cursor to beginning of line
      setCursorPos(0);
    } else if (key.ctrl && inputChar === 'e') {
      // Ctrl+E: Move cursor to end of line
      setCursorPos(input.length);
    } else if (key.ctrl && inputChar === 'w') {
      // Ctrl+W: Delete word backwards
      const beforeCursor = input.slice(0, cursorPos);
      const afterCursor = input.slice(cursorPos);
      const words = beforeCursor.split(/\s+/);
      words.pop(); // Remove last word
      const newBeforeCursor = words.join(' ');
      const newInput = newBeforeCursor + (newBeforeCursor ? ' ' : '') + afterCursor;
      setInput(newInput.trim());
      setCursorPos(newBeforeCursor.length + (newBeforeCursor ? 1 : 0));
      setHistoryIndex(-1);
    } else if (key.ctrl && inputChar === 'l') {
      // Ctrl+L: Clear screen (handled by sending /clear command)
      onSendMessage('/clear');
      setInput('');
      setCursorPos(0);
      setHistoryIndex(-1);
    } else if (key.leftArrow) {
      // Left arrow: Move cursor left
      setCursorPos(Math.max(0, cursorPos - 1));
    } else if (key.rightArrow) {
      // Right arrow: Move cursor right  
      setCursorPos(Math.min(input.length, cursorPos + 1));
    } else if (key.ctrl && (inputChar === 'b' || key.leftArrow)) {
      // Ctrl+B: Move cursor left (alternative)
      setCursorPos(Math.max(0, cursorPos - 1));
    } else if (key.ctrl && (inputChar === 'f' || key.rightArrow)) {
      // Ctrl+F: Move cursor right (alternative)
      setCursorPos(Math.min(input.length, cursorPos + 1));
    } else if (key.ctrl && inputChar === 'd') {
      // Ctrl+D: Delete character at cursor
      setInput(prev => prev.slice(0, cursorPos) + prev.slice(cursorPos + 1));
      setHistoryIndex(-1);
    } else if (key.backspace || key.delete) {
      // Backspace: Delete character before cursor
      if (cursorPos > 0) {
        setInput(prev => prev.slice(0, cursorPos - 1) + prev.slice(cursorPos));
        setCursorPos(cursorPos - 1);
        setHistoryIndex(-1);
      }
    } else if (!key.ctrl && !key.meta && !key.return && inputChar) {
      // Regular character input: Insert at cursor position
      setInput(prev => prev.slice(0, cursorPos) + inputChar + prev.slice(cursorPos));
      setCursorPos(cursorPos + 1);
      setHistoryIndex(-1);
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
          {input.slice(0, cursorPos)}
          <Text backgroundColor="white" color="black">
            {cursorPos < input.length ? input[cursorPos] : ' '}
          </Text>
          {input.slice(cursorPos + 1)}
        </Text>
      </Box>
    </Box>
  );
}
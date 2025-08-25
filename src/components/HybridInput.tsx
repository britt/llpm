import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';
import { debug } from '../utils/logger';

interface HybridInputProps {
  value?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  focus?: boolean;
  disabled?: boolean;
}

export default function HybridInput({
  value = '',
  placeholder = 'Type your message...',
  onSubmit,
  onChange,
  focus = true,
  disabled = false
}: HybridInputProps) {
  const [displayInput, setDisplayInput] = useState(value);
  const [displayCursor, setDisplayCursor] = useState(value.length);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  // Use refs to avoid re-renders during typing
  const inputRef = useRef(value);
  const cursorRef = useRef(value.length);
  const historyIndexRef = useRef(-1);

  const updateDisplay = useCallback(() => {
    setDisplayInput(inputRef.current);
    setDisplayCursor(cursorRef.current);
  }, []);

  // Load input history on mount
  useEffect(() => {
    loadInputHistory().then(history => {
      setInputHistory(history);
    });
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value !== inputRef.current) {
      inputRef.current = value;
      cursorRef.current = value.length;
      updateDisplay();
    }
  }, [value, updateDisplay]);

  const handleHistoryUp = useCallback(() => {
    if (inputHistory.length > 0) {
      const newIndex = Math.min(historyIndexRef.current + 1, inputHistory.length - 1);
      const historyText = inputHistory[newIndex];
      debug('history up', newIndex, historyText);
      if (historyText) {
        historyIndexRef.current = newIndex;
        inputRef.current = historyText;
        cursorRef.current = historyText.length;
        updateDisplay();
      }
    }
  }, [inputHistory, updateDisplay]);

  const handleHistoryDown = useCallback(() => {
    if (historyIndexRef.current >= 0) {
      const newIndex = historyIndexRef.current - 1;
      if (newIndex < 0) {
        historyIndexRef.current = -1;
        inputRef.current = '';
        cursorRef.current = 0;
        updateDisplay();
      } else {
        const historyText = inputHistory[newIndex];
        debug('history down', newIndex, historyText);
        if (historyText) {
          historyIndexRef.current = newIndex;
          inputRef.current = historyText;
          cursorRef.current = historyText.length;
          updateDisplay();
        }
      }
    }
  }, [inputHistory, updateDisplay]);

  useInput((inputChar, key) => {
    if (!focus || disabled) return;

    // Handle return key
    if (key.return) {
      const currentInput = inputRef.current.trim();
      onSubmit?.(currentInput);
      
      // Add to history and save
      if (currentInput) {
        setInputHistory(prev => {
          const newHistory = [currentInput, ...prev.filter(h => h !== currentInput)];
          const limitedHistory = newHistory.slice(0, 100); // Keep last 100 commands
          
          // Save to disk asynchronously
          saveInputHistory(limitedHistory);
          
          return limitedHistory;
        });
      }
      
      // Reset input
      inputRef.current = '';
      cursorRef.current = 0;
      historyIndexRef.current = -1;
      updateDisplay();
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      if (cursorRef.current > 0) {
        const currentInput = inputRef.current;
        const newInput =
          currentInput.slice(0, cursorRef.current - 1) + currentInput.slice(cursorRef.current);
        inputRef.current = newInput;
        cursorRef.current = cursorRef.current - 1;
        updateDisplay();
        onChange?.(newInput);
      }
      return;
    }

    // Handle arrow keys
    if (key.upArrow && !key.ctrl && !key.shift) {
      handleHistoryUp();
      return;
    }

    if (key.downArrow && !key.ctrl && !key.shift) {
      handleHistoryDown();
      return;
    }

    if (key.leftArrow) {
      cursorRef.current = Math.max(0, cursorRef.current - 1);
      updateDisplay();
      return;
    }

    if (key.rightArrow) {
      cursorRef.current = Math.min(inputRef.current.length, cursorRef.current + 1);
      updateDisplay();
      return;
    }

    // Handle Ctrl combinations
    if (key.ctrl && inputChar === 'a') {
      cursorRef.current = 0;
      updateDisplay();
      return;
    }

    if (key.ctrl && inputChar === 'e') {
      cursorRef.current = inputRef.current.length;
      updateDisplay();
      return;
    }

    if (key.ctrl && inputChar === 'u') {
      inputRef.current = '';
      cursorRef.current = 0;
      updateDisplay();
      onChange?.('');
      return;
    }

    // Regular character input
    if (inputChar && !key.ctrl && !key.meta) {
      // Check for pasted content (multiple characters at once)
      if (inputChar.length > 1) {
        const currentInput = inputRef.current;
        const cursor = cursorRef.current;
        const newInput = currentInput.slice(0, cursor) + inputChar + currentInput.slice(cursor);
        inputRef.current = newInput;
        cursorRef.current = cursor + inputChar.length;
        updateDisplay();
        onChange?.(newInput);
        return;
      }

      // Single character input
      if (inputChar.length === 1) {
        const currentInput = inputRef.current;
        const cursor = cursorRef.current;
        const newInput = currentInput.slice(0, cursor) + inputChar + currentInput.slice(cursor);
        inputRef.current = newInput;
        cursorRef.current = cursor + 1;
        updateDisplay();
        onChange?.(newInput);
        return;
      }
    }
  }, { isActive: focus && !disabled });

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text>
        <Text color="cyan" bold>
          &gt;{' '}
        </Text>
        {displayInput.length > 0 || displayCursor > 0 ? (
          <>
            {displayInput.slice(0, displayCursor)}
            <Text backgroundColor="white" color="black">
              {displayInput[displayCursor] || ' '}
            </Text>
            {displayInput.slice(displayCursor + 1)}
          </>
        ) : (
          <>
            <Text backgroundColor="white" color="black">
              {' '}
            </Text>
            <Text dimColor>{placeholder}</Text>
          </>
        )}
      </Text>
    </Box>
  );
}
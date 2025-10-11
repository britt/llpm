import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';
import { debug } from '../utils/logger';

interface HybridInputProps {
  value?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  focus?: boolean;
  disabled?: boolean;
  onShowModelSelector?: () => void;
  onShowProjectSelector?: () => void;
  onShowNotesSelector?: () => void;
}

interface InputState {
  input: string;
  cursor: number;
}

export default function HybridInput({
  value = '',
  placeholder = 'Type your message...',
  onSubmit,
  focus = true,
  disabled = false,
  onShowModelSelector,
  onShowProjectSelector,
  onShowNotesSelector
}: HybridInputProps) {
  const [inputState, setInputState] = useState<InputState>({
    input: value,
    cursor: value.length
  });
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  // Use refs to avoid re-renders during typing
  const inputStateRef = useRef(inputState);
  const historyIndexRef = useRef(-1);

  const updateInputState = useCallback((newInput: string, newCursor: number) => {
    inputStateRef.current = {
      input: newInput,
      cursor: newCursor
    };
    setInputState(inputStateRef.current);
  }, []);
  
  // Load input history on mount
  useEffect(() => {
    loadInputHistory().then(history => {
      setInputHistory(history);
    });
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value !== inputStateRef.current.input) {
      inputStateRef.current = {
        input: value,
        cursor: value.length
      };
      setInputState(inputStateRef.current);
    }
  }, [value]);

  const handleHistoryUp = useCallback(() => {
    if (inputHistory.length > 0) {
      const newIndex = Math.min(historyIndexRef.current + 1, inputHistory.length - 1);
      const historyText = inputHistory[newIndex];
      debug('history up', newIndex, historyText);
      if (historyText) {
        historyIndexRef.current = newIndex;
        updateInputState(historyText, historyText.length);
      }
    }
  }, [inputHistory]);

  const handleHistoryDown = useCallback(() => {
    if (historyIndexRef.current >= 0) {
      const newIndex = historyIndexRef.current - 1;
      if (newIndex < 0) {
        historyIndexRef.current = -1;
        updateInputState('', 0);
      } else {
        const historyText = inputHistory[newIndex];
        debug('history down', newIndex, historyText);
        if (historyText) {
          historyIndexRef.current = newIndex;
          updateInputState(historyText, historyText.length);
        }
      }
    }
  }, [inputHistory]);

  useInput((inputChar, key) => {
    if (!focus || disabled) return;

    if (key.shift && key.tab) {
      onShowProjectSelector?.();
      return;
    }

    if (key.meta && inputChar === 'm') {
      onShowModelSelector?.();
      return;
    }

    if (key.meta && inputChar === 'n') {
      onShowNotesSelector?.();
      return;
    }

    // Handle return key
    if (key.return) {
      debug('return', inputStateRef.current.input);
      const currentInput = inputStateRef.current.input.trim();
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
      updateInputState('', 0);
      historyIndexRef.current = -1;
      return;
    }

    // Handle backspace
    // This works around a fucking bug in Ink useInput where it doesn't handle backspace correctly
    // If they come in fast it treats them as characters and not as backspaces
    if (key.backspace || key.delete || inputChar.charCodeAt(0) === 127) {
      const deleteLength = Math.max(inputChar.lastIndexOf(String.fromCharCode(127)) + 1, 1);
      if (inputStateRef.current.cursor > 0) {
        const newCursor = inputStateRef.current.cursor - deleteLength;
        const newInput = inputStateRef.current.input.slice(0, newCursor) + inputStateRef.current.input.slice(newCursor + deleteLength);
        updateInputState(newInput, newCursor);
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
      debug('leftArrow', inputStateRef.current.cursor);
      updateInputState(inputStateRef.current.input, Math.max(0, inputStateRef.current.cursor - 1));
      return;
    }

    if (key.rightArrow) {
      debug('rightArrow', inputStateRef.current.cursor);
      updateInputState(inputStateRef.current.input, Math.min(inputStateRef.current.input.length, inputStateRef.current.cursor + 1));
      return;
    }

    // Handle Ctrl combinations
    if (key.ctrl && inputChar === 'a') {
      inputStateRef.current = {
        input: inputStateRef.current.input,
        cursor: 0
      };
      updateInputState(inputStateRef.current.input, 0);
      return;
    }

    if (key.ctrl && inputChar === 'e') {
      inputStateRef.current = {
        input: inputStateRef.current.input,
        cursor: inputStateRef.current.input.length
      };
      updateInputState(inputStateRef.current.input, inputStateRef.current.input.length);
      return;
    }

    if (key.ctrl && inputChar === 'u') {
      inputStateRef.current = {
        input: '',
        cursor: 0
      };
      updateInputState('', 0);
      return;
    }

    // Regular character input
    if (inputChar && !key.ctrl && !key.meta && !key.delete && !key.backspace) {
      // Check for pasted content (multiple characters at once)
      if (inputChar.length > 1) {
        const currentInput = inputStateRef.current.input;
        const cursor = inputStateRef.current.cursor;
        const newInput = currentInput.slice(0, cursor) + inputChar + currentInput.slice(cursor);
        inputStateRef.current = {
          input: newInput,
          cursor: cursor + inputChar.length
        };
        updateInputState(inputStateRef.current.input, inputStateRef.current.cursor);
        return;
      }

      // Single character input
      if (inputChar.length === 1) {
        const currentInput = inputStateRef.current.input;
        const cursor = 0 + inputStateRef.current.cursor;
        const newInput = currentInput.slice(0, cursor) + inputChar + currentInput.slice(cursor);
        inputStateRef.current = {
          input: newInput,
          cursor: cursor + 1
        };
        updateInputState(inputStateRef.current.input, inputStateRef.current.cursor);
        return;
      }
    }
  }, { isActive: focus && !disabled });

  return (
    <Box paddingX={1} borderStyle="single" borderLeft={false} borderRight={false}>
      <Text>
        <Text color="cyan" bold>
          &gt;{' '}
        </Text>
        {inputStateRef.current.input.length > 0 || inputStateRef.current.cursor > 0 ? (
          <>
            {inputStateRef.current.input.slice(0, inputStateRef.current.cursor)}
            <Text backgroundColor="white" color="black">
              {inputStateRef.current.input[inputStateRef.current.cursor] || ' '}
            </Text>
            {inputStateRef.current.cursor +1 < inputStateRef.current.input.length && inputStateRef.current.input.slice(inputStateRef.current.cursor + 1)}
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
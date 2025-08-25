import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from 'ink';
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
  placeholder = '',
  onSubmit,
  onChange,
  focus = false,
  disabled = false
}: HybridInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [showCursor, setShowCursor] = useState(true);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const inputRef = useRef<any>(null);
  const terminalRowRef = useRef<number | null>(null);
  const terminalColRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);
  const historyIndexRef = useRef(-1);

  // Load input history on mount
  useEffect(() => {
    loadInputHistory().then(history => {
      setInputHistory(history);
    });
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      setCursorPosition(value.length);
      if (isActiveRef.current) {
        redrawInput();
      }
    }
  }, [value]);

  // Handle focus changes
  useEffect(() => {
    isActiveRef.current = focus && !disabled;
    
    if (isActiveRef.current) {
      captureTerminalPosition();
      setupRawInput();
      startCursorBlink();
    } else {
      cleanupRawInput();
      stopCursorBlink();
    }

    return () => {
      cleanupRawInput();
      stopCursorBlink();
    };
  }, [focus, disabled]);

  const captureTerminalPosition = () => {
    // Get current cursor position in terminal
    // This is a simplified version - in practice you'd need to query terminal
    terminalRowRef.current = process.stdout.rows || 1;
    terminalColRef.current = 1;
  };

  const setupRawInput = () => {
    if (!process.stdin.setRawMode) return;
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', handleRawInput);
  };

  const cleanupRawInput = () => {
    if (!process.stdin.setRawMode) return;
    
    process.stdin.removeListener('data', handleRawInput);
    process.stdin.setRawMode(false);
    process.stdin.pause();
  };

  const handleRawInput = (chunk: Buffer) => {
    if (!isActiveRef.current) return;

    const key = chunk.toString();
    const keyCode = chunk[0];

    // Handle special keys
    if (keyCode === 3) { // Ctrl+C
      process.exit(0);
      return;
    }

    if (keyCode === 13) { // Enter
      const currentInput = internalValue.trim();
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
      setInternalValue('');
      setCursorPosition(0);
      historyIndexRef.current = -1;
      updateTerminalDisplay('', 0);
      return;
    }

    if (keyCode === 127 || keyCode === 8) { // Backspace
      handleBackspace();
      return;
    }

    if (keyCode === 27) { // Escape sequences (arrow keys, etc.)
      handleEscapeSequence(chunk);
      return;
    }

    // Handle Ctrl combinations
    if (keyCode === 1) { // Ctrl+A - move to start
      setCursorPosition(0);
      updateCursorPosition(0);
      return;
    }

    if (keyCode === 5) { // Ctrl+E - move to end
      const newPos = internalValue.length;
      setCursorPosition(newPos);
      updateCursorPosition(newPos);
      return;
    }

    if (keyCode === 21) { // Ctrl+U - clear line
      setInternalValue('');
      setCursorPosition(0);
      updateTerminalDisplay('', 0);
      onChange?.('');
      return;
    }

    // Regular character input
    if (keyCode && keyCode >= 32 && keyCode <= 126) {
      handleCharacterInput(key);
    }
  };

  const handleCharacterInput = (char: string) => {
    const newValue = 
      internalValue.slice(0, cursorPosition) + 
      char + 
      internalValue.slice(cursorPosition);
    
    const newCursorPos = cursorPosition + 1;
    
    // Update immediately via direct terminal write
    updateTerminalDisplay(newValue, newCursorPos);
    
    // Update internal state (will not cause re-render immediately)
    setInternalValue(newValue);
    setCursorPosition(newCursorPos);
    
    // Notify parent of change
    onChange?.(newValue);
  };

  const handleBackspace = () => {
    if (cursorPosition === 0) return;

    const newValue = 
      internalValue.slice(0, cursorPosition - 1) + 
      internalValue.slice(cursorPosition);
    
    const newCursorPos = cursorPosition - 1;
    
    // Update immediately via direct terminal write
    updateTerminalDisplay(newValue, newCursorPos);
    
    // Update internal state
    setInternalValue(newValue);
    setCursorPosition(newCursorPos);
    
    // Notify parent of change
    onChange?.(newValue);
  };

  const handleEscapeSequence = (chunk: Buffer) => {
    if (chunk.length >= 3) {
      const sequence = chunk.toString();
      
      if (sequence === '\x1b[D') { // Left arrow
        const newPos = Math.max(0, cursorPosition - 1);
        setCursorPosition(newPos);
        updateCursorPosition(newPos);
      } else if (sequence === '\x1b[C') { // Right arrow
        const newPos = Math.min(internalValue.length, cursorPosition + 1);
        setCursorPosition(newPos);
        updateCursorPosition(newPos);
      } else if (sequence === '\x1b[A') { // Up arrow - history up
        handleHistoryUp();
      } else if (sequence === '\x1b[B') { // Down arrow - history down
        handleHistoryDown();
      }
    }
  };

  const handleHistoryUp = () => {
    if (inputHistory.length > 0) {
      const newIndex = Math.min(historyIndexRef.current + 1, inputHistory.length - 1);
      const historyText = inputHistory[newIndex];
      debug('history up', newIndex, historyText);
      if (historyText) {
        historyIndexRef.current = newIndex;
        setInternalValue(historyText);
        setCursorPosition(historyText.length);
        updateTerminalDisplay(historyText, historyText.length);
      }
    }
  };

  const handleHistoryDown = () => {
    if (historyIndexRef.current >= 0) {
      const newIndex = historyIndexRef.current - 1;
      if (newIndex < 0) {
        historyIndexRef.current = -1;
        setInternalValue('');
        setCursorPosition(0);
        updateTerminalDisplay('', 0);
      } else {
        const historyText = inputHistory[newIndex];
        debug('history down', newIndex, historyText);
        if (historyText) {
          historyIndexRef.current = newIndex;
          setInternalValue(historyText);
          setCursorPosition(historyText.length);
          updateTerminalDisplay(historyText, historyText.length);
        }
      }
    }
  };

  const updateTerminalDisplay = (text: string, cursorPos: number) => {
    if (!terminalRowRef.current || !terminalColRef.current) return;

    // Move to input line
    process.stdout.write(`\x1b[${terminalRowRef.current};${terminalColRef.current}H`);
    
    // Clear line
    process.stdout.write('\x1b[2K');
    
    // Write text
    const displayText = text || (placeholder && !focus ? placeholder : '');
    process.stdout.write(displayText);
    
    // Position cursor
    const actualCursorCol = terminalColRef.current + cursorPos;
    process.stdout.write(`\x1b[${terminalRowRef.current};${actualCursorCol}H`);
  };

  const updateCursorPosition = (cursorPos: number) => {
    if (!terminalRowRef.current || !terminalColRef.current) return;
    
    const actualCursorCol = terminalColRef.current + cursorPos;
    process.stdout.write(`\x1b[${terminalRowRef.current};${actualCursorCol}H`);
  };

  const redrawInput = () => {
    updateTerminalDisplay(internalValue, cursorPosition);
  };

  const startCursorBlink = () => {
    setShowCursor(true);
    // Set steady block cursor
    process.stdout.write('\x1b[2 q');
  };

  const stopCursorBlink = () => {
    setShowCursor(false);
    // Hide cursor
    process.stdout.write('\x1b[?25l');
  };

  // Fallback render for Ink (used for layout but not actual input display)
  const displayValue = internalValue || (placeholder && !focus ? placeholder : '');
  const cursorChar = focus && showCursor ? '█' : ' ';
  
  return (
    <Box ref={inputRef}>
      <Text color={disabled ? 'gray' : undefined} dimColor={!focus}>
        {displayValue}
        {focus && <Text color="white">{cursorChar}</Text>}
      </Text>
    </Box>
  );
}
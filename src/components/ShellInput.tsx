import { Box, Text, type Key, useInput } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadInputHistory, saveInputHistory } from '../utils/inputHistory';
import { debug } from '../utils/logger';

export type HotKeyMatcher = (inputChar: string, key: Key) => boolean;

export type HotKey = {
  action: () => void;
  matches: HotKeyMatcher;
};

export function hotKey(matches: HotKeyMatcher, action: () => void): HotKey {
  return {
    action,
    matches
  };
}

export default function ShellInput({
  hotKeys,
  onSubmit
}: {
  hotKeys: HotKey[];
  onSubmit: (input: string) => void;
}) {
  const [displayInput, setDisplayInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [hks, setHotKeys] = useState<HotKey[]>([]);
  const [displayCursor, setDisplayCursor] = useState(0);
  // Use refs to avoid re-renders during typing
  const inputRef = useRef('');
  const cursorRef = useRef(0);
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
  
  useEffect(() => {
    const historyUp = {
      action: () => {
        if (inputHistory.length > 0) {
          const newIndex = Math.min(historyIndexRef.current + 1, inputHistory.length - 1);
          const historyText = inputHistory[newIndex];
          debug('history', newIndex, historyText);
          if (historyText) {
            historyIndexRef.current = newIndex;
            inputRef.current = historyText;
            cursorRef.current = historyText.length;
            updateDisplay();
          }
        }
      },
      matches: (inputChar: string, key: Key) => key.upArrow && !key.ctrl && !key.shift
    };

    const historyDown = {
      action: () => {
        // Navigate down in history
        if (historyIndexRef.current >= 0) {
          const newIndex = historyIndexRef.current - 1;
          if (newIndex < 0) {
            historyIndexRef.current = -1;
            inputRef.current = '';
            cursorRef.current = 0;
            setDisplayInput('');
            setDisplayCursor(0);
          } else {
            const historyText = inputHistory[newIndex];
            if (historyText) {
              historyIndexRef.current = newIndex;
              inputRef.current = historyText;
              cursorRef.current = historyText.length;
              setDisplayInput(historyText);
              setDisplayCursor(historyText.length);
            }
          }
        }
      },
      matches: (inputChar: string, key: Key) => key.downArrow && !key.ctrl && !key.shift
    };

    const cursorLeft = {
      action: () => {
        cursorRef.current = Math.max(0, cursorRef.current - 1);
        updateDisplay();
      },
      matches: (inputChar: string, key: Key) => key.leftArrow
    };

    const cursorRight = {
      action: () => {
        cursorRef.current = Math.min(inputRef.current.length, cursorRef.current + 1);
        updateDisplay();
      },
      matches: (inputChar: string, key: Key) => key.rightArrow
    };

    const moveToEnd = hotKey(
      (inputChar: string, key: Key) => key.ctrl && inputChar === 'e',
      () => {
        cursorRef.current = inputRef.current.length;
        updateDisplay();
      }
    );

    const moveToStart = hotKey(
      (inputChar: string, key: Key) => key.ctrl && inputChar === 'a',
      () => {
        cursorRef.current = 0;
        updateDisplay();
      }
    );

    const clearInput = hotKey(
      (inputChar: string, key: Key) => key.ctrl && inputChar === 'u',
      () => {
        inputRef.current = '';
        cursorRef.current = 0;
        updateDisplay();
      }
    );

    setHotKeys([
      historyUp,
      historyDown,
      cursorLeft,
      cursorRight,
      moveToEnd,
      moveToStart,
      clearInput,
      ...hotKeys
    ]);
  }, [hotKeys]);

  useInput((inputChar, key) => {
    // Handle return key
    if (key.return) {
      const currentInput = inputRef.current.trim();
      onSubmit(currentInput);
      inputRef.current = '';
      cursorRef.current = 0;
      setDisplayInput('');
      setDisplayCursor(0);
      setInputHistory(prev => {
        const newHistory = [currentInput, ...prev.filter(h => h !== currentInput)];
        const limitedHistory = newHistory.slice(0,100); // Keep last 100 commands

        // Save to disk asynchronously
        saveInputHistory(limitedHistory);

        return limitedHistory;
      });
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
      }
      return;
    }

    const hotKey = hks.find(hotKey => hotKey.matches(inputChar, key));
    if (hotKey) {
      hotKey.action();
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      // Check for pasted content (multiple characters at once)
      if (inputChar.length > 1) {
        // This might be pasted content
        const currentInput = inputRef.current;
        const cursor = cursorRef.current;
        const newInput = currentInput.slice(0, cursor) + inputChar + currentInput.slice(cursor);
        inputRef.current = newInput;
        cursorRef.current = cursor + inputChar.length;
        updateDisplay();
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
        return;
      }
    }
  });

  return (
    <Box borderStyle="single" paddingX={1}>
      {/* BLAZING FAST input rendering with batched updates */}
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
            <Text dimColor>Type your message...</Text>
          </>
        )}
      </Text>
    </Box>
  );
}

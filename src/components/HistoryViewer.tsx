import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useScreenSize } from 'fullscreen-ink';
import type { Message } from '../types';
import { HistoryMessage } from './HistoryMessage';
import { HistorySearchBar } from './HistorySearchBar';

interface HistoryViewerProps {
  messages: Message[];
  onClose: () => void;
}

const HEADER_LINES = 2;
const FOOTER_LINES = 2;
const LINES_PER_MESSAGE = 4; // approximate: label + content + margin

export function HistoryViewer({ messages, onClose }: HistoryViewerProps) {
  const { height } = useScreenSize();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Calculate visible area
  const viewportMessages = Math.max(1, Math.floor((height - HEADER_LINES - FOOTER_LINES) / LINES_PER_MESSAGE));

  // Search matches
  const matchIndices = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return messages
      .map((msg, i) => (msg.content.toLowerCase().includes(query) ? i : -1))
      .filter(i => i >= 0);
  }, [messages, searchQuery]);

  // Clamp scroll offset
  const maxScroll = Math.max(0, messages.length - viewportMessages);
  const clampedOffset = Math.min(Math.max(0, scrollOffset), maxScroll);

  // Visible slice
  const visibleMessages = messages.slice(clampedOffset, clampedOffset + viewportMessages);

  const scrollTo = useCallback((offset: number) => {
    setScrollOffset(Math.min(Math.max(0, offset), maxScroll));
  }, [maxScroll]);

  const jumpToMatch = useCallback((index: number) => {
    if (matchIndices.length === 0) return;
    const wrappedIndex = ((index % matchIndices.length) + matchIndices.length) % matchIndices.length;
    setCurrentMatchIndex(wrappedIndex);
    const msgIndex = matchIndices[wrappedIndex];
    if (msgIndex !== undefined) {
      scrollTo(msgIndex);
    }
  }, [matchIndices, scrollTo]);

  // Main keyboard handler (non-search mode)
  useInput((inputChar, key) => {
    if (inputChar === 'q' || key.escape) {
      onClose();
    } else if (inputChar === '/') {
      setSearchMode(true);
      setSearchQuery('');
      setCurrentMatchIndex(0);
    } else if (inputChar === 'n') {
      jumpToMatch(currentMatchIndex + 1);
    } else if (inputChar === 'N') {
      jumpToMatch(currentMatchIndex - 1);
    } else if (key.upArrow) {
      scrollTo(clampedOffset - 1);
    } else if (key.downArrow) {
      scrollTo(clampedOffset + 1);
    } else if (key.pageUp) {
      scrollTo(clampedOffset - viewportMessages);
    } else if (key.pageDown) {
      scrollTo(clampedOffset + viewportMessages);
    } else if (key.ctrl && inputChar === 'a') {
      scrollTo(0);
    } else if (key.ctrl && inputChar === 'e') {
      scrollTo(maxScroll);
    }
  }, { isActive: !searchMode });

  if (messages.length === 0) {
    return (
      <Box flexDirection="column" minHeight={height}>
        <Box paddingX={1}>
          <Text bold color="cyan">History Viewer</Text>
        </Box>
        <Box paddingX={1} flexGrow={1}>
          <Text dimColor>No messages in history.</Text>
        </Box>
        <Box paddingX={1}>
          <Text dimColor>Press q to close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={height}>
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color="cyan">History Viewer</Text>
        <Text dimColor>
          {clampedOffset + 1}-{Math.min(clampedOffset + viewportMessages, messages.length)} of {messages.length}
        </Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleMessages.map((msg, i) => (
          <HistoryMessage
            key={msg.id || `hist-${clampedOffset + i}`}
            message={msg}
            index={clampedOffset + i + 1}
            searchQuery={searchQuery}
          />
        ))}
      </Box>

      {/* Footer / Search */}
      {searchMode ? (
        <HistorySearchBar
          query={searchQuery}
          matchCount={matchIndices.length}
          currentMatch={currentMatchIndex}
          onQueryChange={(q) => {
            setSearchQuery(q);
            setCurrentMatchIndex(0);
            // Auto-jump to first match
            if (q) {
              const query = q.toLowerCase();
              const firstMatch = messages.findIndex(m => m.content.toLowerCase().includes(query));
              if (firstMatch >= 0) scrollTo(firstMatch);
            }
          }}
          onSubmit={() => setSearchMode(false)}
          onCancel={() => {
            setSearchMode(false);
            setSearchQuery('');
          }}
        />
      ) : (
        <Box paddingX={1}>
          <Text dimColor>
            ↑↓ scroll  PgUp/PgDn page  ^A/^E jump  / search  n/N next/prev  q quit
          </Text>
        </Box>
      )}
    </Box>
  );
}

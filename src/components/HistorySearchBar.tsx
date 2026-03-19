import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HistorySearchBarProps {
  query: string;
  matchCount: number;
  currentMatch: number;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function HistorySearchBar({
  query,
  matchCount,
  currentMatch,
  onQueryChange,
  onSubmit,
  onCancel,
}: HistorySearchBarProps) {
  useInput((inputChar, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      onSubmit();
    } else if (key.backspace || key.delete) {
      onQueryChange(query.slice(0, -1));
    } else if (inputChar && !key.ctrl && !key.meta) {
      onQueryChange(query + inputChar);
    }
  });

  const matchInfo = query.length > 0
    ? matchCount > 0
      ? `${currentMatch + 1} of ${matchCount}`
      : 'No matches'
    : '';

  return (
    <Box paddingX={1}>
      <Text color="yellow">/ </Text>
      <Text>{query}</Text>
      <Text color="cyan">█</Text>
      {matchInfo && (
        <Text dimColor> ({matchInfo})</Text>
      )}
    </Box>
  );
}

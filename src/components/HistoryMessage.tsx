import React, { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types';
import { getMessageDisplayContent } from '../utils/messageDisplay';
import { formatTimestamp, getRoleColor } from '../utils/historyFormatting';

interface HistoryMessageProps {
  message: Message;
  index: number;
  searchQuery?: string;
}

export const HistoryMessage = memo(function HistoryMessage({
  message,
  index,
  searchQuery: _searchQuery,
}: HistoryMessageProps) {
  const label = message.timestamp
    ? `[${formatTimestamp(message.timestamp)}]`
    : `[#${index}]`;

  const roleColor = getRoleColor(message.role);
  const content = useMemo(
    () => getMessageDisplayContent(message),
    [message]
  );

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text dimColor>{label} </Text>
        <Text color={roleColor} bold>{message.role}</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
});

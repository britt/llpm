import React, { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types';
import { getMessageDisplayContent } from '../utils/messageDisplay';

interface HistoryMessageProps {
  message: Message;
  index: number;
  searchQuery?: string;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getRoleColor(role: Message['role']): string {
  switch (role) {
    case 'user': return 'cyan';
    case 'assistant': return 'green';
    case 'system': return 'yellow';
    default: return 'gray';
  }
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
    [message.role, message.content]
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

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { RequestContext } from '../utils/requestContext';

export interface LogEntry {
  timestamp: string;
  requestId: string;
  step: string;
  phase: 'start' | 'end';
  duration?: number;
  metadata?: Record<string, any>;
}

interface RequestLogDisplayProps {
  isVisible: boolean;
}

export function RequestLogDisplay({ isVisible }: RequestLogDisplayProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  useEffect(() => {
    if (!isVisible) {
      setLogs([]);
      return;
    }
    
    const logger = RequestContext.getLogger();
    if (!logger) return;
    
    const handleLog = (log: LogEntry) => {
      setLogs(prev => {
        const newLogs = [...prev, log];
        // Keep only last 5 logs
        return newLogs.slice(-5);
      });
    };
    
    const handleClear = () => {
      setLogs([]);
    };
    
    logger.on('log', handleLog);
    logger.on('clear', handleClear);
    
    return () => {
      logger.off('log', handleLog);
      logger.off('clear', handleClear);
    };
  }, [isVisible]);
  
  if (!isVisible || logs.length === 0) {
    return null;
  }

  const recentLogs = logs;

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      marginTop: 1,
      paddingLeft: 2,
    },
    recentLogs.map((log, index) =>
      React.createElement(
        Text,
        {
          key: `${log.requestId}-${index}`,
          dimColor: true,
          wrap: 'truncate'
        },
        formatLogEntry(log)
      )
    )
  );
}

function formatLogEntry(log: LogEntry): string {
  const parts = [`→ ${log.step}`];
  
  if (log.phase === 'end' && log.duration !== undefined) {
    parts.push(`(${log.duration}ms)`);
  } else if (log.phase === 'start') {
    parts.push('...');
  }
  
  // Add key metadata
  if (log.metadata) {
    if (log.metadata.model) {
      parts.push(`model: ${log.metadata.model}`);
    }
    if (log.metadata.name) {
      parts.push(`${log.metadata.name}`);
    }
    if (log.metadata.table) {
      parts.push(`table: ${log.metadata.table}`);
    }
    if (log.metadata.path) {
      parts.push(`${log.metadata.path}`);
    }
    if (log.metadata.error) {
      parts.push(`❌ ${log.metadata.error}`);
    }
  }
  
  return parts.join(' ');
}
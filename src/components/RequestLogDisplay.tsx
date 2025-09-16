import React, { useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';

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

// Global singleton to share logger instance
class LoggerRegistry {
  private static instance: LoggerRegistry;
  private currentLogger: any = null;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private clearListeners: Set<() => void> = new Set();

  static getInstance(): LoggerRegistry {
    if (!LoggerRegistry.instance) {
      LoggerRegistry.instance = new LoggerRegistry();
    }
    return LoggerRegistry.instance;
  }

  setLogger(logger: any) {
    // Remove old listeners
    if (this.currentLogger) {
      this.currentLogger.removeAllListeners('log');
      this.currentLogger.removeAllListeners('clear');
    }

    this.currentLogger = logger;
    
    if (logger) {
      // Set up new listeners
      logger.on('log', (log: LogEntry) => {
        this.listeners.forEach(listener => listener(log));
      });
      
      logger.on('clear', () => {
        this.clearListeners.forEach(listener => listener());
      });
    }
  }

  addLogListener(listener: (log: LogEntry) => void) {
    this.listeners.add(listener);
  }

  removeLogListener(listener: (log: LogEntry) => void) {
    this.listeners.delete(listener);
  }

  addClearListener(listener: () => void) {
    this.clearListeners.add(listener);
  }

  removeClearListener(listener: () => void) {
    this.clearListeners.delete(listener);
  }
}

export const loggerRegistry = LoggerRegistry.getInstance();

interface ProcessedLog {
  key: string;
  step: string;
  status: 'running' | 'completed';
  duration?: number;
  metadata?: Record<string, any>;
}

export function RequestLogDisplay({ isVisible }: RequestLogDisplayProps) {
  const [processedLogs, setProcessedLogs] = useState<Map<string, ProcessedLog>>(new Map());
  const logMapRef = useRef<Map<string, ProcessedLog>>(new Map());
  
  useEffect(() => {
    if (!isVisible) {
      setProcessedLogs(new Map());
      logMapRef.current = new Map();
      return;
    }
    
    const handleLog = (log: LogEntry) => {
      const key = `${log.step}_${log.requestId}`;
      
      if (log.phase === 'start') {
        // Add or update with running status
        const newLog: ProcessedLog = {
          key,
          step: log.step,
          status: 'running',
          metadata: log.metadata
        };
        logMapRef.current.set(key, newLog);
      } else if (log.phase === 'end') {
        // Update existing log with completed status and duration
        const existingLog = logMapRef.current.get(key);
        if (existingLog) {
          existingLog.status = 'completed';
          existingLog.duration = log.duration;
          if (log.metadata) {
            existingLog.metadata = { ...existingLog.metadata, ...log.metadata };
          }
        } else {
          // If we don't have a start, create a completed entry
          logMapRef.current.set(key, {
            key,
            step: log.step,
            status: 'completed',
            duration: log.duration,
            metadata: log.metadata
          });
        }
      }
      
      // Keep only last 5 entries
      if (logMapRef.current.size > 5) {
        const keys = Array.from(logMapRef.current.keys());
        const toRemove = keys.slice(0, keys.length - 5);
        toRemove.forEach(k => logMapRef.current.delete(k));
      }
      
      // Update state with new map
      setProcessedLogs(new Map(logMapRef.current));
    };
    
    const handleClear = () => {
      logMapRef.current.clear();
      setProcessedLogs(new Map());
    };
    
    loggerRegistry.addLogListener(handleLog);
    loggerRegistry.addClearListener(handleClear);
    
    return () => {
      loggerRegistry.removeLogListener(handleLog);
      loggerRegistry.removeClearListener(handleClear);
    };
  }, [isVisible]);
  
  if (!isVisible || processedLogs.size === 0) {
    return null;
  }

  const logs = Array.from(processedLogs.values());

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      marginTop: 1,
      paddingLeft: 2,
    },
    logs.map((log) =>
      React.createElement(
        Text,
        {
          key: log.key,
          dimColor: true,
          wrap: 'truncate'
        },
        formatProcessedLog(log)
      )
    )
  );
}

function formatProcessedLog(log: ProcessedLog): string {
  const parts = [`→ ${formatStepName(log.step)}`];
  
  if (log.status === 'completed' && log.duration !== undefined) {
    parts.push(`✓ (${log.duration}ms)`);
  } else if (log.status === 'running') {
    parts.push('⋯');
  }
  
  // Add key metadata
  if (log.metadata) {
    if (log.metadata.model) {
      parts.push(`[${log.metadata.model}]`);
    }
    if (log.metadata.name) {
      parts.push(`[${log.metadata.name}]`);
    }
    if (log.metadata.table) {
      parts.push(`[${log.metadata.table}]`);
    }
    if (log.metadata.path) {
      parts.push(`[${log.metadata.path}]`);
    }
    if (log.metadata.error) {
      parts.push(`❌ ${log.metadata.error}`);
    }
  }
  
  return parts.join(' ');
}

function formatStepName(step: string): string {
  // Make step names more readable
  return step
    .replace(/_/g, ' ')
    .replace(/^(llm|api|db|tool)/, (match) => match.toUpperCase())
    .replace(/call/, '')
    .trim();
}
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
  orderIndex: number; // Track insertion order
}

export function RequestLogDisplay({ isVisible }: RequestLogDisplayProps) {
  const [processedLogs, setProcessedLogs] = useState<Map<string, ProcessedLog>>(new Map());
  const logMapRef = useRef<Map<string, ProcessedLog>>(new Map());
  const orderCounterRef = useRef(0);
  
  useEffect(() => {
    if (!isVisible) {
      setProcessedLogs(new Map());
      logMapRef.current = new Map();
      orderCounterRef.current = 0;
      return;
    }
    
    const handleLog = (log: LogEntry) => {
      // Create a normalized key - use just the step name without request ID
      // since there's typically only one request in flight
      const stepKey = log.step;
      
      if (log.phase === 'start') {
        // Check if this step already exists and is running
        const existing = Array.from(logMapRef.current.values()).find(
          l => l.step === log.step && l.status === 'running'
        );
        
        if (!existing) {
          // Add new running log
          const newLog: ProcessedLog = {
            key: `${stepKey}_${orderCounterRef.current++}`,
            step: log.step,
            status: 'running',
            metadata: log.metadata,
            orderIndex: orderCounterRef.current
          };
          logMapRef.current.set(newLog.key, newLog);
        }
      } else if (log.phase === 'end') {
        // Find the matching running log for this step
        let foundKey: string | null = null;
        for (const [key, value] of logMapRef.current.entries()) {
          if (value.step === log.step && value.status === 'running') {
            foundKey = key;
            break;
          }
        }
        
        if (foundKey) {
          // Update existing log with completed status
          const existingLog = logMapRef.current.get(foundKey)!;
          existingLog.status = 'completed';
          existingLog.duration = log.duration;
          if (log.metadata) {
            existingLog.metadata = { ...existingLog.metadata, ...log.metadata };
          }
        } else {
          // If no matching start found, create a new completed entry
          const newLog: ProcessedLog = {
            key: `${stepKey}_${orderCounterRef.current++}`,
            step: log.step,
            status: 'completed',
            duration: log.duration,
            metadata: log.metadata,
            orderIndex: orderCounterRef.current
          };
          logMapRef.current.set(newLog.key, newLog);
        }
      }
      
      // Keep only last 5 entries
      if (logMapRef.current.size > 5) {
        const entries = Array.from(logMapRef.current.entries())
          .sort((a, b) => a[1].orderIndex - b[1].orderIndex);
        const toRemove = entries.slice(0, entries.length - 5);
        toRemove.forEach(([key]) => logMapRef.current.delete(key));
      }
      
      // Update state with new map
      setProcessedLogs(new Map(logMapRef.current));
    };
    
    const handleClear = () => {
      logMapRef.current.clear();
      setProcessedLogs(new Map());
      orderCounterRef.current = 0;
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

  // Sort logs by insertion order
  const logs = Array.from(processedLogs.values())
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      marginTop: 1,
      paddingLeft: 2,
    },
    logs.map((log) => renderProcessedLog(log))
  );
}

function renderProcessedLog(log: ProcessedLog) {
  const parts = [`→ ${formatStepName(log.step)}`];

  // Add metadata that should appear before status
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
  }

  const mainText = parts.join(' ');

  // Render with status indicator
  if (log.status === 'completed' && log.duration !== undefined) {
    // Completed: show main text in dim, checkmark and timing in green
    return React.createElement(
      Box,
      { key: log.key },
      React.createElement(
        Text,
        { dimColor: true, wrap: 'truncate' },
        mainText + ' '
      ),
      React.createElement(
        Text,
        { color: 'green' },
        `✓ (${log.duration}ms)`
      )
    );
  } else if (log.status === 'running') {
    // Running: show with spinner
    return React.createElement(
      Text,
      { key: log.key, dimColor: true, wrap: 'truncate' },
      mainText + ' ⋯'
    );
  } else if (log.metadata?.error) {
    // Error: show with red X
    return React.createElement(
      Box,
      { key: log.key },
      React.createElement(
        Text,
        { dimColor: true, wrap: 'truncate' },
        mainText + ' '
      ),
      React.createElement(
        Text,
        { color: 'red' },
        `❌ ${log.metadata.error}`
      )
    );
  } else {
    // Default: just show main text
    return React.createElement(
      Text,
      { key: log.key, dimColor: true, wrap: 'truncate' },
      mainText
    );
  }
}

function formatStepName(step: string): string {
  // Make step names more readable
  return step
    .replace(/_/g, ' ')
    .replace(/^(llm|api|db|tool)/, (match) => match.toUpperCase())
    .replace(/call/, '')
    .trim();
}
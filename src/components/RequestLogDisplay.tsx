import { useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import { TaskList, Task } from 'ink-task-list';
import type { RequestLogger } from '../utils/requestLogger';

// Static spinner that doesn't animate
const staticSpinner = {
  interval: 1000,
  frames: ['⋯']
};

export interface LogEntry {
  timestamp: string;
  requestId: string;
  step: string;
  phase: 'start' | 'end';
  duration?: number;
  metadata?: Record<string, unknown>;
}

// Global singleton to share logger instance
class LoggerRegistry {
  private static instance: LoggerRegistry;
  private currentLogger: RequestLogger | null = null;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private clearListeners: Set<() => void> = new Set();

  static getInstance(): LoggerRegistry {
    if (!LoggerRegistry.instance) {
      LoggerRegistry.instance = new LoggerRegistry();
    }
    return LoggerRegistry.instance;
  }

  setLogger(logger: RequestLogger | null) {
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
  status: 'running' | 'completed' | 'placeholder';
  duration?: number;
  metadata?: Record<string, unknown>;
  orderIndex: number; // Track insertion order
}

const MAX_VISIBLE_LOGS = 4;

// Create placeholder entries
function createPlaceholder(index: number): ProcessedLog {
  return {
    key: `placeholder_${index}`,
    step: 'placeholder',
    status: 'placeholder',
    orderIndex: index
  };
}

export function RequestLogDisplay() {
  // Initialize with 4 placeholder entries
  const initialLogs = new Map<string, ProcessedLog>();
  for (let i = 0; i < MAX_VISIBLE_LOGS; i++) {
    const placeholder = createPlaceholder(i);
    initialLogs.set(placeholder.key, placeholder);
  }

  const [processedLogs, setProcessedLogs] = useState<Map<string, ProcessedLog>>(initialLogs);
  const logMapRef = useRef<Map<string, ProcessedLog>>(initialLogs);
  const orderCounterRef = useRef(MAX_VISIBLE_LOGS);

  useEffect(() => {
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

          // Get current entries sorted by order
          const entries = Array.from(logMapRef.current.entries()).sort(
            (a, b) => a[1].orderIndex - b[1].orderIndex
          );

          // If we have a placeholder, replace it
          const placeholderEntry = entries.find(([_, log]) => log.status === 'placeholder');
          if (placeholderEntry) {
            logMapRef.current.delete(placeholderEntry[0]);
          } else if (entries.length >= MAX_VISIBLE_LOGS) {
            // Remove the oldest entry (first in the sorted array)
            logMapRef.current.delete(entries[0]![0]);
          }

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
          const existingLog = logMapRef.current.get(foundKey);
          if (existingLog) {
            existingLog.status = 'completed';
            existingLog.duration = log.duration;
            if (log.metadata) {
              existingLog.metadata = { ...existingLog.metadata, ...log.metadata };
            }
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

          // Get current entries sorted by order
          const entries = Array.from(logMapRef.current.entries()).sort(
            (a, b) => a[1].orderIndex - b[1].orderIndex
          );

          // If we have a placeholder, replace it
          const placeholderEntry = entries.find(([_, log]) => log.status === 'placeholder');
          if (placeholderEntry) {
            logMapRef.current.delete(placeholderEntry[0]);
          } else if (entries.length >= MAX_VISIBLE_LOGS) {
            // Remove the oldest entry (first in the sorted array)
            logMapRef.current.delete(entries[0]![0]);
          }

          logMapRef.current.set(newLog.key, newLog);
        }
      }

      // Update state with new map
      setProcessedLogs(new Map(logMapRef.current));
    };

    const handleClear = () => {
      // Reset to placeholders
      const initialLogs = new Map<string, ProcessedLog>();
      for (let i = 0; i < MAX_VISIBLE_LOGS; i++) {
        const placeholder = createPlaceholder(i);
        initialLogs.set(placeholder.key, placeholder);
      }
      logMapRef.current = initialLogs;
      setProcessedLogs(initialLogs);
      orderCounterRef.current = MAX_VISIBLE_LOGS;
    };

    loggerRegistry.addLogListener(handleLog);
    loggerRegistry.addClearListener(handleClear);

    return () => {
      loggerRegistry.removeLogListener(handleLog);
      loggerRegistry.removeClearListener(handleClear);
    };
  });

  // Sort logs by insertion order
  const logs = Array.from(processedLogs.values()).sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <Box flexDirection="column" marginTop={1} paddingLeft={2} height={MAX_VISIBLE_LOGS}>
      <TaskList>{logs.map(log => renderProcessedLog(log))}</TaskList>
    </Box>
  );
}

function renderProcessedLog(log: ProcessedLog) {
  // Handle placeholder entries
  if (log.status === 'placeholder') {
    return <Task key={log.key} label="..." state="pending" />;
  }

  const parts = [formatStepName(log.step)];

  // Add metadata that should appear in the label
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

  const label = parts.join(' ');

  // Determine state and status based on log data
  if (log.status === 'running') {
    return <Task key={log.key} label={label} state="loading" spinner={staticSpinner} />;
  } else if (log.status === 'completed' && log.duration !== undefined) {
    // Render task with custom timing in green
    return (
      <Box key={log.key}>
        <Task label={label} state="success" />
        <Text color="#00ff00">{` ${log.duration}ms`}</Text>
      </Box>
    );
  } else if (log.metadata?.error) {
    return <Task key={log.key} label={label} state="error" status={String(log.metadata.error)} />;
  } else {
    return <Task key={log.key} label={label} state="pending" />;
  }
}

function formatStepName(step: string): string {
  // Make step names more readable
  return step
    .replace(/_/g, ' ')
    .replace(/^(llm|api|db|tool)/, match => match.toUpperCase())
    .replace(/call/, '')
    .trim();
}

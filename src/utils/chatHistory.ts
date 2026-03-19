import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Message } from '../types';
import { getConfigDir, ensureConfigDir } from './config';
import { getCurrentProject } from './projectConfig';
import { DEFAULT_HISTORY_SIZE } from '../constants';
import { RequestContext } from './requestContext';
import { traced } from './tracing';
import { SpanKind } from '@opentelemetry/api';

// Use a delimiter that's unlikely to appear in message content
const MESSAGE_DELIMITER = '\n---MESSAGE---\n';

export function MessageToLogString(message: Message): string {
  // Escape newlines in content to preserve message structure
  const escapedContent = message.content.replace(/\n/g, '\\n');
  const ts = message.timestamp != null ? String(message.timestamp) : '';
  return `${message.role}|${ts}: ${escapedContent}`;
}

export function LogStringToMessage(logString: string): Message {
  // New format: role|timestamp: content
  // Legacy format: role: content
  const pipeIndex = logString.indexOf('|');
  const colonIndex = logString.indexOf(': ');

  if (colonIndex === -1) {
    // Fallback: treat entire string as content with 'user' role
    return { role: 'user', content: logString.replace(/\\n/g, '\n') };
  }

  let role: string;
  let timestamp: number | undefined;

  if (pipeIndex !== -1 && pipeIndex < colonIndex) {
    // New format: role|timestamp: content
    role = logString.slice(0, pipeIndex);
    const tsStr = logString.slice(pipeIndex + 1, colonIndex);
    timestamp = tsStr ? Number(tsStr) : undefined;
  } else {
    // Legacy format: role: content
    role = logString.slice(0, colonIndex);
  }

  const content = logString.slice(colonIndex + 2).replace(/\\n/g, '\n');

  const msg: Message = {
    role: role as Message['role'],
    content,
  };
  if (timestamp != null && !isNaN(timestamp)) {
    msg.timestamp = timestamp;
  }
  return msg;
}

async function getChatHistoryPath(): Promise<string> {
  const currentProject = await getCurrentProject();
  const configDir = getConfigDir();

  if (currentProject) {
    // Use project-specific chat history
    const projectDir = join(configDir, 'projects', currentProject.id);
    return join(projectDir, 'chat-history.log');
  } else {
    // Use global chat history when no project is selected
    return join(configDir, 'global-chat-history.log');
  }
}

async function ensureProjectDir(projectId: string): Promise<void> {
  const projectDir = join(getConfigDir(), 'projects', projectId);
  if (!existsSync(projectDir)) {
    await mkdir(projectDir, { recursive: true });
  }
}

// Track pending save operations to ensure they complete before exit
let pendingSave: Promise<void> | null = null;

/**
 * Wait for any pending save operations to complete
 * Should be called before process exit to ensure chat history is saved
 */
export async function flushChatHistory(): Promise<void> {
  if (pendingSave) {
    await pendingSave;
  }
}

export async function loadChatHistory(): Promise<Message[]> {
  RequestContext.logStep('chat_history_load', 'start', 'debug');

  return traced('fs.loadChatHistory', {
    attributes: {},
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    try {
      await ensureConfigDir();

      // Check if we have a current project and ensure its directory exists
      const currentProject = await getCurrentProject();
      if (currentProject) {
        await ensureProjectDir(currentProject.id);
        span.setAttribute('project.id', currentProject.id);
      }
      const historyPath = await getChatHistoryPath();
      span.setAttribute('file.path', historyPath);

      if (!existsSync(historyPath)) {
        span.setAttribute('file.exists', false);
        RequestContext.logStep('chat_history_load', 'end', 'debug', {
          messageCount: 0,
          historyPath,
          fileExists: false
        });
        return [];
      }

      span.setAttribute('file.exists', true);
      const data = await readFile(historyPath, 'utf-8');
      const fileSizeKB = Math.round(Buffer.byteLength(data, 'utf-8') / 1024);
      span.setAttribute('file.size_kb', fileSizeKB);

      // Split by delimiter instead of newlines
      const history: Message[] = data
        .split(MESSAGE_DELIMITER)
        .filter(line => line.trim()) // Remove empty lines
        .map(LogStringToMessage);

      // If no current session, get the most recent one
      if (history.length > 0) {
        const slicedHistory = history.slice(-1*DEFAULT_HISTORY_SIZE);

        span.setAttribute('messages.total', history.length);
        span.setAttribute('messages.loaded', slicedHistory.length);
        span.setAttribute('messages.truncated', history.length > DEFAULT_HISTORY_SIZE);

        RequestContext.logStep('chat_history_load', 'end', 'debug', {
          totalMessages: history.length,
          loadedMessages: slicedHistory.length,
          historyPath,
          fileSizeKB,
          truncated: history.length > DEFAULT_HISTORY_SIZE
        });

        return slicedHistory;
      }

      span.setAttribute('messages.total', 0);
      RequestContext.logStep('chat_history_load', 'end', 'debug', {
        messageCount: 0,
        historyPath,
        fileSizeKB
      });

      return [];
    } catch (error) {
      RequestContext.logError('chat_history_load', error instanceof Error ? error : String(error));
      throw error; // Re-throw for traced() to record
    }
  });
}

export async function saveChatHistory(messages: Message[]): Promise<void> {
  // Wait for any pending save to complete before starting a new one
  // This prevents concurrent writes that could corrupt the file
  if (pendingSave) {
    await pendingSave;
  }

  RequestContext.logStep('chat_history_save', 'start', 'debug', {
    messageCount: messages.length
  });

  // Track this save operation so it can be awaited before exit
  const saveOperation = traced('fs.saveChatHistory', {
    attributes: {
      'messages.count': messages.length
    },
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    try {
      await ensureConfigDir();

      // Check if we have a current project and ensure its directory exists
      const currentProject = await getCurrentProject();
      if (currentProject) {
        await ensureProjectDir(currentProject.id);
        span.setAttribute('project.id', currentProject.id);
      }

      const historyPath = await getChatHistoryPath();
      span.setAttribute('file.path', historyPath);

      if (messages.length === 0) {
        // Clear the history file for empty messages array
        await writeFile(historyPath, '', 'utf-8');
        span.setAttribute('action', 'clear');
        RequestContext.logStep('chat_history_save', 'end', 'debug', {
          messageCount: 0,
          historyPath,
          action: 'clear'
        });
        return;
      }

      // Limit messages to prevent excessive file sizes
      const messagesToSave = messages.slice(-1 * DEFAULT_HISTORY_SIZE);

      span.setAttribute('messages.saved', messagesToSave.length);
      span.setAttribute('messages.truncated', messages.length > DEFAULT_HISTORY_SIZE);

      // Join messages with delimiter to preserve structure
      const content = messagesToSave.map(MessageToLogString).join(MESSAGE_DELIMITER);
      const fileSizeKB = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);
      span.setAttribute('file.size_kb', fileSizeKB);

      await writeFile(historyPath, content + MESSAGE_DELIMITER, 'utf-8');

      RequestContext.logStep('chat_history_save', 'end', 'debug', {
        totalMessages: messages.length,
        savedMessages: messagesToSave.length,
        historyPath,
        fileSizeKB,
        truncated: messages.length > DEFAULT_HISTORY_SIZE
      });
    } catch (error) {
      RequestContext.logError('chat_history_save', error instanceof Error ? error : String(error));
      throw error; // Re-throw for traced() to record
    }
  });

  // Track the pending save operation
  pendingSave = saveOperation;

  // Clear the pending save when it completes
  try {
    await saveOperation;
  } finally {
    pendingSave = null;
  }
}

export async function clearChatHistory(): Promise<void> {
  RequestContext.logStep('chat_history_clear', 'start', 'debug');

  try {
    await ensureConfigDir();

    // Check if we have a current project and ensure its directory exists
    const currentProject = await getCurrentProject();
    if (currentProject) {
      await ensureProjectDir(currentProject.id);
    }

    const historyPath = await getChatHistoryPath();
    await writeFile(historyPath, '', 'utf-8');

    RequestContext.logStep('chat_history_clear', 'end', 'debug', {
      historyPath
    });
  } catch (error) {
    RequestContext.logError('chat_history_clear', error instanceof Error ? error : String(error));
    throw error;
  }
}

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Message } from '../types';
import { getConfigDir, ensureConfigDir } from './config';
import { getCurrentProject } from './projectConfig';
import { debug } from './logger';
import { DEFAULT_HISTORY_SIZE } from '../constants';
import { RequestContext } from './requestContext';

// Use a delimiter that's unlikely to appear in message content
const MESSAGE_DELIMITER = '\n---MESSAGE---\n';

export function MessageToLogString(message: Message): string {
  // Escape newlines in content to preserve message structure
  const escapedContent = message.content.replace(/\n/g, '\\n');
  return `${message.role}: ${escapedContent}`;
}

export function LogStringToMessage(logString: string): Message {
  const [role, ...contentParts] = logString.split(': ');
  const content = contentParts.join(': '); // Rejoin in case content had colons
  // Unescape newlines in content
  const unescapedContent = content.replace(/\\n/g, '\n');
  return { role: role as Message['role'], content: unescapedContent };
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
    debug('Created project directory:', projectDir);
  }
}

export async function loadChatHistory(): Promise<Message[]> {
  debug('Loading chat history from disk');
  RequestContext.logStep('chat_history_load', 'start', 'debug');

  try {
    await ensureConfigDir();

    // Check if we have a current project and ensure its directory exists
    const currentProject = await getCurrentProject();
    if (currentProject) {
      await ensureProjectDir(currentProject.id);
    }
    const historyPath = await getChatHistoryPath();

    if (!existsSync(historyPath)) {
      debug('No chat history file found, starting with empty history');
      RequestContext.logStep('chat_history_load', 'end', 'debug', {
        messageCount: 0,
        historyPath,
        fileExists: false
      });
      return [];
    }

    const data = await readFile(historyPath, 'utf-8');
    const fileSizeKB = Math.round(Buffer.byteLength(data, 'utf-8') / 1024);

    // Split by delimiter instead of newlines
    const history: Message[] = data
      .split(MESSAGE_DELIMITER)
      .filter(line => line.trim()) // Remove empty lines
      .map(LogStringToMessage);

    // If no current session, get the most recent one
    if (history.length > 0) {
      debug('Loaded', history.length, 'messages from history');
      const slicedHistory = history.slice(-1*DEFAULT_HISTORY_SIZE);

      RequestContext.logStep('chat_history_load', 'end', 'debug', {
        totalMessages: history.length,
        loadedMessages: slicedHistory.length,
        historyPath,
        fileSizeKB,
        truncated: history.length > DEFAULT_HISTORY_SIZE
      });

      return slicedHistory;
    }

    RequestContext.logStep('chat_history_load', 'end', 'debug', {
      messageCount: 0,
      historyPath,
      fileSizeKB
    });

    return [];
  } catch (error) {
    debug('Error loading chat history:', error);
    RequestContext.logError('chat_history_load', error instanceof Error ? error : String(error));
    return [];
  }
}

export async function saveChatHistory(messages: Message[]): Promise<void> {
  debug('Saving chat history with', messages.length, 'messages');
  RequestContext.logStep('chat_history_save', 'start', 'debug', {
    messageCount: messages.length
  });

  try {
    await ensureConfigDir();

    // Check if we have a current project and ensure its directory exists
    const currentProject = await getCurrentProject();
    if (currentProject) {
      await ensureProjectDir(currentProject.id);
    }

    const historyPath = await getChatHistoryPath();

    if (messages.length === 0) {
      // Clear the history file for empty messages array
      debug('Clearing chat history file');
      await writeFile(historyPath, '', 'utf-8');
      RequestContext.logStep('chat_history_save', 'end', 'debug', {
        messageCount: 0,
        historyPath,
        action: 'clear'
      });
      return;
    }

    // Limit messages to prevent excessive file sizes
    const messagesToSave = messages.slice(-1 * DEFAULT_HISTORY_SIZE);
    debug('Saving', messagesToSave.length, 'messages (limited from', messages.length, ')');

    // Join messages with delimiter to preserve structure
    const content = messagesToSave.map(MessageToLogString).join(MESSAGE_DELIMITER);
    const fileSizeKB = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);

    await writeFile(historyPath, content + MESSAGE_DELIMITER, 'utf-8');
    debug('Chat history saved successfully to:', historyPath);

    RequestContext.logStep('chat_history_save', 'end', 'debug', {
      totalMessages: messages.length,
      savedMessages: messagesToSave.length,
      historyPath,
      fileSizeKB,
      truncated: messages.length > DEFAULT_HISTORY_SIZE
    });
  } catch (error) {
    debug('Error saving chat history:', error);
    RequestContext.logError('chat_history_save', error instanceof Error ? error : String(error));
  }
}

export async function clearChatHistory(): Promise<void> {
  debug('Clearing chat history');
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
    debug('Chat history cleared successfully');

    RequestContext.logStep('chat_history_clear', 'end', 'debug', {
      historyPath
    });
  } catch (error) {
    debug('Error clearing chat history:', error);
    RequestContext.logError('chat_history_clear', error instanceof Error ? error : String(error));
    throw error;
  }
}

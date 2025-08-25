import { readFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Message } from '../types';
import { getConfigDir, ensureConfigDir } from './config';
import { getCurrentProject } from './projectConfig';
import { debug } from './logger';

function MessageToLogString(message: Message): string {
  return `${message.role}: ${message.content}`;
}

function LogStringToMessage(logString: string): Message   {
  const [role, content] = logString.split(': ');
  return { role: role as Message['role'], content: content || '' };
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
    const { mkdir } = require('fs/promises');
    await mkdir(projectDir, { recursive: true });
    debug('Created project directory:', projectDir);
  }
}

export async function loadChatHistory(): Promise<Message[]> {
  debug('Loading chat history from disk');
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
      return [];
    }

    const data = await readFile(historyPath, 'utf-8');
    const history: Message[] = data.split('\n').map(LogStringToMessage);

    // If no current session, get the most recent one
    if (history.length > 0) {
      debug('Loaded', history.length, 'messages from history');
      return history.slice(-50);
    }

    return [];
  } catch (error) {
    debug('Error loading chat history:', error);
    return [];
  }
}

// TODO: new line escaping
export async function saveChatHistory(messages: Message[]): Promise<void> {
  debug('Saving chat history with', messages.length, 'messages');

  try {
    await ensureConfigDir();

    // Check if we have a current project and ensure its directory exists
    const currentProject = await getCurrentProject();
    if (currentProject) {
      await ensureProjectDir(currentProject.id);
    }

    const historyPath = await getChatHistoryPath();

    await appendFile(historyPath, messages.map(MessageToLogString).join('\n'), 'utf-8');
  } catch (error) {
    debug('Error saving chat history:', error);
  }
}

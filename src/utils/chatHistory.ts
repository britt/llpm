import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { Message } from '../types';
import { getChatHistoryPath, ensureConfigDir } from './config';
import { debug } from './logger';

interface ChatSession {
  id: string;
  timestamp: string;
  messages: Message[];
}

interface ChatHistoryData {
  sessions: ChatSession[];
  currentSessionId?: string;
}

export async function loadChatHistory(): Promise<Message[]> {
  debug('Loading chat history from disk');
  
  try {
    await ensureConfigDir();
    const historyPath = getChatHistoryPath();
    
    if (!existsSync(historyPath)) {
      debug('No chat history file found, starting with empty history');
      return [];
    }
    
    const data = await readFile(historyPath, 'utf-8');
    const history: ChatHistoryData = JSON.parse(data);
    
    if (history.currentSessionId && history.sessions.length > 0) {
      const currentSession = history.sessions.find(s => s.id === history.currentSessionId);
      if (currentSession) {
        debug('Loaded', currentSession.messages.length, 'messages from current session');
        return currentSession.messages;
      }
    }
    
    // If no current session, get the most recent one
    if (history.sessions.length > 0) {
      const latestSession = history.sessions[history.sessions.length - 1];
      debug('Loaded', latestSession.messages.length, 'messages from latest session');
      return latestSession.messages;
    }
    
    debug('No sessions found in history');
    return [];
  } catch (error) {
    debug('Error loading chat history:', error);
    return [];
  }
}

export async function saveChatHistory(messages: Message[]): Promise<void> {
  debug('Saving chat history with', messages.length, 'messages');
  
  try {
    await ensureConfigDir();
    const historyPath = getChatHistoryPath();
    
    // Load existing history
    let history: ChatHistoryData = { sessions: [] };
    
    if (existsSync(historyPath)) {
      try {
        const data = await readFile(historyPath, 'utf-8');
        history = JSON.parse(data);
      } catch (error) {
        debug('Error reading existing history, creating new:', error);
        history = { sessions: [] };
      }
    }
    
    // Create or update current session
    const now = new Date().toISOString();
    const sessionId = history.currentSessionId || `session-${Date.now()}`;
    
    const existingSessionIndex = history.sessions.findIndex(s => s.id === sessionId);
    
    if (existingSessionIndex >= 0) {
      // Update existing session
      history.sessions[existingSessionIndex] = {
        id: sessionId,
        timestamp: now,
        messages
      };
    } else {
      // Create new session
      history.sessions.push({
        id: sessionId,
        timestamp: now,
        messages
      });
    }
    
    history.currentSessionId = sessionId;
    
    // Keep only last 10 sessions to prevent unlimited growth
    if (history.sessions.length > 10) {
      history.sessions = history.sessions.slice(-10);
    }
    
    await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
    debug('Chat history saved successfully');
  } catch (error) {
    debug('Error saving chat history:', error);
  }
}

export async function createNewSession(): Promise<void> {
  debug('Creating new chat session');
  
  try {
    await ensureConfigDir();
    const historyPath = getChatHistoryPath();
    
    let history: ChatHistoryData = { sessions: [] };
    
    if (existsSync(historyPath)) {
      try {
        const data = await readFile(historyPath, 'utf-8');
        history = JSON.parse(data);
      } catch (error) {
        debug('Error reading existing history:', error);
      }
    }
    
    // Set new session ID
    history.currentSessionId = `session-${Date.now()}`;
    
    await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
    debug('New session created:', history.currentSessionId);
  } catch (error) {
    debug('Error creating new session:', error);
  }
}
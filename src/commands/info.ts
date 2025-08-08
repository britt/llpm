import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

const packageInfo = {
  name: 'Claude PM',
  version: '1.0.0',
  description: 'AI-powered CLI project manager similar to Claude Code'
};

export const infoCommand: Command = {
  name: 'info',
  description: 'Show information about the application',
  execute: (): CommandResult => {
    debug('Executing /info command');
    
    const modelInfo = 'OpenAI GPT-4o-mini';
    const runtimeInfo = `Bun ${process.versions.bun || 'unknown'}`;
    const nodeInfo = `Node.js ${process.version}`;
    
    const info = [
      `📱 ${packageInfo.name} v${packageInfo.version}`,
      `📝 ${packageInfo.description}`,
      '',
      `🤖 Model: ${modelInfo}`,
      `⚡ Runtime: ${runtimeInfo}`,
      `🟢 Node: ${nodeInfo}`,
      '',
      `💡 Type /help for available commands`
    ].join('\n');

    debug('Info command result:', info);
    
    return {
      content: info,
      success: true
    };
  }
};
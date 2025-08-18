import type { Command, CommandResult } from './types';
import { getRecentDebugLogs, debug } from '../utils/logger';

export const debugCommand: Command = {
  name: 'debug',
  description: 'Show the last N debug log lines (default: 10)',
  execute: (args: string[]): CommandResult => {
    debug('Executing /debug command with args:', args);

    const count = args.length > 0 && args[0] ? parseInt(args[0], 10) : 10;
    
    if (isNaN(count) || count <= 0) {
      return {
        content: `❌ Invalid number: ${args[0] || 'undefined'}. Please provide a positive integer.`,
        success: false
      };
    }

    const logs = getRecentDebugLogs(count);
    
    if (logs.length === 0) {
      return {
        content: '📝 No debug logs available yet.',
        success: true
      };
    }

    const debugOutput = [
      `🐛 Last ${logs.length} debug log${logs.length === 1 ? '' : 's'}:`,
      '',
      ...logs.map(log => `[${log.timestamp}] ${log.message}`)
    ].join('\n');

    debug('Debug command showing', logs.length, 'log entries');

    return {
      content: debugOutput,
      success: true
    };
  }
};
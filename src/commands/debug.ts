import type { Command, CommandResult } from './types';
import { getRecentDebugLogs, debug } from '../utils/logger';

// Maximum number of debug logs that can be requested (matches logger's MAX_DEBUG_LOGS)
const MAX_LIMIT = 1000;

export const debugCommand: Command = {
  name: 'debug',
  description: 'Show the last N debug log lines (default: 10, max: 1000)',
  execute: (args: string[]): CommandResult => {
    debug('Executing /debug command with args:', args);

    // Handle help subcommand
    if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
      return {
        content: `🐛 Debug Command:

/debug [count] - Show the last N debug log lines (default: 10, max: ${MAX_LIMIT})
/debug help - Show this help message

📝 Examples:
• /debug - Show last 10 debug logs
• /debug 25 - Show last 25 debug logs
• /debug 1000 - Show maximum number of debug logs

💡 Debug logs include internal application operations and can help troubleshoot issues.
💡 The system stores up to ${MAX_LIMIT} debug logs in memory.`,
        success: true
      };
    }

    const count = args.length > 0 && args[0] ? parseInt(args[0], 10) : 10;

    if (isNaN(count) || count <= 0) {
      return {
        content: `❌ Invalid number: ${args[0] || 'undefined'}. Please provide a positive integer.`,
        success: false
      };
    }

    if (count > MAX_LIMIT) {
      return {
        content: `❌ Count exceeds maximum limit of ${MAX_LIMIT}. Please request ${MAX_LIMIT} or fewer logs.`,
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

    // Colorize log entries with timestamp in gray and message in white
    const colorizedLogs = logs.map(log => {
      const timestamp = log.timestamp;
      const time = timestamp.split('T')[1]?.split('.')[0] || timestamp; // Extract time part
      return `\x1b[90m[${time}]\x1b[0m \x1b[37m${log.message}\x1b[0m`;
    });

    const debugOutput = [
      `🐛 Last ${logs.length} debug log${logs.length === 1 ? '' : 's'}:`,
      '',
      ...colorizedLogs
    ].join('\n');

    debug('Debug command showing', logs.length, 'log entries');

    return {
      content: debugOutput,
      success: true
    };
  }
};

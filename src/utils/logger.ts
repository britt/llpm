let isVerbose = false;

interface DebugLogEntry {
  timestamp: string;
  message: string;
}

const debugLogs: DebugLogEntry[] = [];
const MAX_DEBUG_LOGS = 1000;
const MAX_MESSAGE_LENGTH = 500; // Maximum length for a single debug message

export function setVerbose(verbose: boolean) {
  isVerbose = verbose;
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

export function debug(...args: any[]) {
  const timestamp = new Date().toISOString();

  // Convert args to strings, truncating large objects
  const parts = args.map(arg => {
    if (typeof arg === 'object') {
      const json = JSON.stringify(arg);
      return truncateString(json, MAX_MESSAGE_LENGTH);
    }
    return truncateString(String(arg), MAX_MESSAGE_LENGTH);
  });

  const message = parts.join(' ');

  // Store in memory buffer
  debugLogs.push({ timestamp, message });

  // Keep only the last MAX_DEBUG_LOGS entries
  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.shift();
  }

  if (isVerbose) {
    console.error('[DEBUG]', timestamp, ...args);
  }
}

export function getVerbose(): boolean {
  return isVerbose;
}

export function getRecentDebugLogs(count: number = 10): DebugLogEntry[] {
  return debugLogs.slice(-count);
}

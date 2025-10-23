let isVerbose = false;

interface DebugLogEntry {
  timestamp: string;
  message: string;
}

const debugLogs: DebugLogEntry[] = [];
const MAX_DEBUG_LOGS = 1000;

export function setVerbose(verbose: boolean) {
  isVerbose = verbose;
}

export function debug(...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

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

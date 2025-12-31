/**
 * Configuration for shell tool execution
 */
export interface ShellConfig {
  /** Whether shell execution is enabled for this project */
  enabled: boolean;
  /** Commands or prefixes that are allowed (empty = all allowed) */
  allowedCommands?: string[];
  /** Commands or prefixes that are explicitly denied */
  deniedCommands?: string[];
  /** Default timeout in milliseconds (default: 30000) */
  defaultTimeout: number;
  /** Maximum allowed timeout in milliseconds (default: 300000) */
  maxTimeout: number;
  /** Paths where commands can be executed (empty = project path only) */
  allowedPaths?: string[];
  /** Whether to log all command executions for audit */
  auditEnabled: boolean;
}

/**
 * Result from a shell command execution
 */
export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  cwd: string;
  durationMs: number;
  timedOut?: boolean;
  error?: string;
}

/**
 * Audit log entry for shell command execution
 */
export interface ShellAuditEntry {
  timestamp: string;
  command: string;
  cwd: string;
  exitCode: number;
  durationMs: number;
  userId?: string;
  projectId?: string;
  timedOut?: boolean;
  error?: string;
}

/**
 * Default shell configuration (shell disabled by default)
 */
export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  enabled: false,
  allowedCommands: [],
  deniedCommands: ['rm -rf /', 'sudo', 'su ', ':(){ :|:& };:'],
  defaultTimeout: 30000,
  maxTimeout: 300000,
  allowedPaths: [],
  auditEnabled: true
};

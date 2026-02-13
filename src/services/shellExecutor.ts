import { exec } from 'child_process';
import type { ShellConfig, ShellResult } from '../types/shell';
import { validateShellExecution } from '../utils/shellPermissions';

export interface ExecuteOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export class ShellExecutor {
  private config: ShellConfig;
  private projectPath: string;

  constructor(config: ShellConfig, projectPath: string) {
    this.config = config;
    this.projectPath = projectPath;
  }

  async execute(command: string, options: ExecuteOptions = {}): Promise<ShellResult> {
    const cwd = options.cwd || this.projectPath;
    const timeout = Math.min(
      options.timeout || this.config.defaultTimeout,
      this.config.maxTimeout
    );
    const startTime = Date.now();

    // Validate execution is allowed
    const validation = validateShellExecution(command, cwd, this.projectPath, this.config);
    if (!validation.allowed) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        command,
        cwd,
        durationMs: Date.now() - startTime,
        error: validation.reason
      };
    }

    try {
      // Filter out undefined values from process.env
      const envVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          envVars[key] = value;
        }
      }

      const result = await new Promise<ShellResult>((resolve) => {
        exec(command, {
          cwd,
          env: { ...envVars, ...options.env },
          timeout,
          maxBuffer: 10 * 1024 * 1024 // 10MB
        }, (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const exitCode = error
            ? ((error as NodeJS.ErrnoException).code !== undefined && typeof (error as NodeJS.ErrnoException).code === 'number'
              ? (error as unknown as { code: number }).code
              : 1)
            : 0;

          // Detect timeout via killed flag
          const killed = error && (error as unknown as { killed?: boolean }).killed;

          resolve({
            success: exitCode === 0,
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode,
            command,
            cwd,
            durationMs,
            ...(killed ? { timedOut: true, error: `Command timed out after ${timeout}ms` } : {})
          });
        });
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        command,
        cwd,
        durationMs,
        error: errorMessage
      };
    }
  }
}

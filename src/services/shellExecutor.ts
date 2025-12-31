import { $ } from 'bun';
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
      // Use Promise.race for timeout handling
      const executeCommand = async () => {
        const result = await $`${{ raw: command }}`
          .cwd(cwd)
          .env({ ...process.env, ...options.env })
          .quiet()
          .nothrow();

        return {
          success: result.exitCode === 0,
          stdout: result.stdout.toString(),
          stderr: result.stderr.toString(),
          exitCode: result.exitCode,
          command,
          cwd,
          durationMs: Date.now() - startTime
        };
      };

      const timeoutPromise = new Promise<ShellResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            command,
            cwd,
            durationMs: Date.now() - startTime,
            timedOut: true,
            error: `Command timed out after ${timeout}ms`
          });
        }, timeout);
      });

      return await Promise.race([executeCommand(), timeoutPromise]);
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

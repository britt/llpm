import { tool } from './instrumentedTool';
import { z } from 'zod';
import { getCurrentProject } from '../utils/projectConfig';
import { ShellExecutor } from '../services/shellExecutor';
import { initShellAuditLogger } from '../utils/shellAudit';
import { getConfigDir } from '../utils/config';
import { DEFAULT_SHELL_CONFIG, type ShellConfig, type ShellResult, type ShellAuditEntry } from '../types/shell';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Load shell config from global config directory (~/.llpm/shell.json)
 */
async function getShellConfig(): Promise<ShellConfig> {
  const configPath = join(getConfigDir(), 'shell.json');

  if (!existsSync(configPath)) {
    return DEFAULT_SHELL_CONFIG;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    // Merge with defaults to ensure all required fields are present
    return { ...DEFAULT_SHELL_CONFIG, ...config };
  } catch (error) {
    return DEFAULT_SHELL_CONFIG;
  }
}

export const runShellCommandTool = tool({
  description: 'Execute a shell command in the current project directory. Returns structured output with stdout, stderr, and exit code. Shell must be enabled in global settings (~/.llpm/shell.json).',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    cwd: z.string().optional().describe('Working directory (defaults to project root)'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000, max: 300000)')
  }),
  execute: async ({ command, cwd, timeout }): Promise<ShellResult> => {
    // Get current project
    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        command,
        cwd: cwd || '',
        durationMs: 0,
        error: 'No active project. Use /project switch to set a project first.'
      };
    }

    // Load shell config from global config
    const config = await getShellConfig();

    // Create executor
    const executor = new ShellExecutor(config, project.path);

    // Execute command
    const result = await executor.execute(command, {
      cwd: cwd || project.path,
      timeout
    });

    // Log to audit if enabled
    if (config.auditEnabled) {
      try {
        const auditDir = join(getConfigDir(), 'audit');
        const auditLogger = initShellAuditLogger(auditDir);

        const auditEntry: ShellAuditEntry = {
          timestamp: new Date().toISOString(),
          command,
          cwd: result.cwd,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          projectId: project.id,
          timedOut: result.timedOut,
          error: result.error
        };

        await auditLogger.log(auditEntry);
      } catch (error) {
        // Don't fail if audit logging fails
      }
    }

    return result;
  }
});

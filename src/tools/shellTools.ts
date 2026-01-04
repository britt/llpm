/**
 * Shell Execution Tools
 *
 * These tools are exposed to the LLM for executing shell commands.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 *
 * The confirmation message template at line ~81-91 is also a @prompt
 * that is shown to the user before command execution.
 */
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
 * Load shell config from global config.json (~/.llpm/config.json)
 */
async function getShellConfig(): Promise<ShellConfig> {
  const configPath = join(getConfigDir(), 'config.json');

  if (!existsSync(configPath)) {
    return DEFAULT_SHELL_CONFIG;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    // Shell config is nested under "shell" key in config.json
    if (config.shell) {
      return { ...DEFAULT_SHELL_CONFIG, ...config.shell };
    }
    return DEFAULT_SHELL_CONFIG;
  } catch {
    return DEFAULT_SHELL_CONFIG;
  }
}

export interface ShellToolResult extends ShellResult {
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  /** Message shown when command is executed (for skipConfirmation mode) */
  executionNotice?: string;
}

/**
 * @prompt Tool: run_shell_command
 * Description and parameter descriptions sent to LLM explaining tool usage.
 * The confirmationMessage template (lines ~91-101) is also a @prompt shown to users.
 */
export const runShellCommandTool = tool({
  description: 'Execute a shell command in the current project directory. Returns structured output with stdout, stderr, and exit code. Shell must be enabled in global settings (~/.llpm/config.json). IMPORTANT: You must first call this tool WITHOUT the confirmed parameter to show the user what command will run. Only after the user explicitly approves should you call again WITH confirmed=true.',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    cwd: z.string().optional().describe('Working directory (defaults to project root)'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000, max: 300000)'),
    confirmed: z.boolean().optional().describe('Set to true ONLY after user has explicitly approved the command. First call without this to show confirmation prompt.')
  }),
  execute: async ({ command, cwd, timeout, confirmed }): Promise<ShellToolResult> => {
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
    const workingDir = cwd || project.path;

    // Require explicit confirmation before executing (unless skipConfirmation is enabled)
    if (!confirmed && !config.skipConfirmation) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        command,
        cwd: workingDir,
        durationMs: 0,
        requiresConfirmation: true,
        confirmationMessage: `**Shell Command Confirmation Required**

I want to run the following command:

\`\`\`
${command}
\`\`\`

**Working directory:** ${workingDir}

Please confirm you want me to execute this command. Reply with "yes" or "approved" to proceed, or "no" to cancel.`
      };
    }

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
      } catch {
        // Don't fail if audit logging fails
      }
    }

    // Add execution notice so user can see what command was run
    const executionNotice = `**Executing shell command:**

\`\`\`
${command}
\`\`\`

**Working directory:** ${workingDir}`;

    return {
      ...result,
      executionNotice
    };
  }
});

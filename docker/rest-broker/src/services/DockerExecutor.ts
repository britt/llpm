import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface DockerExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface AgentJobPayload {
  prompt: string;
  context?: {
    files?: string[];
    workspace?: string;
  };
  options?: Record<string, any>;
}

export class DockerExecutor {
  private containerPrefix = 'docker-';

  private escapeForShell(str: string): string {
    // Use printf %q for safe shell escaping
    return `'${str.replace(/'/g, "'\\''")}'`;
  }
  
  async executeInContainer(
    agentId: string, 
    payload: AgentJobPayload
  ): Promise<DockerExecResult> {
    const containerName = await this.findContainer(agentId);
    
    if (!containerName) {
      throw new Error(`No running container found for agent ${agentId}`);
    }

    logger.info(`Executing job in container ${containerName}`, { agentId, prompt: payload.prompt });
    
    try {
      // For claude-code and openai-codex, pipe prompt via stdin to avoid sh -c issues
      if (agentId === 'claude-code' || agentId === 'openai-codex') {
        const cmdBase = agentId === 'claude-code'
          ? 'claude --print --dangerously-skip-permissions'
          : 'codex exec --dangerously-bypass-approvals-and-sandbox';

        const execCommand = `echo ${this.escapeForShell(payload.prompt)} | docker exec -i ${containerName} ${cmdBase}`;

        logger.debug(`Running command: ${execCommand}`);

        const { stdout, stderr } = await execAsync(execCommand, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 5 * 60 * 1000, // 5 minute timeout
        });

        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        };
      }

      // For other agents, use sh -c method
      const command = this.buildAgentCommand(agentId, payload);
      const execCommand = `docker exec -i ${containerName} sh -c "${command.replace(/"/g, '\\"')}"`;

      logger.debug(`Running command: ${execCommand}`);

      const { stdout, stderr } = await execAsync(execCommand, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 5 * 60 * 1000, // 5 minute timeout
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      logger.error(`Docker execution failed: ${error.message}`, { agentId, error });
      
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }
  
  private async findContainer(agentId: string): Promise<string | null> {
    try {
      // agentId now includes instance number (e.g., claude-code-1)
      // Construct exact container name: docker-{agentId}
      const containerName = `${this.containerPrefix}${agentId}`;

      const { stdout } = await execAsync(
        `docker ps --format "{{.Names}}" --filter "name=${containerName}"`
      );

      const found = stdout.trim();
      if (found) {
        logger.debug(`Found container ${found} for agent ${agentId}`);
        return found;
      }

      logger.debug(`No container found for agent ${agentId}`);
      return null;
    } catch (error) {
      logger.debug(`No container found for agent ${agentId}`);
      return null;
    }
  }

  private buildAgentCommand(agentId: string, payload: AgentJobPayload): string {
    const { prompt, context, options } = payload;
    
    // Escape prompt for shell and JSON
    const escapedPrompt = prompt.replace(/'/g, "'\\''").replace(/"/g, '\\"');
    
    switch (agentId) {
      case 'claude-code':
        // Use --print mode for non-interactive execution
        let claudeCmd = `claude --print --dangerously-skip-permissions "${escapedPrompt}"`;

        // Add model if specified
        if (options?.model) {
          claudeCmd = `claude --print --dangerously-skip-permissions --model ${options.model} "${escapedPrompt}"`;
        }

        // Add any additional CLI options
        if (options?.cliOptions) {
          claudeCmd = `claude --print --dangerously-skip-permissions ${options.cliOptions} "${escapedPrompt}"`;
        }

        // Add workspace if specified
        if (context?.workspace && typeof context.workspace === 'string' && context.workspace !== 'string') {
          claudeCmd = `cd ${context.workspace} && ${claudeCmd}`;
        }

        return claudeCmd;
        
      case 'openai-codex':
        // Use Codex exec for non-interactive execution
        let codexCmd = `codex exec --dangerously-bypass-approvals-and-sandbox "${escapedPrompt}"`;

        // Add model if specified
        if (options?.model) {
          codexCmd = `codex exec --dangerously-bypass-approvals-and-sandbox --model ${options.model} "${escapedPrompt}"`;
        }

        // Add any additional CLI options
        if (options?.cliOptions) {
          codexCmd = `codex exec --dangerously-bypass-approvals-and-sandbox ${options.cliOptions} "${escapedPrompt}"`;
        }

        if (context?.workspace && typeof context.workspace === 'string' && context.workspace !== 'string') {
          codexCmd = `cd ${context.workspace} && ${codexCmd}`;
        }

        return codexCmd;
        
      case 'aider':
        // Aider is real and configured to use LiteLLM proxy already
        let aiderCmd = `aider --yes --no-auto-commits`;
        if (options?.model) {
          aiderCmd += ` --model ${options.model}`;
        }
        if (context?.files && context.files.length > 0) {
          aiderCmd += ` ${context.files.join(' ')}`;
        }
        if (context?.workspace && typeof context.workspace === 'string' && context.workspace !== 'string') {
          aiderCmd = `cd ${context.workspace} && ${aiderCmd}`;
        }
        // Aider expects message via --message flag
        return `${aiderCmd} --message "${escapedPrompt}"`;
        
      case 'opencode':
        // Use Ollama which should be installed in the container
        let opencodeCmd = 'ollama run';
        
        // Add model if specified
        if (options?.model) {
          opencodeCmd += ` ${options.model}`;
        } else {
          opencodeCmd += ' codellama'; // Default to codellama for Ollama
        }
        
        if (context?.workspace && typeof context.workspace === 'string' && context.workspace !== 'string') {
          opencodeCmd = `cd ${context.workspace} && ${opencodeCmd}`;
        }
        
        return `echo '${escapedPrompt}' | ${opencodeCmd}`;
        
      default:
        throw new Error(`Unknown agent type: ${agentId}`);
    }
  }
  
  async checkContainerHealth(agentId: string): Promise<boolean> {
    const containerName = await this.findContainer(agentId);
    
    if (!containerName) {
      return false;
    }
    
    try {
      const { stdout } = await execAsync(
        `docker inspect ${containerName} --format='{{.State.Running}}'`
      );
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }
}
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
      const command = this.buildAgentCommand(agentId, payload);
      // Use sh -c to ensure shell commands like cd work properly
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
      // Look for any container with the agent name (e.g., docker-claude-code-1, docker-openai-codex-2)
      // Also handle case where container might be named just 'claude-code-1' without 'docker-' prefix
      const { stdout } = await execAsync(
        `docker ps --format "{{.Names}}" | grep -E "(^${this.containerPrefix})?${agentId}-[0-9]+$" | head -1`
      );
      
      const containerName = stdout.trim();
      if (containerName) {
        logger.debug(`Found container ${containerName} for agent ${agentId}`);
        return containerName;
      }
      
      logger.debug(`No container found for agent ${agentId}`);
      return null;
    } catch (error) {
      // grep returns exit code 1 when no matches found, which is not an error
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
        // Use the actual Claude CLI installed from npm
        // Use exec mode which doesn't require stdin/tty
        let claudeCmd = `claude exec --permission-mode auto "${escapedPrompt}"`;

        // Add model if specified
        if (options?.model) {
          claudeCmd = `CLAUDE_MODEL=${options.model} claude exec --permission-mode auto "${escapedPrompt}"`;
        }

        // Add any additional CLI options
        if (options?.cliOptions) {
          claudeCmd = `claude exec --permission-mode auto ${options.cliOptions} "${escapedPrompt}"`;
        }

        // Add workspace if specified
        if (context?.workspace && typeof context.workspace === 'string' && context.workspace !== 'string') {
          claudeCmd = `cd ${context.workspace} && ${claudeCmd}`;
        }

        return claudeCmd;
        
      case 'openai-codex':
        // Use the OpenAI Codex CLI tool
        // Codex exec mode doesn't require stdin/tty
        let codexCmd = `codex exec "${escapedPrompt}"`;

        // Add model if specified
        if (options?.model) {
          codexCmd = `codex --model ${options.model} exec "${escapedPrompt}"`;
        }

        // Add any additional CLI options
        if (options?.cliOptions) {
          codexCmd = `codex ${options.cliOptions} exec "${escapedPrompt}"`;
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
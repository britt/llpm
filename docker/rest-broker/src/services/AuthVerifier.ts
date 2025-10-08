import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface AuthResult {
  authenticated: boolean;
  expiresAt?: number;
  subscriptionType?: string;
  lastVerifiedAt: string;
}

export class AuthVerifier {
  private containerPrefix = 'docker-';

  /**
   * Verify authentication state for an agent by inspecting the container
   * @param agentId - The agent ID (e.g., 'claude-code', 'openai-codex')
   * @param provider - The provider type ('claude' or 'openai')
   * @returns AuthResult with authentication status and metadata
   */
  async verifyAgentAuth(agentId: string, provider: 'claude' | 'openai'): Promise<AuthResult> {
    const containerName = await this.findContainer(agentId);

    if (!containerName) {
      logger.debug(`No container found for agent ${agentId}`);
      return {
        authenticated: false,
        lastVerifiedAt: new Date().toISOString(),
      };
    }

    if (provider === 'claude') {
      return await this.verifyClaudeAuth(containerName);
    } else if (provider === 'openai') {
      return await this.verifyOpenAIAuth(containerName);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Verify Claude Code authentication by checking OAuth credentials file
   */
  private async verifyClaudeAuth(containerName: string): Promise<AuthResult> {
    try {
      // Check for OAuth credentials file and parse it with jq
      // Use double quotes for the outer sh -c and escape inner quotes
      const script = `if [ -f /home/claude/.claude/.credentials.json ]; then jq -c '{authenticated: (.claudeAiOauth != null), expiresAt: .claudeAiOauth.expiresAt, subscriptionType: .claudeAiOauth.subscriptionType}' /home/claude/.claude/.credentials.json 2>/dev/null; else echo '{"authenticated":false}'; fi`;

      const { stdout } = await execAsync(`docker exec ${containerName} sh -c "${script}"`);
      const data = JSON.parse(stdout.trim());

      // Check if token is expired
      if (data.authenticated && data.expiresAt) {
        const now = Date.now();
        if (data.expiresAt <= now) {
          logger.info(`Claude Code OAuth token expired (expiresAt: ${data.expiresAt}, now: ${now})`);
          data.authenticated = false;
        }
      }

      return {
        authenticated: data.authenticated || false,
        expiresAt: data.expiresAt,
        subscriptionType: data.subscriptionType,
        lastVerifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to verify Claude Code authentication:`, error);
      return {
        authenticated: false,
        lastVerifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify OpenAI Codex authentication by checking config file
   */
  private async verifyOpenAIAuth(containerName: string): Promise<AuthResult> {
    try {
      // Check for OpenAI config file and parse it with jq
      // Use double quotes for the outer sh -c and escape inner double quotes
      const script = `if [ -f /home/codex/.openai/config.json ]; then jq -c '{authenticated: (.api_key != null and .api_key != \\\"\\\")}' /home/codex/.openai/config.json 2>/dev/null; else echo '{"authenticated":false}'; fi`;

      const { stdout } = await execAsync(`docker exec ${containerName} sh -c "${script}"`);
      const data = JSON.parse(stdout.trim());

      return {
        authenticated: data.authenticated || false,
        lastVerifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to verify OpenAI Codex authentication:`, error);
      return {
        authenticated: false,
        lastVerifiedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Find the container name for a given agent ID
   */
  private async findContainer(agentId: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `docker ps --format "{{.Names}}" | grep -E "(^${this.containerPrefix})?${agentId}-[0-9]+$" | head -1`
      );

      const containerName = stdout.trim();
      if (containerName) {
        logger.debug(`Found container ${containerName} for agent ${agentId}`);
        return containerName;
      }

      return null;
    } catch (error) {
      // grep returns exit code 1 when no matches found
      return null;
    }
  }
}

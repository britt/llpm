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
    logger.info(`[AUTH] Starting auth verification for agent ${agentId}, provider ${provider}`);
    const containerName = await this.findContainer(agentId);

    if (!containerName) {
      logger.warn(`[AUTH] No container found for agent ${agentId}`);
      return {
        authenticated: false,
        lastVerifiedAt: new Date().toISOString()
      };
    }

    logger.info(`[AUTH] Found container ${containerName} for agent ${agentId}`);

    if (provider === 'claude') {
      return await this.verifyClaudeAuth(containerName, agentId);
    } else if (provider === 'openai') {
      return await this.verifyOpenAIAuth(containerName, agentId);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Verify Claude Code authentication by checking OAuth credentials file
   */
  private async verifyClaudeAuth(containerName: string, agentId: string): Promise<AuthResult> {
    try {
      logger.info(
        `[AUTH] Checking Claude credentials for ${agentId} in container ${containerName}`
      );

      // Check if credentials file exists first
      const checkFile = `docker exec ${containerName} test -f /home/claude/.claude/.credentials.json`;
      try {
        await execAsync(checkFile);
        logger.info(`[AUTH] Credentials file exists for ${agentId}`);
      } catch {
        // File doesn't exist
        logger.warn(`[AUTH] Credentials file does not exist for ${agentId}`);
        return {
          authenticated: false,
          lastVerifiedAt: new Date().toISOString()
        };
      }

      // File exists, read and parse it with jq inside the container
      const jqCmd = `docker exec ${containerName} jq -c '{authenticated: has("claudeAiOauth"), expiresAt: .claudeAiOauth.expiresAt, subscriptionType: .claudeAiOauth.subscriptionType}' /home/claude/.claude/.credentials.json`;
      logger.info(`[AUTH] Running jq command for ${agentId}: ${jqCmd}`);

      const { stdout } = await execAsync(jqCmd);
      logger.info(`[AUTH] jq output for ${agentId}: ${stdout.trim()}`);

      const data = JSON.parse(stdout.trim());
      logger.info(`[AUTH] Parsed data for ${agentId}: ${JSON.stringify(data)}`);

      // Check if token is expired
      if (data.authenticated && data.expiresAt) {
        const now = Date.now();
        if (data.expiresAt <= now) {
          logger.warn(
            `[AUTH] Claude Code OAuth token expired for ${agentId} (expiresAt: ${data.expiresAt}, now: ${now})`
          );
          data.authenticated = false;
        } else {
          logger.info(
            `[AUTH] Token is valid for ${agentId} (expiresAt: ${data.expiresAt}, now: ${now})`
          );
        }
      }

      const result = {
        authenticated: data.authenticated || false,
        expiresAt: data.expiresAt,
        subscriptionType: data.subscriptionType,
        lastVerifiedAt: new Date().toISOString()
      };

      logger.info(`[AUTH] Final result for ${agentId}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`[AUTH] Failed to verify Claude Code authentication for ${agentId}:`, error);
      return {
        authenticated: false,
        lastVerifiedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Verify OpenAI Codex authentication by checking auth file
   */
  private async verifyOpenAIAuth(containerName: string, agentId: string): Promise<AuthResult> {
    try {
      logger.info(
        `[AUTH] Checking OpenAI Codex credentials for ${agentId} in container ${containerName}`
      );

      // Check for codex auth file (newer codex CLI uses ~/.codex/auth.json)
      // Also check legacy ~/.openai/config.json for backwards compatibility
      // Use double quotes for the outer sh -c and escape inner double quotes
      const script = `if [ -f /home/codex/.codex/auth.json ]; then jq -c '{authenticated: true, user: .user.email}' /home/codex/.codex/auth.json 2>/dev/null; elif [ -f /home/codex/.openai/config.json ]; then jq -c '{authenticated: (.api_key != null and .api_key != \\\"\\\")}' /home/codex/.openai/config.json 2>/dev/null; else echo '{"authenticated":false}'; fi`;
      const fullCmd = `docker exec ${containerName} sh -c "${script}"`;

      logger.info(`[AUTH] Running auth check command for ${agentId}: ${fullCmd}`);

      const { stdout } = await execAsync(fullCmd);
      logger.info(`[AUTH] Auth check output for ${agentId}: ${stdout.trim()}`);

      const data = JSON.parse(stdout.trim());
      logger.info(`[AUTH] Parsed data for ${agentId}: ${JSON.stringify(data)}`);

      const result = {
        authenticated: data.authenticated || false,
        lastVerifiedAt: new Date().toISOString()
      };

      logger.info(`[AUTH] Final result for ${agentId}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`[AUTH] Failed to verify OpenAI Codex authentication for ${agentId}:`, error);
      return {
        authenticated: false,
        lastVerifiedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Find the container name for a given agent ID
   */
  private async findContainer(agentId: string): Promise<string | null> {
    try {
      // agentId now includes instance number (e.g., claude-code-1)
      // Try docker-{agentId} first, then {agentId}
      const containerName = `${this.containerPrefix}${agentId}`;
      const dockerCmd = `docker ps --format "{{.Names}}" --filter "name=${containerName}"`;

      logger.info(`[AUTH] Looking for container for agent ${agentId}`);
      logger.info(`[AUTH] Expected container name: ${containerName}`);
      logger.info(`[AUTH] Running docker command: ${dockerCmd}`);

      const { stdout } = await execAsync(dockerCmd);

      const found = stdout.trim();
      logger.info(`[AUTH] Docker ps output: "${found}"`);

      if (found) {
        logger.info(`[AUTH] Found container ${found} for agent ${agentId}`);
        return found;
      }

      logger.warn(`[AUTH] No container found for agent ${agentId}`);
      return null;
    } catch (error) {
      logger.error(`[AUTH] Error finding container for agent ${agentId}:`, error);
      return null;
    }
  }
}

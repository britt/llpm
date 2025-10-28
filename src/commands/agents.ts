import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Use fetch instead of axios for consistency
const BROKER_URL = process.env.REST_BROKER_URL || 'http://localhost:3010';

async function brokerRequest(method: string, path: string, body?: any) {
  try {
    const url = `${BROKER_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `Request failed with status ${response.status}` };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export const agentsCommand: Command = {
  name: 'agents',
  description: 'Manage and monitor REST broker agents',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /agents command with args:', args);

    const subCommand = args[0]?.toLowerCase() || 'list';

    switch (subCommand) {
      case 'list': {
        const result = await brokerRequest('GET', '/agents');

        if (!result.success) {
          return {
            content: `❌ Failed to list agents: ${result.error}`,
            success: false
          };
        }

        const agents = result.data?.agents || [];

        if (agents.length === 0) {
          return {
            content: '📋 No agents registered.\n\n💡 Start agents with `docker-compose up` to register them.',
            success: true
          };
        }

        const agentList = agents.map((agent: any) => {
          const status = agent.status === 'available' ? '🟢' :
                        agent.status === 'busy' ? '🟡' : '🔴';
          const health = agent.health?.status === 'healthy' ? '✅' :
                        agent.health?.status === 'unhealthy' ? '❌' : '❓';
          const auth = agent.health?.authenticated ? '🔒' : '🔓';

          return `${status} **${agent.name}** (${agent.id})
  Status: ${agent.status} | Health: ${health} ${agent.health?.status || 'unknown'}
  Auth: ${auth} ${agent.health?.authenticated ? 'authenticated' : 'not authenticated'}${agent.provider ? `\n  Provider: ${agent.provider}` : ''}${agent.model ? ` | Model: ${agent.model}` : ''}`;
        }).join('\n\n');

        return {
          content: `📋 **Registered Agents** (${agents.length} total):\n\n${agentList}`,
          success: true
        };
      }

      case 'get': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /agents get <agent-id>\n\nExample: /agents get claude-code',
            success: false
          };
        }

        const agentId = args[1];
        const result = await brokerRequest('GET', `/agents/${agentId}`);

        if (!result.success) {
          return {
            content: `❌ Failed to get agent: ${result.error}`,
            success: false
          };
        }

        const agent = result.data?.agent;

        if (!agent) {
          return {
            content: `❌ Agent not found: ${agentId}`,
            success: false
          };
        }

        const status = agent.status === 'available' ? '🟢 Available' :
                      agent.status === 'busy' ? '🟡 Busy' : '🔴 Offline';
        const health = agent.health?.status === 'healthy' ? '✅ Healthy' :
                      agent.health?.status === 'unhealthy' ? '❌ Unhealthy' : '❓ Unknown';
        const auth = agent.health?.authenticated ? '🔒 Authenticated' : '🔓 Not Authenticated';

        let details = `📋 **Agent Details: ${agent.name}**

**ID**: ${agent.id}
**Type**: ${agent.type}
**Status**: ${status}
**Health**: ${health}${agent.health?.message ? ` - ${agent.health.message}` : ''}
**Authentication**: ${auth}${agent.health?.authExpiresAt ? `\n**Auth Expires**: ${new Date(agent.health.authExpiresAt).toLocaleString()}` : ''}
**Auth Type**: ${agent.authType || 'none'}${agent.provider ? `\n**Provider**: ${agent.provider}` : ''}${agent.model ? `\n**Model**: ${agent.model}` : ''}`;

        if (agent.registeredAt) {
          details += `\n**Registered**: ${new Date(agent.registeredAt).toLocaleString()}`;
        }

        return {
          content: details,
          success: true
        };
      }

      case 'health': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /agents health <agent-id>\n\nExample: /agents health claude-code',
            success: false
          };
        }

        const agentId = args[1];
        const result = await brokerRequest('GET', `/agents/${agentId}`);

        if (!result.success) {
          return {
            content: `❌ Failed to check agent health: ${result.error}`,
            success: false
          };
        }

        const agent = result.data?.agent;
        if (!agent) {
          return {
            content: `❌ Agent not found: ${agentId}`,
            success: false
          };
        }

        const health = agent.health || {};
        const status = health.status === 'healthy' ? '✅' :
                      health.status === 'unhealthy' ? '❌' : '❓';

        return {
          content: `${status} **Health Check: ${agent.name}**

**Status**: ${health.status || 'unknown'}${health.message ? `\n**Message**: ${health.message}` : ''}
**Last Check**: ${health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'never'}
**Agent Status**: ${agent.status}${health.authenticated !== undefined ? `\n**Authenticated**: ${health.authenticated ? 'yes' : 'no'}` : ''}`,
          success: true
        };
      }

      case 'connect': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /agents connect <agent-id>\n\nExample: /agents connect claude-code',
            success: false
          };
        }

        const agentId = args[1];

        // Get agent details to find container name
        const result = await brokerRequest('GET', `/agents/${agentId}`);

        if (!result.success) {
          return {
            content: `❌ Failed to get agent details: ${result.error}`,
            success: false
          };
        }

        const agent = result.data?.agent;
        if (!agent) {
          return {
            content: `❌ Agent not found: ${agentId}`,
            success: false
          };
        }

        // Try to find the actual container name from docker ps
        // Use docker ps --filter to find containers matching the agentId pattern
        // This works with any compose project name (docker, myproject, etc.)
        let containerName = agentId;
        try {
          // Search for containers with names containing the agentId
          // This handles docker-compose prefixes like: docker-claude-code-1, myproject-claude-code-1, etc.
          const { stdout } = await execAsync(`docker ps --filter "name=${agentId}" --format "{{.Names}}"`);
          const matchingContainers = stdout.trim().split('\n').filter(Boolean);

          if (matchingContainers.length > 0) {
            // Prefer exact matches or compose-style matches
            // Priority: exact match > *-agentId-1 > *-agentId > agentId
            const exactMatch = matchingContainers.find(name => name === agentId);
            const composeSuffixMatch = matchingContainers.find(name => name.endsWith(`-${agentId}-1`));
            const composeMatch = matchingContainers.find(name => name.endsWith(`-${agentId}`));

            containerName = exactMatch || composeSuffixMatch || composeMatch || matchingContainers[0];
            debug(`Found container for ${agentId}: ${containerName} (from ${matchingContainers.length} matches)`);
          } else {
            debug(`No containers found matching ${agentId}, using agentId as fallback`);
          }
        } catch (error) {
          debug(`Docker command failed: ${error instanceof Error ? error.message : String(error)}`);
          // If docker command fails, just use the agentId as fallback
        }

        const connectCommand = `docker exec -it ${containerName} /bin/bash`;

        // Copy to clipboard using pbcopy (macOS) or xclip (Linux)
        try {
          await execAsync(`echo "${connectCommand}" | pbcopy`);

          return {
            content: `🔗 **Docker Connect Command** (copied to clipboard)

\`\`\`bash
${connectCommand}
\`\`\`

**Agent**: ${agent.name} (${agentId})
**Container**: ${containerName}

✅ The command has been copied to your clipboard. Just paste and run!

**Note**: If the container name doesn't match, run \`docker ps\` to see available containers.`,
            success: true
          };
        } catch {
          return {
            content: `🔗 **Docker Connect Command**

\`\`\`bash
${connectCommand}
\`\`\`

**Agent**: ${agent.name} (${agentId})
**Container**: ${containerName}

⚠️  Could not copy to clipboard automatically.
💡 Copy the command above and run it in your terminal.

**Note**: If the container name doesn't match, run \`docker ps\` to see available containers.`,
            success: true
          };
        }
      }

      case 'help': {
        return {
          content: `📋 **Agents Command Help**

**Usage**: /agents [subcommand] [args]

**Subcommands**:
• **list** - List all registered agents (default)
• **get <agent-id>** - Get detailed information about a specific agent
• **health <agent-id>** - Check health status of a specific agent
• **connect <agent-id>** - Get Docker connect command and copy to clipboard
• **help** - Show this help message

**Examples**:
\`\`\`
/agents
/agents list
/agents get claude-code
/agents health openai-codex
/agents connect claude-code
\`\`\`

💡 For job management, use \`/jobs\` command`,
          success: true
        };
      }

      default: {
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nUse \`/agents help\` to see available commands.`,
          success: false
        };
      }
    }
  }
};

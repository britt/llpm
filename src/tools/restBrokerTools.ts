/**
 * REST Broker Agent Tools
 *
 * Model-accessible tools that surface REST broker operations for agent lifecycle,
 * job control, health checks, and logs. Enables the assistant to perform agent
 * operations programmatically while maintaining security and auditability.
 */

import { tool } from './instrumentedTool';
import { z } from 'zod';
import { requiresConfirmation, formatConfirmationPrompt } from '../utils/toolConfirmation';
import { auditToolCall } from '../utils/toolAudit';
import { debug } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Default REST broker URL (can be overridden via env)
const BROKER_URL = process.env.REST_BROKER_URL || 'http://localhost:3010';

/**
 * Helper to make REST broker API calls
 */
async function brokerRequest<T>(
  method: string,
  path: string,
  body?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const url = `${BROKER_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Request failed with status ${response.status}`
      };
    }

    return {
      success: true,
      data: data as T
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * List all available agents
 */
export const listAgentsTool = tool({
  description: 'List all registered agents in the REST broker. Returns agent details including status, health, and authentication state.',
  inputSchema: z.object({
    verifyAuth: z.boolean().optional().describe('Whether to trigger authentication verification before listing agents')
  }),
  execute: async ({ verifyAuth }) => {
    const queryParam = verifyAuth ? '?verifyAuth=true' : '';
    const result = await brokerRequest<{ agents: any[] }>('GET', `/agents${queryParam}`);

    if (!result.success) {
      return `❌ Failed to list agents: ${result.error}`;
    }

    const agents = result.data?.agents || [];
    if (agents.length === 0) {
      return '📋 No agents registered.';
    }

    const agentList = agents.map(agent => {
      const status = agent.status === 'available' ? '🟢' :
                    agent.status === 'busy' ? '🟡' : '🔴';
      const health = agent.health?.status === 'healthy' ? '✅' :
                    agent.health?.status === 'unhealthy' ? '❌' : '❓';
      const auth = agent.health?.authenticated ? '🔒' : '🔓';

      return `${status} **${agent.name}** (${agent.id})
  Type: ${agent.type} | Status: ${agent.status} | Health: ${health} ${agent.health?.status || 'unknown'}
  Auth: ${auth} ${agent.health?.authenticated ? 'authenticated' : 'not authenticated'}${agent.health?.authExpiresAt ? ` (expires: ${new Date(agent.health.authExpiresAt).toLocaleString()})` : ''}
  ${agent.provider ? `Provider: ${agent.provider}` : ''}${agent.model ? ` | Model: ${agent.model}` : ''}`;
    }).join('\n\n');

    return `📋 **Registered Agents** (${agents.length} total):\n\n${agentList}`;
  }
});

/**
 * Get details for a specific agent
 */
export const getAgentTool = tool({
  description: 'Get detailed information about a specific agent including its configuration, status, health, and authentication state.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent to retrieve')
  }),
  execute: async ({ agentId }) => {
    const result = await brokerRequest<{ agent: any }>('GET', `/agents/${agentId}`);

    if (!result.success) {
      return `❌ Failed to get agent: ${result.error}`;
    }

    const agent = result.data?.agent;
    if (!agent) {
      return `❌ Agent not found: ${agentId}`;
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
**Authentication**: ${auth}${agent.health?.authExpiresAt ? `\n**Auth Expires**: ${new Date(agent.health.authExpiresAt).toLocaleString()}` : ''}${agent.health?.authLastVerifiedAt ? `\n**Last Verified**: ${new Date(agent.health.authLastVerifiedAt).toLocaleString()}` : ''}
**Auth Type**: ${agent.authType || 'none'}${agent.provider ? `\n**Provider**: ${agent.provider}` : ''}${agent.model ? `\n**Model**: ${agent.model}` : ''}${agent.baseUrl ? `\n**Base URL**: ${agent.baseUrl}` : ''}${agent.host ? `\n**Host**: ${agent.host}:${agent.port}` : ''}`;

    if (agent.registeredAt) {
      details += `\n**Registered**: ${new Date(agent.registeredAt).toLocaleString()}`;
    }
    if (agent.lastHeartbeat) {
      details += `\n**Last Heartbeat**: ${new Date(agent.lastHeartbeat).toLocaleString()}`;
    }

    if (agent.metadata && Object.keys(agent.metadata).length > 0) {
      details += `\n\n**Metadata**:\n${JSON.stringify(agent.metadata, null, 2)}`;
    }

    return details;
  }
});

/**
 * Check agent health
 */
export const checkAgentHealthTool = tool({
  description: 'Perform a health check on a specific agent to verify it is responding correctly.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent to health check')
  }),
  execute: async ({ agentId }) => {
    // Get current agent to check health
    const result = await brokerRequest<{ agent: any }>('GET', `/agents/${agentId}`);

    if (!result.success) {
      return `❌ Failed to check agent health: ${result.error}`;
    }

    const agent = result.data?.agent;
    if (!agent) {
      return `❌ Agent not found: ${agentId}`;
    }

    const health = agent.health || {};
    const status = health.status === 'healthy' ? '✅' :
                  health.status === 'unhealthy' ? '❌' : '❓';

    return `${status} **Health Check: ${agent.name}**

**Status**: ${health.status || 'unknown'}${health.message ? `\n**Message**: ${health.message}` : ''}
**Last Check**: ${health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'never'}
**Agent Status**: ${agent.status}${health.authenticated !== undefined ? `\n**Authenticated**: ${health.authenticated ? 'yes' : 'no'}` : ''}`;
  }
});

/**
 * List jobs for an agent
 */
export const listJobsTool = tool({
  description: 'List jobs for a specific agent with optional filtering by status.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional().describe('Filter jobs by status'),
    limit: z.number().optional().default(50).describe('Maximum number of jobs to return (1-100)'),
    offset: z.number().optional().default(0).describe('Number of jobs to skip for pagination')
  }),
  execute: async ({ agentId, status, limit = 50, offset = 0 }) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const result = await brokerRequest<{ jobs: any[]; total: number }>('GET', `/agents/${agentId}/jobs?${params}`);

    if (!result.success) {
      return `❌ Failed to list jobs: ${result.error}`;
    }

    const { jobs = [], total = 0 } = result.data || {};

    if (jobs.length === 0) {
      return `📋 No jobs found for agent ${agentId}${status ? ` with status ${status}` : ''}.`;
    }

    const jobList = jobs.map(job => {
      const statusIcon = job.status === 'completed' ? '✅' :
                        job.status === 'failed' ? '❌' :
                        job.status === 'running' ? '🔄' :
                        job.status === 'cancelled' ? '🚫' : '⏳';

      return `${statusIcon} **Job ${job.id}**
  Status: ${job.status} | Created: ${new Date(job.createdAt).toLocaleString()}${job.completedAt ? ` | Completed: ${new Date(job.completedAt).toLocaleString()}` : ''}${job.error ? `\n  Error: ${job.error}` : ''}`;
    }).join('\n\n');

    return `📋 **Jobs for Agent ${agentId}** (showing ${jobs.length} of ${total} total):\n\n${jobList}${jobs.length < total ? `\n\n💡 Use offset=${offset + limit} to see more jobs.` : ''}`;
  }
});

/**
 * Get job details
 */
export const getJobTool = tool({
  description: 'Get detailed information about a specific job including its status, payload, and results.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    jobId: z.string().describe('The ID of the job')
  }),
  execute: async ({ agentId, jobId }) => {
    const result = await brokerRequest<any>('GET', `/agents/${agentId}/jobs/${jobId}`);

    if (!result.success) {
      return `❌ Failed to get job: ${result.error}`;
    }

    const job = result.data;
    if (!job) {
      return `❌ Job not found: ${jobId}`;
    }

    const statusIcon = job.status === 'completed' ? '✅' :
                      job.status === 'failed' ? '❌' :
                      job.status === 'running' ? '🔄' :
                      job.status === 'cancelled' ? '🚫' : '⏳';

    let details = `${statusIcon} **Job Details: ${job.id}**

**Status**: ${job.status}
**Agent**: ${job.agentId}
**Created**: ${new Date(job.createdAt).toLocaleString()}`;

    if (job.startedAt) {
      details += `\n**Started**: ${new Date(job.startedAt).toLocaleString()}`;
    }
    if (job.completedAt) {
      details += `\n**Completed**: ${new Date(job.completedAt).toLocaleString()}`;
    }
    if (job.error) {
      details += `\n**Error**: ${job.error}`;
    }

    if (job.payload) {
      details += `\n\n**Payload**:\n\`\`\`json\n${JSON.stringify(job.payload, null, 2)}\n\`\`\``;
    }

    if (job.result) {
      details += `\n\n**Result**:\n\`\`\`json\n${JSON.stringify(job.result, null, 2)}\n\`\`\``;
    }

    return details;
  }
});

/**
 * Create a new job
 */
export const createJobTool = tool({
  description: 'Submit a new job to an agent. The job will be queued and executed by the agent. Returns the job ID for tracking.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent to execute the job'),
    payload: z.any().describe('The job payload containing task details and parameters')
  }),
  execute: async ({ agentId, payload }) => {
    const result = await brokerRequest<{ jobId: string; status: string; createdAt: string }>(
      'POST',
      `/agents/${agentId}/jobs`,
      payload
    );

    if (!result.success) {
      return `❌ Failed to create job: ${result.error}`;
    }

    const { jobId, status, createdAt } = result.data || {};

    return `✅ **Job Created Successfully**

**Job ID**: ${jobId}
**Agent**: ${agentId}
**Status**: ${status}
**Created**: ${new Date(createdAt!).toLocaleString()}

💡 Use \`get_job\` with agentId="${agentId}" and jobId="${jobId}" to check job status.`;
  }
});

/**
 * Cancel a job
 */
export const cancelJobTool = tool({
  description: 'Cancel a running or pending job. This is a destructive operation that requires confirmation.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    jobId: z.string().describe('The ID of the job to cancel'),
    confirmed: z.boolean().optional().describe('Set to true to bypass confirmation (only after user explicitly confirms)')
  }),
  execute: async ({ agentId, jobId, confirmed }) => {
    const startTime = Date.now();

    try {
      // Check if confirmation is required
      const confirmCheck = requiresConfirmation('cancel_job', { agentId, jobId });

      if (confirmCheck.required && !confirmed) {
        const prompt = formatConfirmationPrompt(confirmCheck);
        return `${prompt}\n\n💡 Once confirmed, call this tool again with \`confirmed: true\``;
      }

      const result = await brokerRequest<{ jobId: string; status: string; cancelled: boolean; message: string }>(
        'POST',
        `/agents/${agentId}/jobs/${jobId}/cancel`
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        // Audit failed attempt
        await auditToolCall({
          timestamp: new Date().toISOString(),
          toolName: 'cancel_job',
          parameters: { agentId, jobId, confirmed },
          error: result.error,
          duration
        });

        return `❌ Failed to cancel job: ${result.error}`;
      }

      const { cancelled, message } = result.data || {};

      // Audit successful call
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'cancel_job',
        parameters: { agentId, jobId, confirmed },
        result: { cancelled, message },
        duration
      });

      if (cancelled) {
        return `✅ **Job Cancelled**: ${jobId}\n\n${message}\n\n📝 *This action has been logged for audit purposes.*`;
      } else {
        return `⚠️ **Could not cancel job**: ${jobId}\n\n${message}`;
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Audit error
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'cancel_job',
        parameters: { agentId, jobId, confirmed },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return `❌ Error cancelling job: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Mark agent as authenticated (for subscription agents)
 */
export const markAgentAuthenticatedTool = tool({
  description: 'Mark a subscription agent as authenticated after the user completes the OAuth flow. This updates the agent health status.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the subscription agent to mark as authenticated')
  }),
  execute: async ({ agentId }) => {
    const result = await brokerRequest<{ status: number; message: string; agent: any }>(
      'PATCH',
      `/agents/${agentId}/auth`
    );

    if (!result.success) {
      return `❌ Failed to mark agent as authenticated: ${result.error}`;
    }

    const { message, agent } = result.data || {};

    return `✅ ${message}

**Agent**: ${agent?.name} (${agent?.id})
**Auth Status**: ${agent?.health?.authenticated ? '🔒 Authenticated' : '🔓 Not Authenticated'}${agent?.health?.authExpiresAt ? `\n**Expires**: ${new Date(agent.health.authExpiresAt).toLocaleString()}` : ''}`;
  }
});

/**
 * Get Docker connect command for an agent
 */
export const getAgentConnectCommandTool = tool({
  description: 'Get the Docker exec command to connect to an agent container. Automatically copies the command to the clipboard for easy use.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent to connect to')
  }),
  execute: async ({ agentId }) => {
    const result = await brokerRequest<{ agent: any }>('GET', `/agents/${agentId}`);

    if (!result.success) {
      return `❌ Failed to get agent details: ${result.error}`;
    }

    const agent = result.data?.agent;
    if (!agent) {
      return `❌ Agent not found: ${agentId}`;
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

      return `🔗 **Docker Connect Command** (copied to clipboard)

\`\`\`bash
${connectCommand}
\`\`\`

**Agent**: ${agent.name} (${agentId})
**Container**: ${containerName}

✅ The command has been copied to your clipboard. Just paste and run!

**Note**: If the container name doesn't match, run \`docker ps\` to see available containers.`;
    } catch (_error) {
      return `🔗 **Docker Connect Command**

\`\`\`bash
${connectCommand}
\`\`\`

**Agent**: ${agent.name} (${agentId})
**Container**: ${containerName}

⚠️  Could not copy to clipboard automatically.
💡 Copy the command above and run it in your terminal.

**Note**: If the container name doesn't match, run \`docker ps\` to see available containers.`;
    }
  }
});

/**
 * Scale the agent cluster
 */
export const scaleAgentClusterTool = tool({
  description: 'Scale the Docker agent cluster by adjusting the number of running instances for each agent type. Use presets (dev, team, heavy, minimal) or specify custom instance counts.',
  inputSchema: z.object({
    preset: z.enum(['dev', 'team', 'heavy', 'minimal', 'custom']).optional().describe('Scaling preset: dev (1 each), team (1 claude, 2 codex, 2 aider, 1 opencode), heavy (2 claude, 3 codex, 3 aider, 2 opencode), minimal (1 aider only)'),
    claudeCode: z.number().min(0).max(10).optional().describe('Number of Claude Code instances (0-10). Only used with preset=custom'),
    openaiCodex: z.number().min(0).max(10).optional().describe('Number of OpenAI Codex instances (0-10). Only used with preset=custom'),
    aider: z.number().min(0).max(10).optional().describe('Number of Aider instances (0-10). Only used with preset=custom'),
    opencode: z.number().min(0).max(10).optional().describe('Number of OpenCode instances (0-10). Only used with preset=custom'),
    authType: z.enum(['api_key', 'subscription']).default('subscription').describe('Authentication type for agents')
  }),
  execute: async ({ preset, claudeCode, openaiCodex, aider, opencode, authType = 'subscription' }) => {
    const startTime = Date.now();

    try {
      // Load config to get Docker paths and project-specific agent config
      const { loadProjectConfig, loadProjectAgentConfig } = await import('../utils/projectConfig');
      const appConfig = await loadProjectConfig();

      const scaleScriptPath = appConfig.docker?.scaleScriptPath || 'docker/scale.sh';
      const composeDir = appConfig.docker?.composeFilePath
        ? appConfig.docker.composeFilePath.substring(0, appConfig.docker.composeFilePath.lastIndexOf('/'))
        : 'docker';

      // Load project-specific agent config
      let projectAgentConfig = null;
      if (appConfig.currentProject) {
        projectAgentConfig = await loadProjectAgentConfig(appConfig.currentProject);
      }

      // Determine scaling configuration
      let config: { claude: number; codex: number; aider: number; opencode: number };

      // Check if any custom counts were provided (even if preset wasn't set to 'custom')
      const hasCustomCounts = claudeCode !== undefined || openaiCodex !== undefined ||
                              aider !== undefined || opencode !== undefined;

      if (preset === 'custom' || hasCustomCounts) {
        // Use custom configuration
        config = {
          claude: claudeCode ?? 0,
          codex: openaiCodex ?? 0,
          aider: aider ?? 0,
          opencode: opencode ?? 0
        };
      } else if (preset) {
        // Use preset configuration
        const presets = {
          dev: { claude: 1, codex: 1, aider: 1, opencode: 1 },
          team: { claude: 1, codex: 2, aider: 2, opencode: 1 },
          heavy: { claude: 2, codex: 3, aider: 3, opencode: 2 },
          minimal: { claude: 0, codex: 0, aider: 1, opencode: 0 }
        };
        config = presets[preset];
      } else if (projectAgentConfig) {
        // Use project-specific agent config
        if (projectAgentConfig.customCounts) {
          // Use custom counts from project config
          config = {
            claude: projectAgentConfig.customCounts.claudeCode ?? 0,
            codex: projectAgentConfig.customCounts.openaiCodex ?? 0,
            aider: projectAgentConfig.customCounts.aider ?? 0,
            opencode: projectAgentConfig.customCounts.opencode ?? 0
          };
        } else if (projectAgentConfig.defaultPreset) {
          // Use default preset from project config
          const presets = {
            dev: { claude: 1, codex: 1, aider: 1, opencode: 1 },
            team: { claude: 1, codex: 2, aider: 2, opencode: 1 },
            heavy: { claude: 2, codex: 3, aider: 3, opencode: 2 },
            minimal: { claude: 0, codex: 0, aider: 1, opencode: 0 }
          };
          config = presets[projectAgentConfig.defaultPreset];
        } else {
          // Project config exists but has no preset or counts, default to dev
          config = { claude: 1, codex: 1, aider: 1, opencode: 1 };
        }
        // Override authType if project has it configured
        if (projectAgentConfig.authType) {
          authType = projectAgentConfig.authType;
        }
      } else {
        // No preset, custom counts, or project config - default to dev
        config = { claude: 1, codex: 1, aider: 1, opencode: 1 };
      }

      // Execute scaling via scale.sh script
      // Extract script filename from path
      const scriptName = scaleScriptPath.substring(scaleScriptPath.lastIndexOf('/') + 1);

      // Change to compose directory and run scale script
      const { stdout } = await execAsync(`cd ${composeDir} && ./${scriptName} custom --claude ${config.claude} --codex ${config.codex} --aider ${config.aider} --opencode ${config.opencode} --auth-type ${authType}`);
      const result = stdout;

      const duration = Date.now() - startTime;

      // Audit the scaling operation
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'scale_agent_cluster',
        parameters: { preset, claudeCode, openaiCodex, aider, opencode, authType },
        result: { config, output: result },
        duration
      });

      // Build response message
      let responseMsg = `✅ **Agent Cluster Scaled Successfully**\n\n`;

      // Show source of configuration
      if (projectAgentConfig && !preset && !hasCustomCounts) {
        const { getProjectAgentsYamlPath } = await import('../utils/config');
        const yamlPath = getProjectAgentsYamlPath(appConfig.currentProject!);
        responseMsg += `📁 **Using project config from**: ${yamlPath}\n\n`;
      }

      responseMsg += `**Configuration**:
- Claude Code: ${config.claude} instance(s)
- OpenAI Codex: ${config.codex} instance(s)
- Aider: ${config.aider} instance(s)
- OpenCode: ${config.opencode} instance(s)
- Auth Type: ${authType}

**Total Agents**: ${config.claude + config.codex + config.aider + config.opencode}

${result}

📝 *This scaling operation has been logged for audit purposes.*`;

      return responseMsg;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Audit error
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'scale_agent_cluster',
        parameters: { preset, claudeCode, openaiCodex, aider, opencode, authType },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return `❌ Failed to scale agent cluster: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Register a new agent
 */
export const registerAgentTool = tool({
  description: 'Register a new agent with the REST broker. Allows creating new agent instances programmatically.',
  inputSchema: z.object({
    agentId: z.string().describe('Unique identifier for the agent'),
    name: z.string().describe('Human-readable name for the agent'),
    type: z.string().describe('Agent type (e.g., "claude-code", "openai-codex", "aider")'),
    authType: z.enum(['subscription', 'api_key']).optional().describe('Authentication type for the agent'),
    provider: z.string().optional().describe('Provider name (required for subscription auth type)'),
    model: z.string().optional().describe('Model identifier (required for subscription auth type)'),
    host: z.string().optional().describe('Agent host address'),
    port: z.number().optional().describe('Agent port number'),
    metadata: z.record(z.any(), z.any()).optional().describe('Additional agent metadata')
  }),
  execute: async ({ agentId, name, type, authType, provider, model, host, port, metadata }) => {
    const startTime = Date.now();

    try {
      const payload: any = {
        agentId,
        name,
        type
      };

      if (authType) payload.authType = authType;
      if (provider) payload.provider = provider;
      if (model) payload.model = model;
      if (host) payload.host = host;
      if (port) payload.port = port;
      if (metadata) payload.metadata = metadata;

      const result = await brokerRequest<{ status: number; message: string; agentId: string; litellmUrl?: string }>(
        'POST',
        '/register',
        payload
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        // Audit failed attempt
        await auditToolCall({
          timestamp: new Date().toISOString(),
          toolName: 'register_agent',
          parameters: { agentId, name, type, authType },
          error: result.error,
          duration
        });

        return `❌ Failed to register agent: ${result.error}`;
      }

      // Audit successful registration
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'register_agent',
        parameters: { agentId, name, type, authType },
        result: result.data,
        duration
      });

      const { message, litellmUrl } = result.data || {};
      let responseMsg = `✅ **Agent Registered Successfully**

**Agent ID**: ${agentId}
**Name**: ${name}
**Type**: ${type}
${authType ? `**Auth Type**: ${authType}` : ''}
${provider ? `**Provider**: ${provider}` : ''}
${model ? `**Model**: ${model}` : ''}

${message}`;

      if (litellmUrl) {
        responseMsg += `\n\n🔗 **LiteLLM Passthrough URL**: ${litellmUrl}\n\n⚠️ **Next Step**: Agent requires authentication. Use \`mark_agent_authenticated\` after authenticating.`;
      }

      responseMsg += `\n\n📝 *This registration has been logged for audit purposes.*`;

      return responseMsg;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Audit error
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'register_agent',
        parameters: { agentId, name, type, authType },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return `❌ Failed to register agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Delete (deregister) an agent
 */
export const deleteAgentTool = tool({
  description: 'Delete (deregister) an agent from the REST broker. This is a destructive operation that requires confirmation.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent to delete'),
    confirmed: z.boolean().optional().describe('Set to true to bypass confirmation (only after user explicitly confirms)')
  }),
  execute: async ({ agentId, confirmed }) => {
    const startTime = Date.now();

    try {
      // Check if confirmation is required
      const confirmCheck = requiresConfirmation('delete_agent', { agentId });

      if (confirmCheck.required && !confirmed) {
        const prompt = formatConfirmationPrompt(confirmCheck);
        return `${prompt}\n\n💡 Once confirmed, call this tool again with \`confirmed: true\``;
      }

      const result = await brokerRequest<{ status: number; message: string; agentId: string }>(
        'DELETE',
        `/register/${agentId}`
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        // Audit failed attempt
        await auditToolCall({
          timestamp: new Date().toISOString(),
          toolName: 'delete_agent',
          parameters: { agentId, confirmed },
          error: result.error,
          duration
        });

        return `❌ Failed to delete agent: ${result.error}`;
      }

      // Audit successful deletion
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'delete_agent',
        parameters: { agentId, confirmed },
        result: result.data,
        duration
      });

      return `✅ **Agent Deleted Successfully**

**Agent ID**: ${agentId}
**Status**: Deregistered

The agent has been removed from the REST broker.

📝 *This deletion has been logged for audit purposes.*`;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Audit error
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'delete_agent',
        parameters: { agentId, confirmed },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return `❌ Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Update agent status and metadata
 */
export const updateAgentTool = tool({
  description: 'Update an agent\'s status and metadata via heartbeat. Use this to update agent state programmatically.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent to update'),
    status: z.enum(['available', 'busy', 'offline']).optional().describe('New agent status'),
    metadata: z.record(z.any(), z.any()).optional().describe('Updated metadata for the agent')
  }),
  execute: async ({ agentId, status, metadata }) => {
    const startTime = Date.now();

    try {
      const payload: any = {};
      if (status) payload.status = status;
      if (metadata) payload.metadata = metadata;

      const result = await brokerRequest<{ status: number; message: string; agentId: string }>(
        'POST',
        `/heartbeat/${agentId}`,
        payload
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        // Audit failed attempt
        await auditToolCall({
          timestamp: new Date().toISOString(),
          toolName: 'update_agent',
          parameters: { agentId, status, metadata },
          error: result.error,
          duration
        });

        return `❌ Failed to update agent: ${result.error}`;
      }

      // Audit successful update
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'update_agent',
        parameters: { agentId, status, metadata },
        result: result.data,
        duration
      });

      return `✅ **Agent Updated Successfully**

**Agent ID**: ${agentId}
${status ? `**New Status**: ${status}` : ''}
${metadata ? `**Metadata Updated**: Yes` : ''}

The agent has been updated via heartbeat.

📝 *This update has been logged for audit purposes.*`;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Audit error
      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'update_agent',
        parameters: { agentId, status, metadata },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return `❌ Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Trigger authentication verification for all agents
 */
export const triggerAgentVerifyTool = tool({
  description: 'Trigger authentication verification for all agents. Useful for checking subscription agent authentication status.',
  inputSchema: z.object({
    agentId: z.string().optional().describe('Optional: verify specific agent only (if not provided, verifies all agents)')
  }),
  execute: async ({ agentId }) => {
    const startTime = Date.now();

    try {
      if (agentId) {
        // Get specific agent with verification
        const result = await brokerRequest<{ agent: any }>(
          'GET',
          `/agents/${agentId}`
        );

        const duration = Date.now() - startTime;

        if (!result.success) {
          await auditToolCall({
            timestamp: new Date().toISOString(),
            toolName: 'trigger_agent_verify',
            parameters: { agentId },
            error: result.error,
            duration
          });

          return `❌ Failed to verify agent: ${result.error}`;
        }

        const agent = result.data?.agent;
        if (!agent) {
          return `❌ Agent not found: ${agentId}`;
        }

        await auditToolCall({
          timestamp: new Date().toISOString(),
          toolName: 'trigger_agent_verify',
          parameters: { agentId },
          result: { verified: 1 },
          duration
        });

        const authStatus = agent.health?.authenticated ? '✅ Authenticated' : '❌ Not authenticated';
        const expiry = agent.health?.authExpiresAt
          ? `Expires: ${new Date(agent.health.authExpiresAt).toLocaleString()}`
          : '';

        return `✅ **Agent Verification Complete**

**Agent ID**: ${agentId}
**Name**: ${agent.name}
**Auth Status**: ${authStatus}
${expiry ? `**${expiry}**` : ''}

📝 *Verification has been logged for audit purposes.*`;
      } else {
        // Verify all agents
        const result = await brokerRequest<{ agents: any[] }>(
          'GET',
          '/agents?verifyAuth=true'
        );

        const duration = Date.now() - startTime;

        if (!result.success) {
          await auditToolCall({
            timestamp: new Date().toISOString(),
            toolName: 'trigger_agent_verify',
            parameters: { verifyAll: true },
            error: result.error,
            duration
          });

          return `❌ Failed to verify agents: ${result.error}`;
        }

        const agents = result.data?.agents || [];
        const verified = agents.length;
        const authenticated = agents.filter(a => a.health?.authenticated).length;
        const needsAuth = verified - authenticated;

        await auditToolCall({
          timestamp: new Date().toISOString(),
          toolName: 'trigger_agent_verify',
          parameters: { verifyAll: true },
          result: { verified, authenticated, needsAuth },
          duration
        });

        let statusMsg = `✅ **All Agents Verified**

**Total Agents**: ${verified}
**Authenticated**: ${authenticated} ✅
**Need Authentication**: ${needsAuth} ⚠️`;

        if (needsAuth > 0) {
          const needsAuthList = agents
            .filter(a => !a.health?.authenticated)
            .map(a => `  - ${a.name} (${a.id})`)
            .join('\n');

          statusMsg += `\n\n**Agents Needing Authentication**:\n${needsAuthList}`;
        }

        statusMsg += `\n\n📝 *Verification has been logged for audit purposes.*`;

        return statusMsg;
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      await auditToolCall({
        timestamp: new Date().toISOString(),
        toolName: 'trigger_agent_verify',
        parameters: { agentId },
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return `❌ Failed to verify agents: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

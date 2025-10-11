/**
 * REST Broker Agent Tools
 *
 * Model-accessible tools that surface REST broker operations for agent lifecycle,
 * job control, health checks, and logs. Enables the assistant to perform agent
 * operations programmatically while maintaining security and auditability.
 */

import { tool } from './instrumentedTool';
import { z } from 'zod';

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
  description: 'Cancel a running or pending job. This is a destructive operation that should be used with caution.',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    jobId: z.string().describe('The ID of the job to cancel')
  }),
  execute: async ({ agentId, jobId }) => {
    const result = await brokerRequest<{ jobId: string; status: string; cancelled: boolean; message: string }>(
      'POST',
      `/agents/${agentId}/jobs/${jobId}/cancel`
    );

    if (!result.success) {
      return `❌ Failed to cancel job: ${result.error}`;
    }

    const { cancelled, message } = result.data || {};

    if (cancelled) {
      return `✅ **Job Cancelled**: ${jobId}\n\n${message}`;
    } else {
      return `⚠️ **Could not cancel job**: ${jobId}\n\n${message}`;
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

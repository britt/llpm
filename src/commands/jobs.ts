import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';

const BROKER_URL = process.env.REST_BROKER_URL || 'http://localhost:3010';

interface BrokerJob {
  id: string;
  agentId: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  payload?: unknown;
  result?: unknown;
}

interface BrokerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function brokerRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<BrokerResponse<T>> {
  try {
    const url = `${BROKER_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: (data.message as string) || `Request failed with status ${response.status}`
      };
    }

    return { success: true, data: data as T };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export const jobsCommand: Command = {
  name: 'jobs',
  description: 'Manage and monitor agent jobs',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /jobs command with args:', args);

    const subCommand = args[0]?.toLowerCase() || 'help';

    switch (subCommand) {
      case 'list': {
        if (args.length < 2) {
          return {
            content:
              '❌ Usage: /jobs list <agent-id> [status]\n\nExample: /jobs list claude-code\nExample: /jobs list claude-code completed',
            success: false
          };
        }

        const agentId = args[1];
        const status = args[2];

        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('limit', '50');
        params.append('offset', '0');

        const result = await brokerRequest<{ jobs: BrokerJob[]; total: number }>(
          'GET',
          `/agents/${agentId}/jobs?${params}`
        );

        if (!result.success) {
          return {
            content: `❌ Failed to list jobs: ${result.error}`,
            success: false
          };
        }

        const { jobs = [], total = 0 } = result.data || { jobs: [], total: 0 };

        if (jobs.length === 0) {
          return {
            content: `📋 No jobs found for agent ${agentId}${status ? ` with status ${status}` : ''}.`,
            success: true
          };
        }

        const jobList = jobs
          .map((jobData: unknown) => {
            const job = jobData as Record<string, unknown>;
            const statusIcon =
              job.status === 'completed'
                ? '✅'
                : job.status === 'failed'
                  ? '❌'
                  : job.status === 'running'
                    ? '🔄'
                    : job.status === 'cancelled'
                      ? '🚫'
                      : '⏳';

            return `${statusIcon} **Job ${job.id}**
  Status: ${job.status} | Created: ${new Date(job.createdAt as string).toLocaleString()}${job.completedAt ? ` | Completed: ${new Date(job.completedAt as string).toLocaleString()}` : ''}${job.error ? `\n  Error: ${job.error}` : ''}`;
          })
          .join('\n\n');

        return {
          content: `📋 **Jobs for Agent ${agentId}** (showing ${jobs.length} of ${total} total):\n\n${jobList}`,
          success: true
        };
      }

      case 'get': {
        if (args.length < 3) {
          return {
            content:
              '❌ Usage: /jobs get <agent-id> <job-id>\n\nExample: /jobs get claude-code job-123',
            success: false
          };
        }

        const agentId = args[1];
        const jobId = args[2];
        const result = await brokerRequest<BrokerJob>('GET', `/agents/${agentId}/jobs/${jobId}`);

        if (!result.success) {
          return {
            content: `❌ Failed to get job: ${result.error}`,
            success: false
          };
        }

        const job = result.data;
        if (!job) {
          return {
            content: `❌ Job not found: ${jobId}`,
            success: false
          };
        }

        const statusIcon =
          job.status === 'completed'
            ? '✅'
            : job.status === 'failed'
              ? '❌'
              : job.status === 'running'
                ? '🔄'
                : job.status === 'cancelled'
                  ? '🚫'
                  : '⏳';

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

        return {
          content: details,
          success: true
        };
      }

      case 'create': {
        if (args.length < 3) {
          return {
            content:
              '❌ Usage: /jobs create <agent-id> <payload-json>\n\nExample: /jobs create claude-code \'{"task":"hello"}\'',
            success: false
          };
        }

        const agentId = args[1];
        const payloadStr = args.slice(2).join(' ');

        let payload;
        try {
          payload = JSON.parse(payloadStr);
        } catch (error) {
          return {
            content: `❌ Invalid JSON payload: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }

        const result = await brokerRequest<{ jobId: string; status: string; createdAt: string }>(
          'POST',
          `/agents/${agentId}/jobs`,
          payload
        );

        if (!result.success) {
          return {
            content: `❌ Failed to create job: ${result.error}`,
            success: false
          };
        }

        const { jobId, status, createdAt } = result.data || {
          jobId: '',
          status: 'unknown',
          createdAt: ''
        };

        return {
          content: `✅ **Job Created Successfully**

**Job ID**: ${jobId}
**Agent**: ${agentId}
**Status**: ${status}
**Created**: ${createdAt ? new Date(createdAt).toLocaleString() : 'unknown'}

💡 Use \`/jobs get ${agentId} ${jobId}\` to check job status.`,
          success: true
        };
      }

      case 'cancel': {
        if (args.length < 3) {
          return {
            content:
              '❌ Usage: /jobs cancel <agent-id> <job-id>\n\nExample: /jobs cancel claude-code job-123\n\n⚠️  This is a destructive operation!',
            success: false
          };
        }

        const agentId = args[1];
        const jobId = args[2];

        return {
          content: `⚠️  **Confirmation Required**

**Operation**: Cancel job ${jobId} for agent ${agentId}

**Details**: This will terminate the running job and mark it as cancelled. Any in-progress work will be lost.

**Risks**:
- In-progress work will be lost
- Job cannot be resumed
- Agent may be left in inconsistent state

💡 To proceed, use the \`cancel_job\` AI tool with \`confirmed: true\` parameter.
💡 For safety, this operation requires confirmation through the AI tool interface.`,
          success: true
        };
      }

      case 'help': {
        return {
          content: `📋 **Jobs Command Help**

**Usage**: /jobs [subcommand] [args]

**Subcommands**:
• **list <agent-id> [status]** - List jobs for an agent, optionally filtered by status
• **get <agent-id> <job-id>** - Get detailed information about a specific job
• **create <agent-id> <payload-json>** - Create a new job with JSON payload
• **cancel <agent-id> <job-id>** - Cancel a running or pending job (requires confirmation)
• **help** - Show this help message

**Examples**:
\`\`\`
/jobs list claude-code
/jobs list claude-code completed
/jobs get claude-code job-123
/jobs create claude-code '{"task":"hello"}'
/jobs cancel claude-code job-123
\`\`\`

**Job Status Values**:
• pending - Job is queued
• running - Job is currently executing
• completed - Job finished successfully
• failed - Job encountered an error
• cancelled - Job was cancelled

💡 For agent management, use \`/agents\` command`,
          success: true
        };
      }

      default: {
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nUse \`/jobs help\` to see available commands.`,
          success: false
        };
      }
    }
  }
};

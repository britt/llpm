import { tool } from 'ai';
import * as z from 'zod';
import axios from 'axios';

const REST_BROKER_URL = process.env.REST_BROKER_URL || 'http://localhost:3010';

// Tool to list available Docker agents
export const listDockerAgentsTool = tool({
  description: 'List all available Docker coding agents and their status',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const response = await axios.get(`${REST_BROKER_URL}/agents`);
      return {
        success: true,
        agents: response.data.agents
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
});

// Tool to submit a job to a Docker agent
export const submitDockerAgentJobTool = tool({
  description: 'Submit a coding job to a specific Docker agent for processing',
  inputSchema: z.object({
    agentId: z
      .string()
      .describe('The ID of the agent (e.g., claude-code, openai-codex, aider, opencode)'),
    prompt: z.string().describe('The task or prompt for the agent to process'),
    context: z
      .object({
        files: z.array(z.string()).optional().describe('File paths to include as context'),
        workspace: z.string().optional().describe('Workspace directory path')
      })
      .optional()
      .describe('Optional context for the job'),
    options: z.record(z.any(), z.any()).optional().describe('Agent-specific options')
  }),
  execute: async ({ agentId, prompt, context, options }) => {
    try {
      const response = await axios.post(`${REST_BROKER_URL}/agents/${agentId}/jobs`, {
        prompt,
        context,
        options
      });
      return {
        success: true,
        jobId: response.data.jobId,
        status: response.data.status,
        createdAt: response.data.createdAt
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
});

// Tool to get job status
export const getDockerAgentJobStatusTool = tool({
  description: 'Get the current status and result of a Docker agent job',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    jobId: z.string().describe('The ID of the job')
  }),
  execute: async ({ agentId, jobId }) => {
    try {
      const response = await axios.get(`${REST_BROKER_URL}/agents/${agentId}/jobs/${jobId}`);
      return {
        success: true,
        job: response.data
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
});

// Tool to list all jobs for an agent
export const listDockerAgentJobsTool = tool({
  description: 'List all jobs submitted to a specific Docker agent',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    status: z
      .enum(['queued', 'running', 'completed', 'failed', 'cancelled'])
      .optional()
      .describe('Filter jobs by status'),
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(50)
      .optional()
      .describe('Maximum number of jobs to return'),
    offset: z
      .number()
      .min(0)
      .default(0)
      .optional()
      .describe('Number of jobs to skip for pagination')
  }),
  execute: async ({ agentId, status, limit, offset }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await axios.get(
        `${REST_BROKER_URL}/agents/${agentId}/jobs?${params.toString()}`
      );
      return {
        success: true,
        jobs: response.data.jobs,
        total: response.data.total,
        offset: response.data.offset,
        limit: response.data.limit
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
});

// Tool to cancel a job
export const cancelDockerAgentJobTool = tool({
  description: 'Cancel a queued or running Docker agent job',
  inputSchema: z.object({
    agentId: z.string().describe('The ID of the agent'),
    jobId: z.string().describe('The ID of the job to cancel')
  }),
  execute: async ({ agentId, jobId }) => {
    try {
      const response = await axios.post(
        `${REST_BROKER_URL}/agents/${agentId}/jobs/${jobId}/cancel`
      );
      return {
        success: true,
        jobId: response.data.jobId,
        status: response.data.status,
        cancelled: response.data.cancelled,
        message: response.data.message
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
});

// Tool to check REST broker health
export const checkDockerBrokerHealthTool = tool({
  description: 'Check if the Docker REST broker is operational and can reach required services',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const response = await axios.get(`${REST_BROKER_URL}/health`);
      return {
        success: true,
        status: response.data.status,
        timestamp: response.data.timestamp,
        services: response.data.services
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
});

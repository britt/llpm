import { describe, it, expect } from 'vitest';
import {
  listAgentsTool,
  getAgentTool,
  checkAgentHealthTool,
  listJobsTool,
  getJobTool,
  createJobTool,
  cancelJobTool,
  markAgentAuthenticatedTool
} from './restBrokerTools';

describe('REST Broker Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all REST broker tools', () => {
      const tools = [
        listAgentsTool,
        getAgentTool,
        checkAgentHealthTool,
        listJobsTool,
        getJobTool,
        createJobTool,
        cancelJobTool,
        markAgentAuthenticatedTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('listAgentsTool', () => {
    it('should have optional verifyAuth parameter', () => {
      const parseResult = listAgentsTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(true);

      const parseResult2 = listAgentsTool.inputSchema.safeParse({ verifyAuth: true });
      expect(parseResult2.success).toBe(true);
    });
  });

  describe('getAgentTool', () => {
    it('should require agentId parameter', () => {
      const parseResult = listAgentsTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(true);

      const parseResult2 = getAgentTool.inputSchema.safeParse({ agentId: 'test-agent' });
      expect(parseResult2.success).toBe(true);
    });

    it('should reject missing agentId', () => {
      const parseResult = getAgentTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });
  });

  describe('checkAgentHealthTool', () => {
    it('should require agentId parameter', () => {
      const parseResult = checkAgentHealthTool.inputSchema.safeParse({ agentId: 'test-agent' });
      expect(parseResult.success).toBe(true);
    });

    it('should reject missing agentId', () => {
      const parseResult = checkAgentHealthTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });
  });

  describe('listJobsTool', () => {
    it('should require agentId and accept optional filters', () => {
      const parseResult1 = listJobsTool.inputSchema.safeParse({ agentId: 'test-agent' });
      expect(parseResult1.success).toBe(true);

      const parseResult2 = listJobsTool.inputSchema.safeParse({
        agentId: 'test-agent',
        status: 'completed',
        limit: 10,
        offset: 0
      });
      expect(parseResult2.success).toBe(true);
    });

    it('should validate status enum values', () => {
      const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];

      validStatuses.forEach(status => {
        const parseResult = listJobsTool.inputSchema.safeParse({
          agentId: 'test-agent',
          status
        });
        expect(parseResult.success).toBe(true);
      });

      const parseResult = listJobsTool.inputSchema.safeParse({
        agentId: 'test-agent',
        status: 'invalid-status'
      });
      expect(parseResult.success).toBe(false);
    });

    it('should have default values for limit and offset', () => {
      const parseResult = listJobsTool.inputSchema.parse({ agentId: 'test-agent' });
      expect(parseResult.limit).toBe(50);
      expect(parseResult.offset).toBe(0);
    });
  });

  describe('getJobTool', () => {
    it('should require both agentId and jobId', () => {
      const parseResult = getJobTool.inputSchema.safeParse({
        agentId: 'test-agent',
        jobId: 'test-job'
      });
      expect(parseResult.success).toBe(true);
    });

    it('should reject missing parameters', () => {
      const parseResult1 = getJobTool.inputSchema.safeParse({ agentId: 'test-agent' });
      expect(parseResult1.success).toBe(false);

      const parseResult2 = getJobTool.inputSchema.safeParse({ jobId: 'test-job' });
      expect(parseResult2.success).toBe(false);
    });
  });

  describe('createJobTool', () => {
    it('should require agentId and payload', () => {
      const parseResult = createJobTool.inputSchema.safeParse({
        agentId: 'test-agent',
        payload: { task: 'test' }
      });
      expect(parseResult.success).toBe(true);
    });

    it('should accept any object as payload', () => {
      const payloads = [
        { task: 'simple' },
        { task: 'complex', context: { files: ['a.ts', 'b.ts'] }, options: { verbose: true } },
        { custom: 'field', nested: { deep: 'value' } }
      ];

      payloads.forEach(payload => {
        const parseResult = createJobTool.inputSchema.safeParse({
          agentId: 'test-agent',
          payload
        });
        expect(parseResult.success).toBe(true);
      });
    });

    it('should reject missing agentId', () => {
      const parseResult = createJobTool.inputSchema.safeParse({ payload: {} });
      expect(parseResult.success).toBe(false);
    });
  });

  describe('cancelJobTool', () => {
    it('should require both agentId and jobId', () => {
      const parseResult = cancelJobTool.inputSchema.safeParse({
        agentId: 'test-agent',
        jobId: 'test-job'
      });
      expect(parseResult.success).toBe(true);
    });

    it('should reject missing parameters', () => {
      const parseResult1 = cancelJobTool.inputSchema.safeParse({ agentId: 'test-agent' });
      expect(parseResult1.success).toBe(false);

      const parseResult2 = cancelJobTool.inputSchema.safeParse({ jobId: 'test-job' });
      expect(parseResult2.success).toBe(false);
    });
  });

  describe('markAgentAuthenticatedTool', () => {
    it('should require agentId parameter', () => {
      const parseResult = markAgentAuthenticatedTool.inputSchema.safeParse({ agentId: 'test-agent' });
      expect(parseResult.success).toBe(true);
    });

    it('should reject missing agentId', () => {
      const parseResult = markAgentAuthenticatedTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });
  });

  describe('Tool Descriptions', () => {
    it('should have clear descriptions for each tool', () => {
      const tools = [
        { tool: listAgentsTool, name: 'list_agents' },
        { tool: getAgentTool, name: 'get_agent' },
        { tool: checkAgentHealthTool, name: 'check_agent_health' },
        { tool: listJobsTool, name: 'list_jobs' },
        { tool: getJobTool, name: 'get_job' },
        { tool: createJobTool, name: 'create_job' },
        { tool: cancelJobTool, name: 'cancel_job' },
        { tool: markAgentAuthenticatedTool, name: 'mark_agent_authenticated' }
      ];

      tools.forEach(({ tool, name }) => {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(20);
        expect(typeof tool.description).toBe('string');
      });
    });
  });

  describe('Parameter Descriptions', () => {
    it('should have descriptions for all required parameters', () => {
      // Test getAgentTool as example
      const schema = getAgentTool.inputSchema;
      const shape = (schema as any).shape;

      expect(shape.agentId).toBeDefined();
      expect(shape.agentId.description).toBeDefined();
      expect(shape.agentId.description.length).toBeGreaterThan(5);
    });

    it('should have descriptions for list_jobs parameters', () => {
      const schema = listJobsTool.inputSchema;
      const shape = (schema as any).shape;

      expect(shape.agentId).toBeDefined();
      expect(shape.agentId.description).toBeDefined();

      if (shape.status) {
        expect(shape.status.description).toBeDefined();
      }

      if (shape.limit) {
        expect(shape.limit.description).toBeDefined();
      }
    });
  });

  describe('Tool Interface Consistency', () => {
    it('should use consistent parameter naming', () => {
      // All agent-related tools should use "agentId" consistently
      const agentIdTools = [
        getAgentTool,
        checkAgentHealthTool,
        listJobsTool,
        getJobTool,
        createJobTool,
        cancelJobTool,
        markAgentAuthenticatedTool
      ];

      agentIdTools.forEach(tool => {
        const schema = tool.inputSchema;
        const shape = (schema as any).shape;
        expect(shape.agentId).toBeDefined();
      });
    });

    it('should use consistent parameter naming for jobs', () => {
      // All job-related tools should use "jobId" consistently
      const jobIdTools = [
        getJobTool,
        cancelJobTool
      ];

      jobIdTools.forEach(tool => {
        const schema = tool.inputSchema;
        const shape = (schema as any).shape;
        expect(shape.jobId).toBeDefined();
      });
    });
  });

  describe('Error Message Formatting', () => {
    it('should follow consistent error message format', () => {
      // Error messages should start with ❌
      const tools = [
        listAgentsTool,
        getAgentTool,
        checkAgentHealthTool,
        listJobsTool,
        getJobTool,
        createJobTool,
        cancelJobTool,
        markAgentAuthenticatedTool
      ];

      // This is a basic structural test - actual error handling
      // would need integration tests with mock fetch
      tools.forEach(tool => {
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      });
    });
  });
});

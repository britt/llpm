import { describe, it, expect } from 'vitest';
import {
  listDockerAgentsTool,
  submitDockerAgentJobTool,
  getDockerAgentJobStatusTool,
  listDockerAgentJobsTool,
  cancelDockerAgentJobTool,
  checkDockerBrokerHealthTool
} from './dockerAgentTools';

describe('Docker Agent Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all Docker agent tools', () => {
      const tools = [
        listDockerAgentsTool,
        submitDockerAgentJobTool,
        getDockerAgentJobStatusTool,
        listDockerAgentJobsTool,
        cancelDockerAgentJobTool,
        checkDockerBrokerHealthTool
      ];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.toString).not.toThrow();
      });
    });
  });
});

import { describe, it, expect } from 'vitest';
import { listGitHubReposTool, searchGitHubReposTool, getGitHubRepoTool } from './githubTools';

describe('GitHub Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all GitHub tools', () => {
      const tools = [listGitHubReposTool, searchGitHubReposTool, getGitHubRepoTool];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  createGitHubPullRequestTool,
  listGitHubPullRequestsTool
} from './githubPullRequestTools';

describe('GitHub Pull Request Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all GitHub pull request tools', () => {
      const tools = [
        createGitHubPullRequestTool,
        listGitHubPullRequestsTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.toString).not.toThrow();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});

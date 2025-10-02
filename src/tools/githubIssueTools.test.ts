import { describe, it, expect } from 'vitest';
import {
  createGitHubIssueTool,
  listGitHubIssuesTool,
  updateGitHubIssueTool,
  commentOnGitHubIssueTool,
  searchGitHubIssuesTool
} from './githubIssueTools';

describe('GitHub Issue Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all GitHub issue tools', () => {
      const tools = [
        createGitHubIssueTool,
        listGitHubIssuesTool,
        updateGitHubIssueTool,
        commentOnGitHubIssueTool,
        searchGitHubIssuesTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});

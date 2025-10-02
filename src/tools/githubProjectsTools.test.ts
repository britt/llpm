import { describe, it, expect } from 'vitest';
import {
  listGitHubProjectsV2Tool,
  createGitHubProjectV2Tool,
  getGitHubProjectV2Tool,
  updateGitHubProjectV2Tool,
  deleteGitHubProjectV2Tool,
  listGitHubProjectV2ItemsTool,
  addGitHubProjectV2ItemTool,
  removeGitHubProjectV2ItemTool,
  listGitHubProjectV2FieldsTool,
  getGitHubOwnerIdTool,
  getGitHubIssueNodeIdTool,
  updateGitHubProjectV2ItemFieldValueTool
} from './githubProjectsTools';

describe('GitHub Projects Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all GitHub projects tools', () => {
      const tools = [
        listGitHubProjectsV2Tool,
        createGitHubProjectV2Tool,
        getGitHubProjectV2Tool,
        updateGitHubProjectV2Tool,
        deleteGitHubProjectV2Tool,
        listGitHubProjectV2ItemsTool,
        addGitHubProjectV2ItemTool,
        removeGitHubProjectV2ItemTool,
        listGitHubProjectV2FieldsTool,
        getGitHubOwnerIdTool,
        getGitHubIssueNodeIdTool,
        updateGitHubProjectV2ItemFieldValueTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});

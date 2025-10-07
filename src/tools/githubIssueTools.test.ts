import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SALUTATION } from '../utils/salutation';

// Mock the dependencies
vi.mock('../utils/projectConfig');
vi.mock('../services/github');
vi.mock('../services/projectBoardIntegration');
vi.mock('../services/githubAssets');

// Import after mocking
import {
  createGitHubIssueTool,
  listGitHubIssuesTool,
  updateGitHubIssueTool,
  commentOnGitHubIssueTool,
  searchGitHubIssuesTool
} from './githubIssueTools';

import * as projectConfig from '../utils/projectConfig';
import * as github from '../services/github';
import * as projectBoardIntegration from '../services/projectBoardIntegration';
import * as githubAssets from '../services/githubAssets';

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

  describe('Salutation Integration', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      vi.clearAllMocks();
    });

    it('should prepend salutation to issue body when creating issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project'
      });

      vi.mocked(github.createIssue).mockResolvedValue({
        number: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'open',
        node_id: 'node-1'
      } as any);

      vi.mocked(projectBoardIntegration.autoAddToProjectBoard).mockResolvedValue({ success: true });

      const result = await createGitHubIssueTool.execute({
        title: 'Test Issue',
        body: 'This is a test issue body.'
      });

      expect(github.createIssue).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test Issue',
        `${DEFAULT_SALUTATION}\n\nThis is a test issue body.`,
        undefined
      );
      expect(result.success).toBe(true);
    });

    it('should prepend salutation to comment body when commenting on issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project'
      });

      vi.mocked(github.commentOnIssue).mockResolvedValue({
        id: 123,
        html_url: 'https://github.com/owner/repo/issues/1#issuecomment-123',
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await commentOnGitHubIssueTool.execute({
        issueNumber: 1,
        body: 'This is a test comment.'
      });

      expect(vi.mocked(github.commentOnIssue)).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        `${DEFAULT_SALUTATION}\n\nThis is a test comment.`
      );
      expect(result.success).toBe(true);
    });

    it('should respect disabled salutation config when creating issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: {
          salutation: {
            enabled: false
          }
        }
      });

      vi.mocked(github.createIssue).mockResolvedValue({
        number: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'open',
        node_id: 'node-1'
      } as any);

      vi.mocked(projectBoardIntegration.autoAddToProjectBoard).mockResolvedValue({ success: true });

      const result = await createGitHubIssueTool.execute({
        title: 'Test Issue',
        body: 'This is a test issue body.'
      });

      // Should NOT have salutation when disabled
      expect(vi.mocked(github.createIssue)).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test Issue',
        'This is a test issue body.',
        undefined
      );
      expect(result.success).toBe(true);
    });

    it('should use custom salutation text from config when creating issue', async () => {
      const customSalutation = '🎉 Custom Bot';

      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: {
          salutation: {
            enabled: true,
            text: customSalutation
          }
        }
      });

      vi.mocked(github.createIssue).mockResolvedValue({
        number: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'open',
        node_id: 'node-1'
      } as any);

      vi.mocked(projectBoardIntegration.autoAddToProjectBoard).mockResolvedValue({ success: true });

      const result = await createGitHubIssueTool.execute({
        title: 'Test Issue',
        body: 'This is a test issue body.'
      });

      expect(vi.mocked(github.createIssue)).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test Issue',
        `${customSalutation}\n\nThis is a test issue body.`,
        undefined
      );
      expect(result.success).toBe(true);
    });
  });
});

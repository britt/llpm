import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SALUTATION } from '../utils/salutation';

// Mock the dependencies
vi.mock('../utils/projectConfig');
vi.mock('../services/github');
vi.mock('../services/githubAssets');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

// Import after mocking
import {
  createGitHubIssueTool,
  listGitHubIssuesTool,
  updateGitHubIssueTool,
  commentOnGitHubIssueTool,
  searchGitHubIssuesTool,
  getGitHubIssueWithCommentsTool
} from './githubIssueTools';

import * as projectConfig from '../utils/projectConfig';
import * as github from '../services/github';
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

  describe('listGitHubIssuesTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should list issues successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.listIssues).mockResolvedValue([
        {
          number: 1,
          title: 'Issue 1',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/1',
          labels: [{ name: 'bug' }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          number: 2,
          title: 'Issue 2',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/2',
          labels: [],
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ] as any);

      const result = await listGitHubIssuesTool.execute({
        state: 'open',
        limit: 30
      });

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].number).toBe(1);
    });

    it('should handle errors when listing issues', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.listIssues).mockRejectedValue(new Error('API error'));

      const result = await listGitHubIssuesTool.execute({
        state: 'open',
        limit: 30
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('updateGitHubIssueTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should update an issue successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.updateIssue).mockResolvedValue({
        number: 1,
        title: 'Updated Title',
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'closed'
      } as any);

      const result = await updateGitHubIssueTool.execute({
        issueNumber: 1,
        title: 'Updated Title',
        state: 'closed'
      });

      expect(result.success).toBe(true);
      expect(result.issue.title).toBe('Updated Title');
      expect(result.issue.state).toBe('closed');
    });

    it('should handle errors when updating issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.updateIssue).mockRejectedValue(new Error('Update failed'));

      const result = await updateGitHubIssueTool.execute({
        issueNumber: 1,
        title: 'New Title'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('searchGitHubIssuesTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should search issues successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.searchIssues).mockResolvedValue([
        {
          number: 1,
          title: 'Bug Issue',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/1',
          labels: [{ name: 'bug' }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ] as any);

      const result = await searchGitHubIssuesTool.execute({
        query: 'bug',
        state: 'open',
        limit: 30
      });

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.message).toContain('bug');
    });

    it('should handle errors when searching issues', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.searchIssues).mockRejectedValue(new Error('Search failed'));

      const result = await searchGitHubIssuesTool.execute({
        query: 'bug',
        state: 'all',
        limit: 30
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
    });
  });

  describe('getGitHubIssueWithCommentsTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should get issue with comments successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockResolvedValue({
        issue: {
          number: 1,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/owner/repo/issues/1',
          user: { login: 'testuser' },
          labels: [{ name: 'bug' }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        comments: [
          {
            id: 1,
            body: 'First comment',
            user: { login: 'commenter' },
            html_url: 'https://github.com/owner/repo/issues/1#issuecomment-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          per_page: 100,
          total: 1,
          has_next_page: false
        }
      } as any);

      const result = await getGitHubIssueWithCommentsTool.execute({
        issueNumber: 1,
        includeComments: true,
        commentsPerPage: 100,
        page: 1
      });

      expect(result.success).toBe(true);
      expect(result.issue.number).toBe(1);
      expect(result.comments).toHaveLength(1);
      expect(result.pagination.has_next_page).toBe(false);
    });

    it('should handle errors when fetching issue', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'owner/repo',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(github.getIssueWithComments).mockRejectedValue(new Error('Issue not found'));

      const result = await getGitHubIssueWithCommentsTool.execute({
        issueNumber: 999,
        includeComments: true,
        commentsPerPage: 100,
        page: 1
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue not found');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return error when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await createGitHubIssueTool.execute({
        title: 'Test Issue',
        body: 'Test body'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active project');
    });

    it('should return error when project has no github_repo', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: undefined,
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      } as any);

      const result = await listGitHubIssuesTool.execute({
        state: 'open',
        limit: 30
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active project');
    });

    it('should return error for invalid repo format', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        github_repo: 'invalid-format',
        path: '/test',
        repository: 'https://github.com/owner/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await updateGitHubIssueTool.execute({
        issueNumber: 1,
        title: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid GitHub repository format');
    });
  });

  describe('File Attachments', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle file attachments when creating issue', async () => {
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
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(githubAssets.uploadFilesToGitHub).mockResolvedValue([
        { filename: 'test.png', markdown: '![test](https://example.com/test.png)', gistUrl: 'https://gist.github.com/1' }
      ]);

      vi.mocked(github.createIssue).mockResolvedValue({
        number: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'open',
        node_id: 'node-1'
      } as any);

      const result = await createGitHubIssueTool.execute({
        title: 'Test Issue',
        body: 'Test body',
        attachments: ['/path/to/test.png']
      });

      expect(result.success).toBe(true);
      expect(githubAssets.uploadFilesToGitHub).toHaveBeenCalledWith(['/path/to/test.png']);
    });

    it('should handle attachment upload failure gracefully', async () => {
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
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(githubAssets.uploadFilesToGitHub).mockRejectedValue(new Error('Upload failed'));

      vi.mocked(github.createIssue).mockResolvedValue({
        number: 1,
        title: 'Test Issue',
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'open',
        node_id: 'node-1'
      } as any);

      const result = await createGitHubIssueTool.execute({
        title: 'Test Issue',
        body: 'Test body',
        attachments: ['/path/to/test.png']
      });

      // Should still succeed, but body should note the failed upload
      expect(result.success).toBe(true);
      expect(github.createIssue).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test Issue',
        expect.stringContaining('Some file attachments failed'),
        undefined
      );
    });

    it('should handle file attachments when commenting on issue', async () => {
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
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(githubAssets.uploadFilesToGitHub).mockResolvedValue([
        { filename: 'log.txt', markdown: '[log.txt](https://example.com/log.txt)', gistUrl: 'https://gist.github.com/1' }
      ]);

      vi.mocked(github.commentOnIssue).mockResolvedValue({
        id: 123,
        html_url: 'https://github.com/owner/repo/issues/1#issuecomment-123',
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await commentOnGitHubIssueTool.execute({
        issueNumber: 1,
        body: 'Here are the logs',
        attachments: ['/path/to/log.txt']
      });

      expect(result.success).toBe(true);
      expect(githubAssets.uploadFilesToGitHub).toHaveBeenCalledWith(['/path/to/log.txt']);
    });
  });
});

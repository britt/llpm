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
  createGitHubPullRequestTool,
  listGitHubPullRequestsTool
} from './githubPullRequestTools';

import * as projectConfig from '../utils/projectConfig';
import * as github from '../services/github';
import * as githubAssets from '../services/githubAssets';

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

  describe('Salutation Integration', () => {
    beforeEach(() => {
      vi.mocked(projectConfig.loadProjectConfig).mockReset();
      vi.mocked(github.createPullRequest).mockReset();
    });

    it('should prepend salutation to PR body when creating pull request', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project'
      });

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'Test PR',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        head: 'feature-branch',
        base: 'main',
        body: 'This is a test PR body.'
      });

      expect(vi.mocked(github.createPullRequest)).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test PR',
        'feature-branch',
        'main',
        `${DEFAULT_SALUTATION}\n\nThis is a test PR body.`,
        false
      );
      expect(result.success).toBe(true);
    });

    it('should respect disabled salutation config when creating PR', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: {
          salutation: {
            enabled: false
          }
        }
      });

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'Test PR',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        head: 'feature-branch',
        base: 'main',
        body: 'This is a test PR body.'
      });

      // Should NOT have salutation when disabled
      expect(vi.mocked(github.createPullRequest)).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test PR',
        'feature-branch',
        'main',
        'This is a test PR body.',
        false
      );
      expect(result.success).toBe(true);
    });

    it('should use custom salutation text from config when creating PR', async () => {
      const customSalutation = '🎉 Custom Bot';

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

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'Test PR',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        head: 'feature-branch',
        base: 'main',
        body: 'This is a test PR body.'
      });

      expect(vi.mocked(github.createPullRequest)).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Test PR',
        'feature-branch',
        'main',
        `${customSalutation}\n\nThis is a test PR body.`,
        false
      );
      expect(result.success).toBe(true);
    });
  });

  describe('listGitHubPullRequestsTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should list pull requests successfully', async () => {
      vi.mocked(github.listPullRequests).mockResolvedValue([
        {
          number: 1,
          title: 'PR 1',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/1',
          user: { login: 'user1' },
          head: { ref: 'feature-1' },
          base: { ref: 'main' },
          draft: false,
          mergeable: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          merged_at: null
        },
        {
          number: 2,
          title: 'PR 2',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/2',
          user: { login: 'user2' },
          head: { ref: 'feature-2' },
          base: { ref: 'main' },
          draft: true,
          mergeable: null,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
          merged_at: null
        }
      ] as any);

      const result = await listGitHubPullRequestsTool.execute({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        limit: 30
      });

      expect(result.success).toBe(true);
      expect(result.pull_requests).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.repository).toBe('owner/repo');
    });

    it('should handle errors when listing pull requests', async () => {
      vi.mocked(github.listPullRequests).mockRejectedValue(new Error('API error'));

      const result = await listGitHubPullRequestsTool.execute({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        limit: 30
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should limit results to specified limit', async () => {
      const manyPRs = Array(50).fill(null).map((_, i) => ({
        number: i + 1,
        title: `PR ${i + 1}`,
        state: 'open',
        html_url: `https://github.com/owner/repo/pull/${i + 1}`,
        user: { login: 'user' },
        head: { ref: `feature-${i + 1}` },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        merged_at: null
      }));

      vi.mocked(github.listPullRequests).mockResolvedValue(manyPRs as any);

      const result = await listGitHubPullRequestsTool.execute({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.pull_requests).toHaveLength(10);
    });

    it('should filter by head branch', async () => {
      vi.mocked(github.listPullRequests).mockResolvedValue([]);

      await listGitHubPullRequestsTool.execute({
        owner: 'owner',
        repo: 'repo',
        head: 'myuser:feature-branch',
        limit: 30
      });

      expect(github.listPullRequests).toHaveBeenCalledWith(
        'owner',
        'repo',
        expect.objectContaining({
          head: 'myuser:feature-branch'
        })
      );
    });

    it('should filter by base branch', async () => {
      vi.mocked(github.listPullRequests).mockResolvedValue([]);

      await listGitHubPullRequestsTool.execute({
        owner: 'owner',
        repo: 'repo',
        base: 'develop',
        limit: 30
      });

      expect(github.listPullRequests).toHaveBeenCalledWith(
        'owner',
        'repo',
        expect.objectContaining({
          base: 'develop'
        })
      );
    });
  });

  describe('createGitHubPullRequestTool', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create a draft pull request', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'Draft PR',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: true,
        mergeable: null,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'Draft PR',
        head: 'feature-branch',
        base: 'main',
        body: 'Work in progress',
        draft: true
      });

      expect(result.success).toBe(true);
      expect(result.pull_request.draft).toBe(true);
      expect(github.createPullRequest).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Draft PR',
        'feature-branch',
        'main',
        'Work in progress',
        true
      );
    });

    it('should handle errors when creating pull request', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project'
      });

      vi.mocked(github.createPullRequest).mockRejectedValue(new Error('Branch not found'));

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'Test PR',
        head: 'nonexistent-branch',
        base: 'main'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Branch not found');
    });

    it('should handle file attachments', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(githubAssets.uploadFilesToGitHub).mockResolvedValue([
        { filename: 'screenshot.png', markdown: '![screenshot](https://example.com/screenshot.png)', gistUrl: 'https://gist.github.com/1' }
      ]);

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'PR with attachments',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'PR with attachments',
        head: 'feature-branch',
        base: 'main',
        body: 'Here are my changes',
        attachments: ['/path/to/screenshot.png']
      });

      expect(result.success).toBe(true);
      expect(githubAssets.uploadFilesToGitHub).toHaveBeenCalledWith(['/path/to/screenshot.png']);
    });

    it('should handle attachment upload failure gracefully', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(githubAssets.uploadFilesToGitHub).mockRejectedValue(new Error('Upload failed'));

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'PR with failed attachments',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'PR with failed attachments',
        head: 'feature-branch',
        base: 'main',
        body: 'Here are my changes',
        attachments: ['/path/to/screenshot.png']
      });

      // Should still succeed, but body should note the failed upload
      expect(result.success).toBe(true);
      expect(github.createPullRequest).toHaveBeenCalledWith(
        'owner',
        'repo',
        'PR with failed attachments',
        'feature-branch',
        'main',
        expect.stringContaining('Some file attachments failed'),
        false
      );
    });

    it('should create PR without body', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        projects: {},
        currentProject: 'test-project',
        automation: { salutation: { enabled: false } }
      });

      vi.mocked(github.createPullRequest).mockResolvedValue({
        number: 1,
        title: 'Simple PR',
        html_url: 'https://github.com/owner/repo/pull/1',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch' },
        base: { ref: 'main' },
        draft: false,
        mergeable: true,
        created_at: '2024-01-01T00:00:00Z'
      } as any);

      const result = await createGitHubPullRequestTool.execute({
        owner: 'owner',
        repo: 'repo',
        title: 'Simple PR',
        head: 'feature-branch',
        base: 'main'
      });

      expect(result.success).toBe(true);
      expect(github.createPullRequest).toHaveBeenCalledWith(
        'owner',
        'repo',
        'Simple PR',
        'feature-branch',
        'main',
        '',
        false
      );
    });
  });
});

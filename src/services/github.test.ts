import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      listForAuthenticatedUser: vi.fn(),
      get: vi.fn()
    },
    search: {
      repos: vi.fn(),
      issues: vi.fn()
    },
    issues: {
      create: vi.fn(),
      listForRepo: vi.fn(),
      update: vi.fn(),
      createComment: vi.fn(),
      get: vi.fn(),
      listComments: vi.fn()
    },
    pulls: {
      list: vi.fn(),
      create: vi.fn()
    }
  }
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => mockOctokit)
}));

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  getVerbose: vi.fn().mockReturnValue(false)
}));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: vi.fn()
  };
});

vi.mock('./githubCli', () => ({
  getUserReposViaGhCli: vi.fn(),
  searchReposViaGhCli: vi.fn(),
  getRepoViaGhCli: vi.fn()
}));

vi.mock('../utils/credentialManager', () => ({
  credentialManager: {
    getGitHubToken: vi.fn().mockResolvedValue('test-token')
  }
}));

vi.mock('../utils/tracing', () => ({
  traced: vi.fn((_name, _options, fn) => {
    const mockSpan = {
      setAttribute: vi.fn()
    };
    return fn(mockSpan);
  })
}));

vi.mock('@opentelemetry/api', () => ({
  SpanKind: { CLIENT: 1 }
}));

import {
  getUserRepos,
  getRepo,
  searchRepos,
  createIssue,
  listIssues,
  updateIssue,
  commentOnIssue,
  getIssueWithComments,
  searchIssues,
  listPullRequests,
  createPullRequest
} from './github';
import { execSync } from 'child_process';
import * as githubCli from './githubCli';

describe('GitHub Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRepos', () => {
    it('should fetch user repositories successfully', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'repo1',
            full_name: 'user/repo1',
            description: 'Test repo 1',
            html_url: 'https://github.com/user/repo1',
            clone_url: 'https://github.com/user/repo1.git',
            ssh_url: 'git@github.com:user/repo1.git',
            private: false,
            language: 'TypeScript',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      });

      const repos = await getUserRepos();

      expect(repos).toHaveLength(1);
      expect(repos[0].name).toBe('repo1');
      expect(repos[0].language).toBe('TypeScript');
    });

    it('should use default options', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({ data: [] });

      await getUserRepos();

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        type: 'owner',
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      });
    });

    it('should use custom options', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({ data: [] });

      await getUserRepos({
        type: 'private',
        sort: 'created',
        direction: 'asc',
        per_page: 50
      });

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        type: 'private',
        sort: 'created',
        direction: 'asc',
        per_page: 50
      });
    });

    it('should fallback to gh CLI on error', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(new Error('API error'));
      vi.mocked(githubCli.getUserReposViaGhCli).mockResolvedValue([
        { id: 1, name: 'repo1', full_name: 'user/repo1' } as any
      ]);

      const repos = await getUserRepos();

      expect(repos).toHaveLength(1);
      expect(githubCli.getUserReposViaGhCli).toHaveBeenCalled();
    });

    it('should throw error when both API and CLI fail', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(new Error('API error'));
      vi.mocked(githubCli.getUserReposViaGhCli).mockRejectedValue(new Error('CLI error'));

      await expect(getUserRepos()).rejects.toThrow('Failed to retrieve GitHub repositories');
    });

    it('should handle non-Error thrown from both API and CLI', async () => {
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue('String error');
      vi.mocked(githubCli.getUserReposViaGhCli).mockRejectedValue('CLI string error');

      await expect(getUserRepos()).rejects.toThrow('Failed to retrieve GitHub repositories: Unknown error');
    });
  });

  describe('getRepo', () => {
    it('should fetch a specific repository', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          id: 1,
          name: 'repo1',
          full_name: 'user/repo1',
          description: 'Test repo',
          html_url: 'https://github.com/user/repo1',
          clone_url: 'https://github.com/user/repo1.git',
          ssh_url: 'git@github.com:user/repo1.git',
          private: false,
          language: 'TypeScript',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const repo = await getRepo('user', 'repo1');

      expect(repo.name).toBe('repo1');
      expect(repo.full_name).toBe('user/repo1');
    });

    it('should fallback to gh CLI on error', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('API error'));
      vi.mocked(githubCli.getRepoViaGhCli).mockResolvedValue({
        id: 1,
        name: 'repo1',
        full_name: 'user/repo1'
      } as any);

      const repo = await getRepo('user', 'repo1');

      expect(repo.name).toBe('repo1');
      expect(githubCli.getRepoViaGhCli).toHaveBeenCalledWith('user', 'repo1');
    });

    it('should log verbose output when fetching repo', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          id: 1,
          name: 'verbose-repo',
          full_name: 'user/verbose-repo',
          description: 'A verbose test repo',
          html_url: 'https://github.com/user/verbose-repo',
          clone_url: 'https://github.com/user/verbose-repo.git',
          ssh_url: 'git@github.com:user/verbose-repo.git',
          private: false,
          language: 'TypeScript',
          stargazers_count: 100,
          forks_count: 25,
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const repo = await getRepo('user', 'verbose-repo');

      expect(repo.name).toBe('verbose-repo');
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should throw error when both Octokit and gh CLI fail', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('API error'));
      vi.mocked(githubCli.getRepoViaGhCli).mockRejectedValue(new Error('CLI error'));

      await expect(getRepo('user', 'repo1')).rejects.toThrow('Failed to retrieve repository user/repo1: API error');
    });

    it('should handle non-Error thrown from both Octokit and gh CLI', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue('String error');
      vi.mocked(githubCli.getRepoViaGhCli).mockRejectedValue('CLI string error');

      await expect(getRepo('user', 'repo1')).rejects.toThrow('Failed to retrieve repository user/repo1: Unknown error');
    });
  });

  describe('searchRepos', () => {
    it('should search repositories', async () => {
      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          total_count: 1,
          items: [
            {
              id: 1,
              name: 'typescript-repo',
              full_name: 'user/typescript-repo',
              description: 'A TypeScript repo',
              html_url: 'https://github.com/user/typescript-repo',
              clone_url: 'https://github.com/user/typescript-repo.git',
              ssh_url: 'git@github.com:user/typescript-repo.git',
              private: false,
              language: 'TypeScript',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      });

      const repos = await searchRepos('typescript');

      expect(repos).toHaveLength(1);
      expect(repos[0].name).toBe('typescript-repo');
    });

    it('should use custom search options', async () => {
      mockOctokit.rest.search.repos.mockResolvedValue({
        data: { total_count: 0, items: [] }
      });

      await searchRepos('test', { sort: 'stars', order: 'asc', per_page: 10 });

      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'test',
        sort: 'stars',
        order: 'asc',
        per_page: 10
      });
    });

    it('should fallback to gh CLI on error', async () => {
      mockOctokit.rest.search.repos.mockRejectedValue(new Error('API error'));
      vi.mocked(githubCli.searchReposViaGhCli).mockResolvedValue([]);

      const repos = await searchRepos('test');

      expect(repos).toEqual([]);
      expect(githubCli.searchReposViaGhCli).toHaveBeenCalled();
    });

    it('should log verbose output when searching repos', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.search.repos.mockResolvedValue({
        data: {
          total_count: 2,
          items: [
            {
              id: 1,
              name: 'repo-one',
              full_name: 'user/repo-one',
              description: 'First repo',
              html_url: 'https://github.com/user/repo-one',
              clone_url: 'https://github.com/user/repo-one.git',
              ssh_url: 'git@github.com:user/repo-one.git',
              private: false,
              language: 'TypeScript',
              stargazers_count: 100,
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 2,
              name: 'repo-two',
              full_name: 'user/repo-two',
              description: 'Second repo',
              html_url: 'https://github.com/user/repo-two',
              clone_url: 'https://github.com/user/repo-two.git',
              ssh_url: 'git@github.com:user/repo-two.git',
              private: false,
              language: 'JavaScript',
              stargazers_count: 50,
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      });

      const repos = await searchRepos('test');

      expect(repos).toHaveLength(2);
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should throw error when both Octokit and gh CLI fail', async () => {
      mockOctokit.rest.search.repos.mockRejectedValue(new Error('API error'));
      vi.mocked(githubCli.searchReposViaGhCli).mockRejectedValue(new Error('CLI error'));

      await expect(searchRepos('test')).rejects.toThrow('Failed to search GitHub repositories: API error');
    });

    it('should handle non-Error thrown from both Octokit and gh CLI', async () => {
      mockOctokit.rest.search.repos.mockRejectedValue('String error');
      vi.mocked(githubCli.searchReposViaGhCli).mockRejectedValue('CLI string error');

      await expect(searchRepos('test')).rejects.toThrow('Failed to search GitHub repositories: Unknown error');
    });
  });

  describe('createIssue', () => {
    it('should create an issue', async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: 'https://github.com/testuser' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const issue = await createIssue('user', 'repo', 'Test Issue', 'Issue body');

      expect(issue.number).toBe(42);
      expect(issue.title).toBe('Test Issue');
      expect(issue.state).toBe('open');
    });

    it('should create issue with labels', async () => {
      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: null,
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [{ name: 'bug', color: 'ff0000' }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const issue = await createIssue('user', 'repo', 'Test Issue', undefined, ['bug']);

      expect(issue.labels).toHaveLength(1);
      expect(issue.labels[0].name).toBe('bug');
    });

    it('should throw error on failure', async () => {
      mockOctokit.rest.issues.create.mockRejectedValue(new Error('API error'));

      await expect(createIssue('user', 'repo', 'Test')).rejects.toThrow('Failed to create GitHub issue');
    });

    it('should handle non-Error thrown during create', async () => {
      mockOctokit.rest.issues.create.mockRejectedValue('String error');

      await expect(createIssue('user', 'repo', 'Test')).rejects.toThrow('Failed to create GitHub issue: Unknown error');
    });

    it('should log verbose output when creating issue', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.issues.create.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Verbose Issue',
          body: 'Body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const issue = await createIssue('user', 'repo', 'Verbose Issue', 'Body');

      expect(issue.title).toBe('Verbose Issue');
      expect(getVerbose).toHaveBeenCalled();
    });
  });

  describe('listIssues', () => {
    it('should list issues for a repository', async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {
            id: 1,
            number: 1,
            title: 'Issue 1',
            body: 'Body 1',
            state: 'open',
            html_url: 'https://github.com/user/repo/issues/1',
            user: { login: 'user1', html_url: '' },
            labels: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      });

      const issues = await listIssues('user', 'repo');

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Issue 1');
    });

    it('should use custom options', async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });

      await listIssues('user', 'repo', {
        state: 'closed',
        labels: 'bug',
        sort: 'updated',
        direction: 'asc',
        per_page: 50
      });

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        state: 'closed',
        labels: 'bug',
        sort: 'updated',
        direction: 'asc',
        per_page: 50
      });
    });

    it('should log verbose output when listing issues', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {
            id: 1,
            number: 1,
            title: 'Issue 1',
            body: 'Body 1',
            state: 'open',
            html_url: 'https://github.com/user/repo/issues/1',
            user: { login: 'user1', html_url: '' },
            labels: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      });

      const issues = await listIssues('user', 'repo');

      expect(issues).toHaveLength(1);
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should handle string labels in issues', async () => {
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: [
          {
            id: 1,
            number: 1,
            title: 'Issue with string labels',
            body: 'Body',
            state: 'open',
            html_url: 'https://github.com/user/repo/issues/1',
            user: { login: 'user1', html_url: '' },
            labels: ['bug', 'enhancement'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      });

      const issues = await listIssues('user', 'repo');

      expect(issues[0].labels).toHaveLength(2);
      expect(issues[0].labels[0].name).toBe('bug');
      expect(issues[0].labels[0].color).toBe('');
      expect(issues[0].labels[1].name).toBe('enhancement');
    });
  });

  describe('updateIssue', () => {
    it('should update an issue', async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: {
          id: 1,
          number: 42,
          title: 'Updated Title',
          body: 'Updated body',
          state: 'closed',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      });

      const issue = await updateIssue('user', 'repo', 42, { title: 'Updated Title', state: 'closed' });

      expect(issue.title).toBe('Updated Title');
      expect(issue.state).toBe('closed');
    });

    it('should throw error on failure', async () => {
      mockOctokit.rest.issues.update.mockRejectedValue(new Error('API error'));

      await expect(updateIssue('user', 'repo', 42, { title: 'Test' })).rejects.toThrow('Failed to update GitHub issue');
    });

    it('should handle non-Error thrown during update', async () => {
      mockOctokit.rest.issues.update.mockRejectedValue('String error');

      await expect(updateIssue('user', 'repo', 42, { title: 'Test' })).rejects.toThrow('Failed to update GitHub issue: Unknown error');
    });

    it('should handle string labels in updated issue', async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: {
          id: 1,
          number: 42,
          title: 'Updated Title',
          body: 'Updated body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: ['bug', 'priority'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      });

      const issue = await updateIssue('user', 'repo', 42, { title: 'Updated Title' });

      expect(issue.labels).toHaveLength(2);
      expect(issue.labels[0].name).toBe('bug');
      expect(issue.labels[0].color).toBe('');
      expect(issue.labels[1].name).toBe('priority');
    });

    it('should log verbose output when updating issue', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.issues.update.mockResolvedValue({
        data: {
          id: 1,
          number: 42,
          title: 'Verbose Updated Title',
          body: 'Body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      });

      const issue = await updateIssue('user', 'repo', 42, { title: 'Verbose Updated Title' });

      expect(issue.title).toBe('Verbose Updated Title');
      expect(getVerbose).toHaveBeenCalled();
    });
  });

  describe('commentOnIssue', () => {
    it('should add a comment to an issue', async () => {
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: {
          id: 123,
          html_url: 'https://github.com/user/repo/issues/42#issuecomment-123',
          body: 'Test comment',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      const comment = await commentOnIssue('user', 'repo', 42, 'Test comment');

      expect(comment.id).toBe(123);
      expect(comment.html_url).toContain('issuecomment-123');
    });

    it('should throw error on failure', async () => {
      mockOctokit.rest.issues.createComment.mockRejectedValue(new Error('API error'));

      await expect(commentOnIssue('user', 'repo', 42, 'Test')).rejects.toThrow('Failed to comment on GitHub issue');
    });

    it('should handle non-Error thrown', async () => {
      mockOctokit.rest.issues.createComment.mockRejectedValue('Non-Error thrown');

      await expect(commentOnIssue('user', 'repo', 42, 'Test')).rejects.toThrow('Failed to comment on GitHub issue: Unknown error');
    });

    it('should log verbose output when creating comment', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: {
          id: 123,
          html_url: 'https://github.com/user/repo/issues/42#issuecomment-123',
          body: 'Test comment content',
          created_at: '2024-01-01T00:00:00Z'
        }
      });

      const comment = await commentOnIssue('user', 'repo', 42, 'Test comment content');

      expect(comment.id).toBe(123);
      expect(getVerbose).toHaveBeenCalled();
    });
  });

  describe('getIssueWithComments', () => {
    it('should fetch issue with comments', async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          comments: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [
          {
            id: 1,
            node_id: 'cnode1',
            body: 'Comment 1',
            user: { login: 'user1', html_url: '' },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/user/repo/issues/42#issuecomment-1'
          }
        ],
        headers: {}
      });

      const result = await getIssueWithComments('user', 'repo', 42);

      expect(result.issue.number).toBe(42);
      expect(result.comments).toHaveLength(1);
      expect(result.pagination.total).toBe(2);
    });

    it('should skip comments when includeComments is false', async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          comments: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const result = await getIssueWithComments('user', 'repo', 42, { includeComments: false });

      expect(result.issue.number).toBe(42);
      expect(result.comments).toHaveLength(0);
      expect(mockOctokit.rest.issues.listComments).not.toHaveBeenCalled();
    });

    it('should detect pagination via link header', async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          comments: 50,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [
          {
            id: 1,
            node_id: 'cnode1',
            body: 'Comment 1',
            user: { login: 'user1', html_url: '' },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/user/repo/issues/42#issuecomment-1'
          }
        ],
        headers: {
          link: '<https://api.github.com/repos/user/repo/issues/42/comments?page=2>; rel="next"'
        }
      });

      const result = await getIssueWithComments('user', 'repo', 42);

      expect(result.pagination.has_next_page).toBe(true);
    });

    it('should log verbose output for getIssueWithComments', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: [],
          comments: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [
          {
            id: 1,
            node_id: 'cnode1',
            body: 'Comment 1',
            user: { login: 'user1', html_url: '' },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/user/repo/issues/42#issuecomment-1'
          }
        ],
        headers: {}
      });

      const result = await getIssueWithComments('user', 'repo', 42);

      expect(result.comments).toHaveLength(1);
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should handle string labels in issue', async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          id: 1,
          node_id: 'node1',
          number: 42,
          title: 'Test Issue',
          body: 'Issue body',
          state: 'open',
          html_url: 'https://github.com/user/repo/issues/42',
          user: { login: 'testuser', html_url: '' },
          labels: ['bug', 'enhancement'],
          comments: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      });

      const result = await getIssueWithComments('user', 'repo', 42, { includeComments: false });

      expect(result.issue.labels).toHaveLength(2);
      expect(result.issue.labels[0].name).toBe('bug');
      expect(result.issue.labels[0].color).toBe('');
    });
  });

  describe('searchIssues', () => {
    it('should search issues in a repository', async () => {
      mockOctokit.rest.search.issues.mockResolvedValue({
        data: {
          total_count: 1,
          items: [
            {
              id: 1,
              number: 42,
              title: 'Bug report',
              body: 'Bug description',
              state: 'open',
              html_url: 'https://github.com/user/repo/issues/42',
              user: { login: 'testuser', html_url: '' },
              labels: [{ name: 'bug', color: 'ff0000' }],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      });

      const issues = await searchIssues('user', 'repo', 'bug');

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Bug report');
    });

    it('should include state and labels in query', async () => {
      mockOctokit.rest.search.issues.mockResolvedValue({
        data: { total_count: 0, items: [] }
      });

      await searchIssues('user', 'repo', 'test', { state: 'open', labels: 'enhancement' });

      expect(mockOctokit.rest.search.issues).toHaveBeenCalledWith(
        expect.objectContaining({
          q: expect.stringContaining('state:open')
        })
      );
    });

    it('should log verbose output for searchIssues', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.search.issues.mockResolvedValue({
        data: {
          total_count: 2,
          items: [
            {
              id: 1,
              number: 42,
              title: 'Verbose bug',
              body: 'Bug description',
              state: 'open',
              html_url: 'https://github.com/user/repo/issues/42',
              user: { login: 'testuser', html_url: '' },
              labels: [{ name: 'bug', color: 'ff0000' }],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 2,
              number: 43,
              title: 'Another issue',
              body: 'Description',
              state: 'open',
              html_url: 'https://github.com/user/repo/issues/43',
              user: { login: 'testuser', html_url: '' },
              labels: [],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      });

      const issues = await searchIssues('user', 'repo', 'bug');

      expect(issues).toHaveLength(2);
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should handle searchIssues non-Error thrown', async () => {
      mockOctokit.rest.search.issues.mockRejectedValue('Non-Error thrown');

      await expect(searchIssues('user', 'repo', 'query')).rejects.toThrow('Failed to search GitHub issues: Unknown error');
    });
  });

  describe('listPullRequests', () => {
    it('should list pull requests', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            id: 1,
            number: 10,
            title: 'Feature PR',
            body: 'PR body',
            state: 'open',
            html_url: 'https://github.com/user/repo/pull/10',
            user: { login: 'testuser', html_url: '' },
            head: { ref: 'feature', sha: 'abc123' },
            base: { ref: 'main', sha: 'def456' },
            draft: false,
            mergeable: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            merged_at: null
          }
        ]
      });

      const prs = await listPullRequests('user', 'repo');

      expect(prs).toHaveLength(1);
      expect(prs[0].title).toBe('Feature PR');
      expect(prs[0].state).toBe('open');
    });

    it('should mark merged PRs', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            id: 1,
            number: 10,
            title: 'Merged PR',
            body: null,
            state: 'closed',
            html_url: 'https://github.com/user/repo/pull/10',
            user: { login: 'testuser', html_url: '' },
            head: { ref: 'feature', sha: 'abc123' },
            base: { ref: 'main', sha: 'def456' },
            draft: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            merged_at: '2024-01-02T00:00:00Z'
          }
        ]
      });

      const prs = await listPullRequests('user', 'repo');

      expect(prs[0].state).toBe('merged');
    });

    it('should throw error on failure', async () => {
      mockOctokit.rest.pulls.list.mockRejectedValue(new Error('API error'));

      await expect(listPullRequests('user', 'repo')).rejects.toThrow('Failed to list GitHub pull requests');
    });

    it('should log verbose output for listPullRequests', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            id: 1,
            number: 10,
            title: 'Verbose PR',
            body: 'PR body',
            state: 'open',
            html_url: 'https://github.com/user/repo/pull/10',
            user: { login: 'testuser', html_url: '' },
            head: { ref: 'feature', sha: 'abc123' },
            base: { ref: 'main', sha: 'def456' },
            draft: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            merged_at: null
          }
        ]
      });

      const prs = await listPullRequests('user', 'repo');

      expect(prs).toHaveLength(1);
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should handle non-Error thrown', async () => {
      mockOctokit.rest.pulls.list.mockRejectedValue('Non-Error thrown');

      await expect(listPullRequests('user', 'repo')).rejects.toThrow('Failed to list GitHub pull requests: Unknown error');
    });
  });

  describe('createPullRequest', () => {
    it('should create a pull request', async () => {
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: {
          id: 1,
          number: 20,
          title: 'New Feature',
          body: 'Feature description',
          state: 'open',
          html_url: 'https://github.com/user/repo/pull/20',
          user: { login: 'testuser', html_url: '' },
          head: { ref: 'feature', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: false,
          mergeable: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          merged_at: null
        }
      });

      const pr = await createPullRequest('user', 'repo', 'New Feature', 'feature', 'main', 'Feature description');

      expect(pr.number).toBe(20);
      expect(pr.title).toBe('New Feature');
      expect(pr.head.ref).toBe('feature');
      expect(pr.base.ref).toBe('main');
    });

    it('should create draft PR', async () => {
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: {
          id: 1,
          number: 21,
          title: 'Draft Feature',
          body: null,
          state: 'open',
          html_url: 'https://github.com/user/repo/pull/21',
          user: { login: 'testuser', html_url: '' },
          head: { ref: 'draft-feature', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          merged_at: null
        }
      });

      const pr = await createPullRequest('user', 'repo', 'Draft Feature', 'draft-feature', 'main', undefined, true);

      expect(pr.draft).toBe(true);
    });

    it('should throw error on failure', async () => {
      mockOctokit.rest.pulls.create.mockRejectedValue(new Error('API error'));

      await expect(createPullRequest('user', 'repo', 'Test', 'feature', 'main')).rejects.toThrow('Failed to create GitHub pull request');
    });

    it('should handle non-Error thrown values', async () => {
      mockOctokit.rest.pulls.create.mockRejectedValue('String error');

      await expect(createPullRequest('user', 'repo', 'Test', 'feature', 'main')).rejects.toThrow('Failed to create GitHub pull request: Unknown error');
    });

    it('should handle PR with missing user data', async () => {
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: {
          id: 1,
          number: 22,
          title: 'PR without user',
          body: null,
          state: 'open',
          html_url: 'https://github.com/user/repo/pull/22',
          user: null,
          head: { ref: 'feature', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          merged_at: null
        }
      });

      const pr = await createPullRequest('user', 'repo', 'PR without user', 'feature', 'main');

      expect(pr.user.login).toBe('unknown');
      expect(pr.user.html_url).toBe('');
    });
  });

  describe('Verbose logging', () => {
    it('should log verbose output when enabled', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'repo1',
            full_name: 'user/repo1',
            description: 'Test repo',
            html_url: 'https://github.com/user/repo1',
            clone_url: 'https://github.com/user/repo1.git',
            ssh_url: 'git@github.com:user/repo1.git',
            private: false,
            language: 'TypeScript',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      });

      await getUserRepos();

      // Verbose mode should be checked
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should log verbose output for createPullRequest', async () => {
      const { getVerbose, debug } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: {
          id: 1,
          number: 30,
          title: 'Verbose PR',
          body: 'PR body',
          state: 'open',
          html_url: 'https://github.com/user/repo/pull/30',
          user: { login: 'testuser', html_url: '' },
          head: { ref: 'feature', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' },
          draft: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          merged_at: null
        }
      });

      const pr = await createPullRequest('user', 'repo', 'Verbose PR', 'feature', 'main', 'PR body', true);

      // Verbose mode should trigger debug calls
      expect(getVerbose).toHaveBeenCalled();
      expect(debug).toHaveBeenCalled();
      expect(pr.number).toBe(30);
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle listIssues error', async () => {
      mockOctokit.rest.issues.listForRepo.mockRejectedValue(new Error('API error'));

      await expect(listIssues('user', 'repo')).rejects.toThrow('Failed to list GitHub issues');
    });

    it('should handle listIssues with non-Error thrown', async () => {
      mockOctokit.rest.issues.listForRepo.mockRejectedValue('String error');

      await expect(listIssues('user', 'repo')).rejects.toThrow();
    });

    it('should handle getIssueWithComments error', async () => {
      mockOctokit.rest.issues.get.mockRejectedValue(new Error('API error'));

      await expect(getIssueWithComments('user', 'repo', 1)).rejects.toThrow('Failed to fetch GitHub issue with comments');
    });

    it('should handle getIssueWithComments non-Error thrown', async () => {
      mockOctokit.rest.issues.get.mockRejectedValue('Non-Error thrown');

      await expect(getIssueWithComments('user', 'repo', 1)).rejects.toThrow('Failed to fetch GitHub issue with comments: Unknown error');
    });

    it('should handle searchIssues error', async () => {
      mockOctokit.rest.search.issues.mockRejectedValue(new Error('API error'));

      await expect(searchIssues('user', 'repo', 'query')).rejects.toThrow('Failed to search GitHub issues');
    });
  });
});

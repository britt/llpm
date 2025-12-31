/**
 * Tests for GitHub CLI Service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mock before any imports
const mockExecSync = vi.hoisted(() => vi.fn());

// Mock child_process module completely with default export
vi.mock('child_process', () => {
  const mockModule = {
    execSync: mockExecSync,
    exec: vi.fn(),
    spawn: vi.fn(),
    fork: vi.fn(),
    execFile: vi.fn(),
    execFileSync: vi.fn(),
    spawnSync: vi.fn()
  };
  return {
    ...mockModule,
    default: mockModule
  };
});

vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  getVerbose: vi.fn().mockReturnValue(false)
}));

// Import after mocks are set up
import {
  getUserReposViaGhCli,
  searchReposViaGhCli,
  getRepoViaGhCli
} from './githubCli';

describe('GitHub CLI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserReposViaGhCli', () => {
    it('should return repos from gh CLI', async () => {
      const mockRepos = [
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
      ];

      mockExecSync.mockReturnValue(JSON.stringify(mockRepos));

      const result = await getUserReposViaGhCli();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('repo1');
      expect(result[0].full_name).toBe('user/repo1');
    });

    it('should use provided options', async () => {
      mockExecSync.mockReturnValue(JSON.stringify([]));

      await getUserReposViaGhCli({
        type: 'public',
        sort: 'created',
        direction: 'asc',
        per_page: 50
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('type=public'),
        expect.any(Object)
      );
    });

    it('should throw error for non-array response', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({ error: 'not an array' }));

      await expect(getUserReposViaGhCli()).rejects.toThrow(
        'Invalid response format from GitHub API'
      );
    });

    it('should throw error on execSync failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: command not found');
      });

      await expect(getUserReposViaGhCli()).rejects.toThrow(
        'Failed to retrieve GitHub repositories'
      );
    });

    it('should handle non-Error thrown values', async () => {
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      await expect(getUserReposViaGhCli()).rejects.toThrow(
        'Failed to retrieve GitHub repositories: Unknown error'
      );
    });
  });

  describe('searchReposViaGhCli', () => {
    it('should search repos via gh CLI', async () => {
      const mockSearchResult = {
        total_count: 1,
        items: [
          {
            id: 1,
            name: 'found-repo',
            full_name: 'user/found-repo',
            description: 'Found repo',
            html_url: 'https://github.com/user/found-repo',
            clone_url: 'https://github.com/user/found-repo.git',
            ssh_url: 'git@github.com:user/found-repo.git',
            private: false,
            language: 'JavaScript',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockSearchResult));

      const result = await searchReposViaGhCli('test query');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('found-repo');
    });

    it('should use provided options', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({ items: [] }));

      await searchReposViaGhCli('query', {
        sort: 'stars',
        order: 'asc',
        per_page: 10
      });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sort=stars'),
        expect.any(Object)
      );
    });

    it('should throw error for invalid response', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({ error: 'no items' }));

      await expect(searchReposViaGhCli('test')).rejects.toThrow(
        'Invalid response format from GitHub search API'
      );
    });

    it('should throw error on execSync failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('API error');
      });

      await expect(searchReposViaGhCli('test')).rejects.toThrow(
        'Failed to search GitHub repositories'
      );
    });

    it('should handle non-Error thrown values', async () => {
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      await expect(searchReposViaGhCli('test')).rejects.toThrow(
        'Failed to search GitHub repositories: Unknown error'
      );
    });
  });

  describe('getRepoViaGhCli', () => {
    it('should get specific repo via gh CLI', async () => {
      const mockRepo = {
        id: 1,
        name: 'specific-repo',
        full_name: 'owner/specific-repo',
        description: 'A specific repo',
        html_url: 'https://github.com/owner/specific-repo',
        clone_url: 'https://github.com/owner/specific-repo.git',
        ssh_url: 'git@github.com:owner/specific-repo.git',
        private: true,
        language: 'Rust',
        updated_at: '2024-01-01T00:00:00Z',
        stargazers_count: 100,
        forks_count: 20
      };

      mockExecSync.mockReturnValue(JSON.stringify(mockRepo));

      const result = await getRepoViaGhCli('owner', 'specific-repo');

      expect(result.name).toBe('specific-repo');
      expect(result.full_name).toBe('owner/specific-repo');
      expect(result.private).toBe(true);
    });

    it('should call gh api with correct URL', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        id: 1,
        name: 'repo',
        full_name: 'owner/repo'
      }));

      await getRepoViaGhCli('myowner', 'myrepo');

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh api "repos/myowner/myrepo"',
        expect.any(Object)
      );
    });

    it('should throw error on execSync failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Not found');
      });

      await expect(getRepoViaGhCli('owner', 'repo')).rejects.toThrow(
        'Failed to retrieve repository owner/repo'
      );
    });

    it('should handle non-Error thrown values', async () => {
      mockExecSync.mockImplementation(() => {
        throw 'String error';
      });

      await expect(getRepoViaGhCli('owner', 'repo')).rejects.toThrow(
        'Failed to retrieve repository owner/repo: Unknown error'
      );
    });
  });

  describe('Verbose logging', () => {
    it('should log verbose output when enabled', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockExecSync.mockReturnValue(JSON.stringify([
        { id: 1, name: 'repo', full_name: 'user/repo' }
      ]));

      await getUserReposViaGhCli();

      // Should not throw with verbose enabled
      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should log verbose output for getRepoViaGhCli', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockExecSync.mockReturnValue(JSON.stringify({
        id: 123,
        name: 'test-repo',
        full_name: 'user/test-repo',
        description: 'Test description',
        html_url: 'https://github.com/user/test-repo',
        clone_url: 'https://github.com/user/test-repo.git',
        ssh_url: 'git@github.com:user/test-repo.git',
        private: false,
        language: 'TypeScript',
        default_branch: 'main',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        stargazers_count: 5,
        forks_count: 2,
        open_issues_count: 1
      }));

      const { getRepoViaGhCli } = await import('./githubCli');
      const result = await getRepoViaGhCli('user', 'test-repo');

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-repo');
      expect(mockExecSync).toHaveBeenCalled();
    });
  });
});

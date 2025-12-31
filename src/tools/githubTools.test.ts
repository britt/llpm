import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../services/github');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import {
  listGitHubReposTool,
  searchGitHubReposTool,
  getGitHubRepoTool
} from './githubTools';

import * as github from '../services/github';

describe('GitHub Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all GitHub tools', () => {
      const tools = [
        listGitHubReposTool,
        searchGitHubReposTool,
        getGitHubRepoTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('listGitHubReposTool', () => {
    it('should list repositories successfully', async () => {
      const mockRepos = [
        {
          name: 'repo1',
          full_name: 'user/repo1',
          description: 'Test repo 1',
          html_url: 'https://github.com/user/repo1',
          clone_url: 'https://github.com/user/repo1.git',
          private: false,
          language: 'TypeScript',
          updated_at: '2024-01-01'
        },
        {
          name: 'repo2',
          full_name: 'user/repo2',
          description: 'Test repo 2',
          html_url: 'https://github.com/user/repo2',
          clone_url: 'https://github.com/user/repo2.git',
          private: true,
          language: 'JavaScript',
          updated_at: '2024-01-02'
        }
      ];
      vi.mocked(github.getUserRepos).mockResolvedValue(mockRepos as any);

      const result = await listGitHubReposTool.execute({});

      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.repositories[0].name).toBe('repo1');
    });

    it('should respect limit parameter', async () => {
      const mockRepos = Array(10).fill(null).map((_, i) => ({
        name: `repo${i}`,
        full_name: `user/repo${i}`,
        description: `Test repo ${i}`,
        html_url: `https://github.com/user/repo${i}`,
        clone_url: `https://github.com/user/repo${i}.git`,
        private: false,
        language: 'TypeScript',
        updated_at: '2024-01-01'
      }));
      vi.mocked(github.getUserRepos).mockResolvedValue(mockRepos as any);

      const result = await listGitHubReposTool.execute({ limit: 3 });

      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(3);
      expect(result.total_available).toBe(10);
    });

    it('should pass type and sort parameters', async () => {
      vi.mocked(github.getUserRepos).mockResolvedValue([]);

      await listGitHubReposTool.execute({
        type: 'private',
        sort: 'created'
      });

      expect(github.getUserRepos).toHaveBeenCalledWith({
        type: 'private',
        sort: 'created',
        per_page: 30
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(github.getUserRepos).mockRejectedValue(new Error('API error'));

      const result = await listGitHubReposTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('searchGitHubReposTool', () => {
    it('should search repositories successfully', async () => {
      const mockRepos = [
        {
          name: 'typescript-project',
          full_name: 'user/typescript-project',
          description: 'A TypeScript project',
          html_url: 'https://github.com/user/typescript-project',
          clone_url: 'https://github.com/user/typescript-project.git',
          private: false,
          language: 'TypeScript',
          updated_at: '2024-01-01'
        }
      ];
      vi.mocked(github.searchRepos).mockResolvedValue(mockRepos as any);

      const result = await searchGitHubReposTool.execute({
        query: 'typescript'
      });

      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(1);
      expect(result.query).toBe('typescript');
    });

    it('should respect limit parameter', async () => {
      const mockRepos = Array(20).fill(null).map((_, i) => ({
        name: `repo${i}`,
        full_name: `user/repo${i}`,
        description: `Test repo ${i}`,
        html_url: `https://github.com/user/repo${i}`,
        clone_url: `https://github.com/user/repo${i}.git`,
        private: false,
        language: 'TypeScript',
        updated_at: '2024-01-01'
      }));
      vi.mocked(github.searchRepos).mockResolvedValue(mockRepos as any);

      const result = await searchGitHubReposTool.execute({
        query: 'test',
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(5);
    });

    it('should pass sort parameter', async () => {
      vi.mocked(github.searchRepos).mockResolvedValue([]);

      await searchGitHubReposTool.execute({
        query: 'test',
        sort: 'stars'
      });

      expect(github.searchRepos).toHaveBeenCalledWith('test', {
        sort: 'stars',
        per_page: 10
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(github.searchRepos).mockRejectedValue(new Error('Search error'));

      const result = await searchGitHubReposTool.execute({
        query: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search error');
    });
  });

  describe('getGitHubRepoTool', () => {
    it('should get repository details successfully', async () => {
      const mockRepo = {
        name: 'my-repo',
        full_name: 'user/my-repo',
        description: 'My awesome repository',
        html_url: 'https://github.com/user/my-repo',
        clone_url: 'https://github.com/user/my-repo.git',
        ssh_url: 'git@github.com:user/my-repo.git',
        private: false,
        language: 'TypeScript',
        updated_at: '2024-01-01'
      };
      vi.mocked(github.getRepo).mockResolvedValue(mockRepo as any);

      const result = await getGitHubRepoTool.execute({
        owner: 'user',
        repo: 'my-repo'
      });

      expect(result.success).toBe(true);
      expect(result.repository.name).toBe('my-repo');
      expect(result.repository.full_name).toBe('user/my-repo');
      expect(result.repository.ssh_url).toBe('git@github.com:user/my-repo.git');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(github.getRepo).mockRejectedValue(new Error('Not found'));

      const result = await getGitHubRepoTool.execute({
        owner: 'nonexistent',
        repo: 'repo'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });
});

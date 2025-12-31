import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../services/github');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { githubCommand } from './github';
import * as github from '../services/github';

describe('GitHub Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(githubCommand.name).toBe('github');
      expect(githubCommand.description).toBeDefined();
    });
  });

  describe('No arguments (default help)', () => {
    it('should show help when no arguments', async () => {
      const result = await githubCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('GitHub Commands');
      expect(result.content).toContain('/github list');
      expect(result.content).toContain('/github search');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      const result = await githubCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('GitHub Integration Commands');
      expect(result.content).toContain('/github list');
      expect(result.content).toContain('/github search');
      expect(result.content).toContain('GITHUB_TOKEN');
    });
  });

  describe('List subcommand', () => {
    it('should list repositories successfully', async () => {
      vi.mocked(github.getUserRepos).mockResolvedValue([
        {
          full_name: 'user/repo1',
          description: 'Test repo 1',
          html_url: 'https://github.com/user/repo1',
          private: false,
          language: 'TypeScript'
        } as any,
        {
          full_name: 'user/repo2',
          description: 'Test repo 2',
          html_url: 'https://github.com/user/repo2',
          private: true,
          language: 'JavaScript'
        } as any
      ]);

      const result = await githubCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('user/repo1');
      expect(result.content).toContain('user/repo2');
      expect(result.content).toContain('TypeScript');
    });

    it('should handle repos alias', async () => {
      vi.mocked(github.getUserRepos).mockResolvedValue([]);

      const result = await githubCommand.execute(['repos']);

      expect(result.success).toBe(true);
    });

    it('should show message when no repos found', async () => {
      vi.mocked(github.getUserRepos).mockResolvedValue([]);

      const result = await githubCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No repositories found');
    });

    it('should respect limit parameter', async () => {
      vi.mocked(github.getUserRepos).mockResolvedValue([
        { full_name: 'user/repo1', html_url: 'https://github.com/user/repo1', private: false } as any,
        { full_name: 'user/repo2', html_url: 'https://github.com/user/repo2', private: false } as any
      ]);

      const result = await githubCommand.execute(['list', '5']);

      expect(github.getUserRepos).toHaveBeenCalledWith({ per_page: 5 });
    });

    it('should fail with invalid limit', async () => {
      const result = await githubCommand.execute(['list', 'abc']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid limit');
    });

    it('should fail with zero limit', async () => {
      const result = await githubCommand.execute(['list', '0']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid limit');
    });

    it('should handle API errors', async () => {
      vi.mocked(github.getUserRepos).mockRejectedValue(new Error('API rate limit'));

      const result = await githubCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to list repositories');
      expect(result.content).toContain('API rate limit');
    });

    it('should handle non-Error thrown', async () => {
      vi.mocked(github.getUserRepos).mockRejectedValue('Non-Error thrown');

      const result = await githubCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown error');
    });

    it('should show repos without description', async () => {
      vi.mocked(github.getUserRepos).mockResolvedValue([
        { full_name: 'user/repo1', html_url: 'https://github.com/user/repo1', private: false, description: null } as any
      ]);

      const result = await githubCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No description');
    });
  });

  describe('Search subcommand', () => {
    it('should search repositories successfully', async () => {
      vi.mocked(github.searchRepos).mockResolvedValue([
        {
          full_name: 'user/typescript-project',
          description: 'A TypeScript project',
          html_url: 'https://github.com/user/typescript-project',
          private: false,
          language: 'TypeScript'
        } as any
      ]);

      const result = await githubCommand.execute(['search', 'typescript']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('typescript-project');
      expect(result.content).toContain('TypeScript');
    });

    it('should fail when no query provided', async () => {
      const result = await githubCommand.execute(['search']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should show message when no results', async () => {
      vi.mocked(github.searchRepos).mockResolvedValue([]);

      const result = await githubCommand.execute(['search', 'nonexistent']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No repositories found');
    });

    it('should handle API errors', async () => {
      vi.mocked(github.searchRepos).mockRejectedValue(new Error('Search failed'));

      const result = await githubCommand.execute(['search', 'test']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to search');
    });

    it('should handle non-Error thrown in search', async () => {
      vi.mocked(github.searchRepos).mockRejectedValue('Non-Error thrown');

      const result = await githubCommand.execute(['search', 'test']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown error');
    });

    it('should join multi-word queries', async () => {
      vi.mocked(github.searchRepos).mockResolvedValue([]);

      await githubCommand.execute(['search', 'typescript', 'cli', 'tool']);

      expect(github.searchRepos).toHaveBeenCalledWith('typescript cli tool', { per_page: 10 });
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      const result = await githubCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
    });
  });
});

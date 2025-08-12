import { tool } from 'ai';
import { z } from 'zod';
import { getUserRepos, searchRepos, getRepo } from '../services/github';
import { debug } from '../utils/logger';

export const listGitHubReposTool = tool({
  description: 'List GitHub repositories for the authenticated user',
  inputSchema: z.object({
    type: z.string().optional().describe('Repository type: owner, public, private, or member (default: owner)'),
    sort: z.string().optional().describe('Sort by: created, updated, pushed, or full_name (default: updated)'),
    limit: z.number().optional().describe('Maximum number of repositories to return (default: 30)')
  }),
  execute: async ({ type = 'owner', sort = 'updated', limit = 30 }) => {
    debug('Executing list_github_repos tool with params:', { type, sort, limit });
    
    try {
      const repos = await getUserRepos({
        type: type as 'owner' | 'public' | 'private' | 'member',
        sort: sort as 'created' | 'updated' | 'pushed' | 'full_name',
        per_page: Math.min(limit, 100) // GitHub API limit is 100
      });
      
      const repoList = repos.slice(0, limit).map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        private: repo.private,
        language: repo.language,
        updated_at: repo.updated_at
      }));
      
      return {
        success: true,
        repositories: repoList,
        count: repoList.length,
        total_available: repos.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const searchGitHubReposTool = tool({
  description: 'Search for GitHub repositories',
  inputSchema: z.object({
    query: z.string().describe('Search query for repositories'),
    sort: z.string().optional().describe('Sort by: stars, forks, help-wanted-issues, or updated (default: updated)'),
    limit: z.number().optional().describe('Maximum number of repositories to return (default: 10)')
  }),
  execute: async ({ query, sort = 'updated', limit = 10 }) => {
    debug('Executing search_github_repos tool with params:', { query, sort, limit });
    
    try {
      const repos = await searchRepos(query, {
        sort: sort as 'stars' | 'forks' | 'help-wanted-issues' | 'updated',
        per_page: Math.min(limit, 30) // GitHub search API limit is 100, but we'll be more conservative
      });
      
      const repoList = repos.slice(0, limit).map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        private: repo.private,
        language: repo.language,
        updated_at: repo.updated_at
      }));
      
      return {
        success: true,
        repositories: repoList,
        count: repoList.length,
        query
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const getGitHubRepoTool = tool({
  description: 'Get detailed information about a specific GitHub repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner/organization name'),
    repo: z.string().describe('Repository name')
  }),
  execute: async ({ owner, repo }) => {
    debug('Executing get_github_repo tool with params:', { owner, repo });
    
    try {
      const repoData = await getRepo(owner, repo);
      
      return {
        success: true,
        repository: {
          name: repoData.name,
          full_name: repoData.full_name,
          description: repoData.description,
          html_url: repoData.html_url,
          clone_url: repoData.clone_url,
          ssh_url: repoData.ssh_url,
          private: repoData.private,
          language: repoData.language,
          updated_at: repoData.updated_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
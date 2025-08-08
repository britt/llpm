import type { ToolDefinition } from './types';
import { getUserRepos, searchRepos, getRepo } from '../services/github';
import { debug } from '../utils/logger';

export const listGitHubReposTool: ToolDefinition = {
  name: 'list_github_repos',
  description: 'List GitHub repositories for the authenticated user',
  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Repository type: owner, public, private, or member (default: owner)',
      required: false
    },
    {
      name: 'sort',
      type: 'string',
      description: 'Sort by: created, updated, pushed, or full_name (default: updated)',
      required: false
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of repositories to return (default: 30)',
      required: false
    }
  ],
  execute: async (params: Record<string, any>): Promise<string> => {
    debug('Executing list_github_repos tool with params:', params);
    
    try {
      const { type = 'owner', sort = 'updated', limit = 30 } = params;
      
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
      
      return JSON.stringify({
        success: true,
        repositories: repoList,
        count: repoList.length,
        total_available: repos.length
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export const searchGitHubReposTool: ToolDefinition = {
  name: 'search_github_repos',
  description: 'Search for GitHub repositories',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Search query for repositories',
      required: true
    },
    {
      name: 'sort',
      type: 'string',
      description: 'Sort by: stars, forks, help-wanted-issues, or updated (default: updated)',
      required: false
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of repositories to return (default: 10)',
      required: false
    }
  ],
  execute: async (params: Record<string, any>): Promise<string> => {
    debug('Executing search_github_repos tool with params:', params);
    
    const { query, sort = 'updated', limit = 10 } = params;
    
    if (!query) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameter: query'
      });
    }
    
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
      
      return JSON.stringify({
        success: true,
        repositories: repoList,
        count: repoList.length,
        query
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export const getGitHubRepoTool: ToolDefinition = {
  name: 'get_github_repo',
  description: 'Get detailed information about a specific GitHub repository',
  parameters: [
    {
      name: 'owner',
      type: 'string',
      description: 'Repository owner/organization name',
      required: true
    },
    {
      name: 'repo',
      type: 'string',
      description: 'Repository name',
      required: true
    }
  ],
  execute: async (params: Record<string, any>): Promise<string> => {
    debug('Executing get_github_repo tool with params:', params);
    
    const { owner, repo } = params;
    
    if (!owner || !repo) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameters: owner and repo are both required'
      });
    }
    
    try {
      const repoData = await getRepo(owner, repo);
      
      return JSON.stringify({
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
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
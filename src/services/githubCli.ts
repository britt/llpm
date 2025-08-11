import { execSync } from 'child_process';
import { debug } from '../utils/logger';
import type { GitHubRepo } from './github';

export async function getUserReposViaGhCli(options: {
  type?: 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
} = {}): Promise<GitHubRepo[]> {
  debug('Getting user repositories via gh CLI with options:', options);
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.set('type', options.type || 'owner');
    params.set('sort', options.sort || 'updated');
    params.set('direction', options.direction || 'desc');
    params.set('per_page', String(options.per_page || 100));
    
    const url = `user/repos?${params.toString()}`;
    debug('Calling gh api with URL:', url);
    
    const output = execSync(`gh api "${url}"`, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const data = JSON.parse(output);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from GitHub API');
    }
    
    const repos: GitHubRepo[] = data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      ssh_url: repo.ssh_url,
      private: repo.private,
      language: repo.language,
      updated_at: repo.updated_at,
    }));
    
    debug('Retrieved', repos.length, 'repositories via gh CLI');
    return repos;
  } catch (error) {
    debug('Error retrieving repositories via gh CLI:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve GitHub repositories: ${error.message}`);
    }
    throw new Error('Failed to retrieve GitHub repositories: Unknown error');
  }
}

export async function searchReposViaGhCli(query: string, options: {
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'desc' | 'asc';
  per_page?: number;
} = {}): Promise<GitHubRepo[]> {
  debug('Searching repositories via gh CLI with query:', query, 'options:', options);
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('sort', options.sort || 'updated');
    params.set('order', options.order || 'desc');
    params.set('per_page', String(options.per_page || 30));
    
    const url = `search/repositories?${params.toString()}`;
    debug('Calling gh api with URL:', url);
    
    const output = execSync(`gh api "${url}"`, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const data = JSON.parse(output);
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format from GitHub search API');
    }
    
    const repos: GitHubRepo[] = data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      ssh_url: repo.ssh_url,
      private: repo.private,
      language: repo.language,
      updated_at: repo.updated_at,
    }));
    
    debug('Found', repos.length, 'repositories via gh CLI search');
    return repos;
  } catch (error) {
    debug('Error searching repositories via gh CLI:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to search GitHub repositories: ${error.message}`);
    }
    throw new Error('Failed to search GitHub repositories: Unknown error');
  }
}

export async function getRepoViaGhCli(owner: string, repo: string): Promise<GitHubRepo> {
  debug('Getting specific repository via gh CLI:', owner, repo);
  
  try {
    const url = `repos/${owner}/${repo}`;
    debug('Calling gh api with URL:', url);
    
    const output = execSync(`gh api "${url}"`, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const data = JSON.parse(output);
    
    const repoData: GitHubRepo = {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      html_url: data.html_url,
      clone_url: data.clone_url,
      ssh_url: data.ssh_url,
      private: data.private,
      language: data.language,
      updated_at: data.updated_at,
    };
    
    debug('Retrieved repository via gh CLI:', repoData.full_name);
    return repoData;
  } catch (error) {
    debug('Error retrieving repository via gh CLI:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve repository ${owner}/${repo}: ${error.message}`);
    }
    throw new Error(`Failed to retrieve repository ${owner}/${repo}: Unknown error`);
  }
}
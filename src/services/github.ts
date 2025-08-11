import { Octokit } from '@octokit/rest';
import { debug } from '../utils/logger';
import { execSync } from 'child_process';
import { getUserReposViaGhCli, searchReposViaGhCli, getRepoViaGhCli } from './githubCli';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  private: boolean;
  language: string | null;
  updated_at: string;
}

let octokit: Octokit | null = null;

async function getGitHubToken(): Promise<string> {
  // Try environment variables first
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) {
    debug('Using GitHub token from environment variable');
    return envToken;
  }
  
  // Try to test if gh CLI works first
  try {
    debug('Testing if gh CLI is authenticated');
    execSync('gh api user', { 
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    debug('gh CLI is authenticated, but gh auth token might return wrong token');
    
    // Try to get token from gh CLI
    debug('Attempting to get GitHub token from gh CLI');
    const rawToken = execSync('gh auth token', { 
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    debug('Raw token from gh CLI:', JSON.stringify(rawToken));
    
    const token = rawToken.trim();
    debug('Trimmed token length:', token.length);
    
    if (token && token.length > 0) {
      debug('Successfully retrieved GitHub token from gh CLI');
      debug('Token starts with:', token.substring(0, 10));
      return token;
    } else {
      debug('Token is empty after trimming');
    }
  } catch (error) {
    debug('Failed to get token from gh CLI:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  throw new Error('GitHub token not found. Please either:\n1. Set GITHUB_TOKEN or GH_TOKEN environment variable\n2. Run `gh auth login` to authenticate with GitHub CLI\n3. Install GitHub CLI (gh) if not available');
}

function getOctokit(): Octokit {
  if (!octokit) {
    throw new Error('Octokit not initialized. Call initializeOctokit() first.');
  }
  
  return octokit;
}

async function initializeOctokit(): Promise<void> {
  if (!octokit) {
    const token = await getGitHubToken();
    octokit = new Octokit({
      auth: token,
    });
  }
}

export async function getUserRepos(options: {
  type?: 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
} = {}): Promise<GitHubRepo[]> {
  debug('Getting user repositories with options:', options);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      type: options.type || 'owner',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: options.per_page || 100,
    });
    
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
      updated_at: repo.updated_at || '',
    }));
    
    debug('Retrieved', repos.length, 'repositories');
    return repos;
  } catch (error) {
    debug('Octokit failed, trying gh CLI fallback:', error instanceof Error ? error.message : 'Unknown error');
    
    // Try gh CLI as fallback
    try {
      return await getUserReposViaGhCli(options);
    } catch (ghError) {
      debug('gh CLI fallback also failed:', ghError);
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve GitHub repositories: ${error.message}`);
      }
      throw new Error('Failed to retrieve GitHub repositories: Unknown error');
    }
  }
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  debug('Getting specific repository:', owner, repo);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    
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
    
    debug('Retrieved repository:', repoData.full_name);
    return repoData;
  } catch (error) {
    debug('Octokit failed, trying gh CLI fallback:', error instanceof Error ? error.message : 'Unknown error');
    
    // Try gh CLI as fallback
    try {
      return await getRepoViaGhCli(owner, repo);
    } catch (ghError) {
      debug('gh CLI fallback also failed:', ghError);
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve repository ${owner}/${repo}: ${error.message}`);
      }
      throw new Error(`Failed to retrieve repository ${owner}/${repo}: Unknown error`);
    }
  }
}

export async function searchRepos(query: string, options: {
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'desc' | 'asc';
  per_page?: number;
} = {}): Promise<GitHubRepo[]> {
  debug('Searching repositories with query:', query, 'options:', options);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const { data } = await octokit.rest.search.repos({
      q: query,
      sort: options.sort || 'updated',
      order: options.order || 'desc',
      per_page: options.per_page || 30,
    });
    
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
    
    debug('Found', repos.length, 'repositories in search');
    return repos;
  } catch (error) {
    debug('Octokit failed, trying gh CLI fallback:', error instanceof Error ? error.message : 'Unknown error');
    
    // Try gh CLI as fallback
    try {
      return await searchReposViaGhCli(query, options);
    } catch (ghError) {
      debug('gh CLI fallback also failed:', ghError);
      if (error instanceof Error) {
        throw new Error(`Failed to search GitHub repositories: ${error.message}`);
      }
      throw new Error('Failed to search GitHub repositories: Unknown error');
    }
  }
}
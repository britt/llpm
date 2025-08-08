import { Octokit } from '@octokit/rest';
import { debug } from '../utils/logger';

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

function getOctokit(): Octokit {
  if (!octokit) {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    
    if (!token) {
      throw new Error('GitHub token not found. Please set GITHUB_TOKEN or GH_TOKEN environment variable.');
    }
    
    octokit = new Octokit({
      auth: token,
    });
  }
  
  return octokit;
}

export async function getUserRepos(options: {
  type?: 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
} = {}): Promise<GitHubRepo[]> {
  debug('Getting user repositories with options:', options);
  
  try {
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
      updated_at: repo.updated_at,
    }));
    
    debug('Retrieved', repos.length, 'repositories');
    return repos;
  } catch (error) {
    debug('Error retrieving repositories:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve GitHub repositories: ${error.message}`);
    }
    throw new Error('Failed to retrieve GitHub repositories: Unknown error');
  }
}

export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  debug('Getting specific repository:', owner, repo);
  
  try {
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
    debug('Error retrieving repository:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve repository ${owner}/${repo}: ${error.message}`);
    }
    throw new Error(`Failed to retrieve repository ${owner}/${repo}: Unknown error`);
  }
}

export async function searchRepos(query: string, options: {
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'desc' | 'asc';
  per_page?: number;
} = {}): Promise<GitHubRepo[]> {
  debug('Searching repositories with query:', query, 'options:', options);
  
  try {
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
    debug('Error searching repositories:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to search GitHub repositories: ${error.message}`);
    }
    throw new Error('Failed to search GitHub repositories: Unknown error');
  }
}
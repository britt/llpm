import { Octokit } from '@octokit/rest';
import { debug, getVerbose } from '../utils/logger';
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

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: {
    login: string;
    html_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
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
    
    const apiParams = {
      type: options.type || 'owner',
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: options.per_page || 100,
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /user/repos');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.repos.listForAuthenticatedUser(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'repositories');
      debug('📊 Response data preview:', JSON.stringify(data.slice(0, 2).map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        language: repo.language
      })), null, 2));
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
    
    const apiParams = { owner, repo };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /repos/:owner/:repo');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.repos.get(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: repository details retrieved');
      debug('📊 Response data:', JSON.stringify({
        name: data.name,
        full_name: data.full_name,
        description: data.description,
        private: data.private,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count
      }, null, 2));
    }
    
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
    
    const apiParams = {
      q: query,
      sort: options.sort || 'updated',
      order: options.order || 'desc',
      per_page: options.per_page || 30,
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /search/repositories');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.search.repos(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: found', data.total_count, 'repositories');
      debug('📊 Returned', data.items.length, 'results');
      debug('📊 Response preview:', JSON.stringify(data.items.slice(0, 2).map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language
      })), null, 2));
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

export async function createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]): Promise<GitHubIssue> {
  debug('Creating GitHub issue:', owner, repo, title);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const apiParams = {
      owner,
      repo,
      title,
      ...(body && { body }),
      ...(labels && labels.length > 0 && { labels })
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /repos/:owner/:repo/issues');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.issues.create(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: issue created');
      debug('📊 Response data:', JSON.stringify({
        number: data.number,
        title: data.title,
        state: data.state,
        html_url: data.html_url,
        user: data.user?.login
      }, null, 2));
    }
    
    const issue: GitHubIssue = {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state as 'open' | 'closed',
      html_url: data.html_url,
      user: {
        login: data.user?.login || 'unknown',
        html_url: data.user?.html_url || ''
      },
      labels: data.labels?.map(label => ({
        name: typeof label === 'string' ? label : label.name || '',
        color: typeof label === 'string' ? '' : label.color || ''
      })) || [],
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    debug('Created issue #' + issue.number + ':', issue.title);
    return issue;
  } catch (error) {
    debug('Error creating GitHub issue:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to create GitHub issue: ${error.message}`);
    }
    throw new Error('Failed to create GitHub issue: Unknown error');
  }
}

export async function listIssues(owner: string, repo: string, options: {
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  per_page?: number;
} = {}): Promise<GitHubIssue[]> {
  debug('Listing GitHub issues:', owner, repo, 'options:', options);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const apiParams = {
      owner,
      repo,
      state: options.state || 'open',
      ...(options.labels && { labels: options.labels }),
      sort: options.sort || 'created',
      direction: options.direction || 'desc',
      per_page: options.per_page || 30
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /repos/:owner/:repo/issues');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.issues.listForRepo(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'issues');
      debug('📊 Response data preview:', JSON.stringify(data.slice(0, 2).map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        user: issue.user?.login,
        labels: issue.labels?.length
      })), null, 2));
    }
    
    const issues: GitHubIssue[] = data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      html_url: issue.html_url,
      user: {
        login: issue.user?.login || 'unknown',
        html_url: issue.user?.html_url || ''
      },
      labels: issue.labels?.map(label => ({
        name: typeof label === 'string' ? label : label.name || '',
        color: typeof label === 'string' ? '' : label.color || ''
      })) || [],
      created_at: issue.created_at,
      updated_at: issue.updated_at
    }));
    
    debug('Retrieved', issues.length, 'issues');
    return issues;
  } catch (error) {
    debug('Error listing GitHub issues:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub issues: ${error.message}`);
    }
    throw new Error('Failed to list GitHub issues: Unknown error');
  }
}

export async function updateIssue(owner: string, repo: string, issueNumber: number, updates: {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
}): Promise<GitHubIssue> {
  debug('Updating GitHub issue:', owner, repo, issueNumber);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const apiParams = {
      owner,
      repo,
      issue_number: issueNumber,
      ...updates
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: PATCH /repos/:owner/:repo/issues/:issue_number');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.issues.update(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: issue updated');
      debug('📊 Response data:', JSON.stringify({
        number: data.number,
        title: data.title,
        state: data.state,
        html_url: data.html_url
      }, null, 2));
    }
    
    const issue: GitHubIssue = {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state as 'open' | 'closed',
      html_url: data.html_url,
      user: {
        login: data.user?.login || 'unknown',
        html_url: data.user?.html_url || ''
      },
      labels: data.labels?.map(label => ({
        name: typeof label === 'string' ? label : label.name || '',
        color: typeof label === 'string' ? '' : label.color || ''
      })) || [],
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    debug('Updated issue #' + issue.number + ':', issue.title);
    return issue;
  } catch (error) {
    debug('Error updating GitHub issue:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to update GitHub issue: ${error.message}`);
    }
    throw new Error('Failed to update GitHub issue: Unknown error');
  }
}

export async function commentOnIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<{id: number; html_url: string; created_at: string}> {
  debug('Adding comment to GitHub issue:', owner, repo, issueNumber);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    const apiParams = {
      owner,
      repo,
      issue_number: issueNumber,
      body
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /repos/:owner/:repo/issues/:issue_number/comments');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.issues.createComment(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: comment created');
      debug('📊 Response data:', JSON.stringify({
        id: data.id,
        html_url: data.html_url,
        body_preview: data.body?.substring(0, 100) + '...'
      }, null, 2));
    }
    
    const comment = {
      id: data.id,
      html_url: data.html_url,
      created_at: data.created_at
    };
    
    debug('Created comment #' + comment.id + ' on issue #' + issueNumber);
    return comment;
  } catch (error) {
    debug('Error commenting on GitHub issue:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to comment on GitHub issue: ${error.message}`);
    }
    throw new Error('Failed to comment on GitHub issue: Unknown error');
  }
}

export async function searchIssues(owner: string, repo: string, query: string, options: {
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  sort?: 'created' | 'updated' | 'comments';
  order?: 'asc' | 'desc';
  per_page?: number;
} = {}): Promise<GitHubIssue[]> {
  debug('Searching GitHub issues:', owner, repo, 'query:', query, 'options:', options);
  
  try {
    await initializeOctokit();
    const octokit = getOctokit();
    
    // Build search query
    let searchQuery = `${query} repo:${owner}/${repo}`;
    if (options.state && options.state !== 'all') {
      searchQuery += ` state:${options.state}`;
    }
    if (options.labels) {
      searchQuery += ` label:${options.labels}`;
    }
    
    const apiParams = {
      q: searchQuery,
      sort: options.sort || 'updated',
      order: options.order || 'desc',
      per_page: options.per_page || 30
    };
    
    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /search/issues');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }
    
    const { data } = await octokit.rest.search.issues(apiParams);
    
    if (getVerbose()) {
      debug('✅ GitHub API Response: found', data.total_count, 'issues');
      debug('📊 Returned', data.items.length, 'results');
      debug('📊 Response preview:', JSON.stringify(data.items.slice(0, 2).map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        user: issue.user?.login,
        labels: issue.labels?.length
      })), null, 2));
    }
    
    const issues: GitHubIssue[] = data.items.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      html_url: issue.html_url,
      user: {
        login: issue.user?.login || 'unknown',
        html_url: issue.user?.html_url || ''
      },
      labels: issue.labels?.map(label => ({
        name: typeof label === 'string' ? label : label.name || '',
        color: typeof label === 'string' ? '' : label.color || ''
      })) || [],
      created_at: issue.created_at,
      updated_at: issue.updated_at
    }));
    
    debug('Found', issues.length, 'issues in search');
    return issues;
  } catch (error) {
    debug('Error searching GitHub issues:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to search GitHub issues: ${error.message}`);
    }
    throw new Error('Failed to search GitHub issues: Unknown error');
  }
}
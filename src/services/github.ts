import { Octokit } from '@octokit/rest';
import { debug, getVerbose } from '../utils/logger';
import { execSync } from 'child_process';
import { getUserReposViaGhCli, searchReposViaGhCli, getRepoViaGhCli } from './githubCli';
import { credentialManager } from '../utils/credentialManager';
import { traced } from '../utils/tracing';
import { SpanKind } from '@opentelemetry/api';

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
  node_id: string;
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

export interface GitHubIssueComment {
  id: number;
  node_id: string;
  body: string;
  user: {
    login: string;
    html_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  user: {
    login: string;
    html_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  draft: boolean;
  mergeable: boolean | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  labels?: Array<{ name: string; color: string }>;
  requested_reviewers?: Array<{ login: string; html_url: string }>;
}

let octokit: Octokit | null = null;

async function getGitHubToken(): Promise<string> {
  // Try credential manager (which checks env vars first, then config file)
  const token = await credentialManager.getGitHubToken();
  if (token) {
    return token;
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
    debug(
      'Failed to get token from gh CLI:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  throw new Error(
    'GitHub token not found. Please either:\n1. Set GITHUB_TOKEN or GH_TOKEN environment variable\n2. Store credentials in config file using credential commands\n3. Run `gh auth login` to authenticate with GitHub CLI\n4. Install GitHub CLI (gh) if not available'
  );
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
      auth: token
    });
  }
}

export async function getUserRepos(
  options: {
    type?: 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}
): Promise<GitHubRepo[]> {
  return traced('github.getUserRepos', {
    attributes: {
      'github.api': 'repos.listForAuthenticatedUser',
      'github.type': options.type || 'owner',
      'github.per_page': options.per_page || 100
    },
    kind: SpanKind.CLIENT,
  }, async (span) => {
    debug('Getting user repositories with options:', options);

    try {
      await initializeOctokit();
      const octokit = getOctokit();

      const apiParams = {
        type: options.type || 'owner',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page: options.per_page || 100
      };

      if (getVerbose()) {
        debug('🌐 GitHub API Call: GET /user/repos');
        debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
      }

      const { data } = await octokit.rest.repos.listForAuthenticatedUser(apiParams);
      span.setAttribute('github.response.count', data.length);

      if (getVerbose()) {
        debug('✅ GitHub API Response: received', data.length, 'repositories');
        debug(
          '📊 Response data preview:',
          JSON.stringify(
            data.slice(0, 2).map(repo => ({
              name: repo.name,
              full_name: repo.full_name,
              private: repo.private,
              language: repo.language
            })),
            null,
            2
          )
        );
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
        updated_at: repo.updated_at || ''
      }));

      debug('Retrieved', repos.length, 'repositories');
      return repos;
    } catch (error) {
      span.setAttribute('github.fallback', 'gh_cli');
      debug(
        'Octokit failed, trying gh CLI fallback:',
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Try gh CLI as fallback
      try {
        const repos = await getUserReposViaGhCli(options);
        span.setAttribute('github.fallback.success', true);
        return repos;
      } catch (ghError) {
        span.setAttribute('github.fallback.success', false);
        debug('gh CLI fallback also failed:', ghError);
        if (error instanceof Error) {
          throw new Error(`Failed to retrieve GitHub repositories: ${error.message}`);
        }
        throw new Error('Failed to retrieve GitHub repositories: Unknown error');
      }
    }
  });
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
      debug(
        '📊 Response data:',
        JSON.stringify(
          {
            name: data.name,
            full_name: data.full_name,
            description: data.description,
            private: data.private,
            language: data.language,
            stars: data.stargazers_count,
            forks: data.forks_count
          },
          null,
          2
        )
      );
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
      updated_at: data.updated_at
    };

    debug('Retrieved repository:', repoData.full_name);
    return repoData;
  } catch (error) {
    debug(
      'Octokit failed, trying gh CLI fallback:',
      error instanceof Error ? error.message : 'Unknown error'
    );

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

export async function searchRepos(
  query: string,
  options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'desc' | 'asc';
    per_page?: number;
  } = {}
): Promise<GitHubRepo[]> {
  debug('Searching repositories with query:', query, 'options:', options);

  try {
    await initializeOctokit();
    const octokit = getOctokit();

    const apiParams = {
      q: query,
      sort: options.sort || 'updated',
      order: options.order || 'desc',
      per_page: options.per_page || 30
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /search/repositories');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokit.rest.search.repos(apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: found', data.total_count, 'repositories');
      debug('📊 Returned', data.items.length, 'results');
      debug(
        '📊 Response preview:',
        JSON.stringify(
          data.items.slice(0, 2).map(repo => ({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            language: repo.language
          })),
          null,
          2
        )
      );
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
      updated_at: repo.updated_at
    }));

    debug('Found', repos.length, 'repositories in search');
    return repos;
  } catch (error) {
    debug(
      'Octokit failed, trying gh CLI fallback:',
      error instanceof Error ? error.message : 'Unknown error'
    );

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

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
): Promise<GitHubIssue> {
  return traced('github.createIssue', {
    attributes: {
      'github.api': 'issues.create',
      'github.owner': owner,
      'github.repo': repo,
      'github.issue.title': title.substring(0, 100),
      'github.issue.has_body': !!body,
      'github.issue.labels_count': labels?.length || 0
    },
    kind: SpanKind.CLIENT,
  }, async (span) => {
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

      span.setAttribute('github.issue.number', data.number);
      span.setAttribute('github.issue.state', data.state);
      span.setAttribute('github.issue.url', data.html_url);

      if (getVerbose()) {
        debug('✅ GitHub API Response: issue created');
        debug(
          '📊 Response data:',
          JSON.stringify(
            {
              number: data.number,
              title: data.title,
              state: data.state,
              html_url: data.html_url,
              user: data.user?.login
            },
            null,
            2
          )
        );
      }

      const issue: GitHubIssue = {
        id: data.id,
        node_id: data.node_id,
        number: data.number,
        title: data.title,
        body: data.body || null,
        state: data.state as 'open' | 'closed',
        html_url: data.html_url,
        user: {
          login: data.user?.login || 'unknown',
          html_url: data.user?.html_url || ''
        },
        labels:
          data.labels?.map(label => ({
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
  });
}

export async function listIssues(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}
): Promise<GitHubIssue[]> {
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
      debug(
        '📊 Response data preview:',
        JSON.stringify(
          data.slice(0, 2).map(issue => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            user: issue.user?.login,
            labels: issue.labels?.length
          })),
          null,
          2
        )
      );
    }

    const issues: GitHubIssue[] = data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: issue.state as 'open' | 'closed',
      html_url: issue.html_url,
      user: {
        login: issue.user?.login || 'unknown',
        html_url: issue.user?.html_url || ''
      },
      labels:
        issue.labels?.map(label => ({
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

export async function updateIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  updates: {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
  }
): Promise<GitHubIssue> {
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
      debug(
        '📊 Response data:',
        JSON.stringify(
          {
            number: data.number,
            title: data.title,
            state: data.state,
            html_url: data.html_url
          },
          null,
          2
        )
      );
    }

    const issue: GitHubIssue = {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body || null,
      state: data.state as 'open' | 'closed',
      html_url: data.html_url,
      user: {
        login: data.user?.login || 'unknown',
        html_url: data.user?.html_url || ''
      },
      labels:
        data.labels?.map(label => ({
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

export async function commentOnIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<{ id: number; html_url: string; created_at: string }> {
  return traced('github.commentOnIssue', {
    attributes: {
      'github.api': 'issues.createComment',
      'github.owner': owner,
      'github.repo': repo,
      'github.issue.number': issueNumber,
      'github.comment.length': body.length
    },
    kind: SpanKind.CLIENT,
  }, async (span) => {
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

      span.setAttribute('github.comment.id', data.id);
      span.setAttribute('github.comment.url', data.html_url);

      if (getVerbose()) {
        debug('✅ GitHub API Response: comment created');
        debug(
          '📊 Response data:',
          JSON.stringify(
            {
              id: data.id,
              html_url: data.html_url,
              body_preview: data.body?.substring(0, 100) + '...'
            },
            null,
            2
          )
        );
      }

      const comment = {
        id: data.id,
      html_url: data.html_url,
      created_at: data.created_at
    };

      debug('Created comment #' + comment.id + ' on issue #' + issueNumber);
      return comment;
    } catch (error) {
      debug(
        'Error commenting on GitHub issue:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (error instanceof Error) {
        throw new Error(`Failed to comment on GitHub issue: ${error.message}`);
      }
      throw new Error('Failed to comment on GitHub issue: Unknown error');
    }
  });
}

export async function getIssueWithComments(
  owner: string,
  repo: string,
  issueNumber: number,
  options: {
    includeComments?: boolean;
    commentsPerPage?: number;
    page?: number;
  } = {}
): Promise<{
  issue: GitHubIssue;
  comments: GitHubIssueComment[];
  pagination: {
    page: number;
    per_page: number;
    total?: number;
    has_next_page: boolean;
  };
}> {
  debug('Fetching GitHub issue with comments:', owner, repo, issueNumber, options);

  const { includeComments = true, commentsPerPage = 100, page = 1 } = options;

  try {
    await initializeOctokit();
    const octokit = getOctokit();

    // Fetch the issue
    const issueParams = {
      owner,
      repo,
      issue_number: issueNumber
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /repos/:owner/:repo/issues/:issue_number');
      debug('📋 Parameters:', JSON.stringify(issueParams, null, 2));
    }

    const { data: issueData } = await octokit.rest.issues.get(issueParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: issue fetched');
      debug(
        '📊 Response data:',
        JSON.stringify(
          {
            number: issueData.number,
            title: issueData.title,
            state: issueData.state,
            comments: issueData.comments
          },
          null,
          2
        )
      );
    }

    const issue: GitHubIssue = {
      id: issueData.id,
      node_id: issueData.node_id,
      number: issueData.number,
      title: issueData.title,
      body: issueData.body,
      state: issueData.state as 'open' | 'closed',
      html_url: issueData.html_url,
      user: {
        login: issueData.user?.login || 'unknown',
        html_url: issueData.user?.html_url || ''
      },
      labels: issueData.labels.map((label: any) => ({
        name: typeof label === 'string' ? label : label.name || '',
        color: typeof label === 'string' ? '' : label.color || ''
      })),
      created_at: issueData.created_at,
      updated_at: issueData.updated_at
    };

    let comments: GitHubIssueComment[] = [];
    const totalComments = issueData.comments || 0;
    let hasNextPage = false;

    if (includeComments && totalComments > 0) {
      const commentsParams = {
        owner,
        repo,
        issue_number: issueNumber,
        per_page: Math.min(commentsPerPage, 100),
        page
      };

      if (getVerbose()) {
        debug('🌐 GitHub API Call: GET /repos/:owner/:repo/issues/:issue_number/comments');
        debug('📋 Parameters:', JSON.stringify(commentsParams, null, 2));
      }

      const { data: commentsData, headers } = await octokit.rest.issues.listComments(
        commentsParams
      );

      if (getVerbose()) {
        debug('✅ GitHub API Response: comments fetched');
        debug('📊 Response data:', JSON.stringify({ count: commentsData.length }, null, 2));
      }

      comments = commentsData.map((comment) => ({
        id: comment.id,
        node_id: comment.node_id,
        body: comment.body || '',
        user: {
          login: comment.user?.login || 'unknown',
          html_url: comment.user?.html_url || ''
        },
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        html_url: comment.html_url
      }));

      // Check if there are more pages
      const linkHeader = headers.link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        hasNextPage = true;
      }
    }

    return {
      issue,
      comments,
      pagination: {
        page,
        per_page: commentsPerPage,
        total: totalComments,
        has_next_page: hasNextPage
      }
    };
  } catch (error) {
    debug(
      'Error fetching GitHub issue with comments:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    if (error instanceof Error) {
      throw new Error(`Failed to fetch GitHub issue with comments: ${error.message}`);
    }
    throw new Error('Failed to fetch GitHub issue with comments: Unknown error');
  }
}

export async function searchIssues(
  owner: string,
  repo: string,
  query: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    order?: 'asc' | 'desc';
    per_page?: number;
  } = {}
): Promise<GitHubIssue[]> {
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

    const { data } = await (octokit.rest.search as any).issues(apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: found', data.total_count, 'issues');
      debug('📊 Returned', data.items.length, 'results');
      debug(
        '📊 Response preview:',
        JSON.stringify(
          data.items.slice(0, 2).map((issue: any) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            user: issue.user?.login,
            labels: issue.labels?.length
          })),
          null,
          2
        )
      );
    }

    const issues: GitHubIssue[] = data.items.map((issue: any) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: issue.state as 'open' | 'closed',
      html_url: issue.html_url,
      user: {
        login: issue.user?.login || 'unknown',
        html_url: issue.user?.html_url || ''
      },
      labels:
        issue.labels?.map((label: string | { name: string; color: string }) => ({
          name: typeof label === 'string' ? label : label.name || '',
          color: typeof label === 'string' ? '' : label.color || ''
        })) || [],
      created_at: issue.created_at,
      updated_at: issue.updated_at
    }));

    debug('Found', issues.length, 'issues in search');
    return issues;
  } catch (error) {
    debug(
      'Error searching GitHub issues:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    if (error instanceof Error) {
      throw new Error(`Failed to search GitHub issues: ${error.message}`);
    }
    throw new Error('Failed to search GitHub issues: Unknown error');
  }
}

export async function listPullRequests(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}
): Promise<GitHubPullRequest[]> {
  debug('Listing GitHub pull requests:', owner, repo, 'options:', options);

  try {
    await initializeOctokit();
    const octokit = getOctokit();

    const apiParams = {
      owner,
      repo,
      state: options.state || 'open',
      ...(options.head && { head: options.head }),
      ...(options.base && { base: options.base }),
      sort: options.sort || 'created',
      direction: options.direction || 'desc',
      per_page: options.per_page || 30
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /repos/:owner/:repo/pulls');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokit.rest.pulls.list(apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'pull requests');
      debug(
        '📊 Response data preview:',
        JSON.stringify(
          data.slice(0, 2).map(pr => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            user: pr.user?.login,
            head: pr.head.ref,
            base: pr.base.ref,
            draft: pr.draft
          })),
          null,
          2
        )
      );
    }

    const pullRequests: GitHubPullRequest[] = data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
      html_url: pr.html_url,
      user: {
        login: pr.user?.login || 'unknown',
        html_url: pr.user?.html_url || ''
      },
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha
      },
      draft: pr.draft || false,
      mergeable: (pr as any).mergeable,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at
    }));

    debug('Retrieved', pullRequests.length, 'pull requests');
    return pullRequests;
  } catch (error) {
    debug('Error listing GitHub pull requests:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub pull requests: ${error.message}`);
    }
    throw new Error('Failed to list GitHub pull requests: Unknown error');
  }
}

/**
 * List ALL open issues in a repository using Octokit pagination.
 * Used for comprehensive risk analysis that needs to scan all issues.
 */
export async function listAllIssues(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
  } = {}
): Promise<GitHubIssue[]> {
  debug('Listing ALL GitHub issues with pagination:', owner, repo, 'options:', options);

  try {
    await initializeOctokit();
    const octokit = getOctokit();

    const apiParams = {
      owner,
      repo,
      state: options.state || 'open',
      ...(options.labels && { labels: options.labels }),
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: 100, // Max for pagination
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /repos/:owner/:repo/issues (paginated)');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    // Use Octokit's paginate to fetch ALL issues
    const data = await octokit.paginate(octokit.rest.issues.listForRepo, apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'issues (paginated)');
    }

    const issues: GitHubIssue[] = data.map(issue => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: issue.state as 'open' | 'closed',
      html_url: issue.html_url,
      user: {
        login: issue.user?.login || 'unknown',
        html_url: issue.user?.html_url || ''
      },
      node_id: issue.node_id,
      labels: (issue.labels || [])
        .filter((label): label is { name?: string; color?: string } =>
          typeof label === 'object' && label !== null
        )
        .map(label => ({
          name: label.name || '',
          color: label.color || ''
        })),
      created_at: issue.created_at,
      updated_at: issue.updated_at
    }));

    debug('Retrieved', issues.length, 'issues via pagination');
    return issues;
  } catch (error) {
    debug('Error listing all GitHub issues:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list all GitHub issues: ${error.message}`);
    }
    throw new Error('Failed to list all GitHub issues: Unknown error');
  }
}

/**
 * List ALL open pull requests in a repository using Octokit pagination.
 * Used for comprehensive risk analysis that needs to scan all PRs.
 */
export async function listAllPullRequests(
  owner: string,
  repo: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
  } = {}
): Promise<GitHubPullRequest[]> {
  debug('Listing ALL GitHub pull requests with pagination:', owner, repo, 'options:', options);

  try {
    await initializeOctokit();
    const octokit = getOctokit();

    const apiParams = {
      owner,
      repo,
      state: options.state || 'open',
      ...(options.head && { head: options.head }),
      ...(options.base && { base: options.base }),
      sort: options.sort || 'updated',
      direction: options.direction || 'desc',
      per_page: 100, // Max for pagination
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /repos/:owner/:repo/pulls (paginated)');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    // Use Octokit's paginate to fetch ALL pull requests
    const data = await octokit.paginate(octokit.rest.pulls.list, apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'pull requests (paginated)');
    }

    const pullRequests: GitHubPullRequest[] = data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
      html_url: pr.html_url,
      user: {
        login: pr.user?.login || 'unknown',
        html_url: pr.user?.html_url || ''
      },
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha
      },
      draft: pr.draft || false,
      mergeable: (pr as any).mergeable,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at
    }));

    debug('Retrieved', pullRequests.length, 'pull requests via pagination');
    return pullRequests;
  } catch (error) {
    debug('Error listing all GitHub pull requests:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list all GitHub pull requests: ${error.message}`);
    }
    throw new Error('Failed to list all GitHub pull requests: Unknown error');
  }
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
  draft?: boolean
): Promise<GitHubPullRequest> {
  debug('Creating GitHub pull request:', owner, repo, title, `${head} -> ${base}`);

  try {
    await initializeOctokit();
    const octokit = getOctokit();

    const apiParams = {
      owner,
      repo,
      title,
      head,
      base,
      ...(body && { body }),
      ...(draft !== undefined && { draft })
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /repos/:owner/:repo/pulls');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokit.rest.pulls.create(apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: pull request created');
      debug(
        '📊 Response data:',
        JSON.stringify(
          {
            number: data.number,
            title: data.title,
            state: data.state,
            html_url: data.html_url,
            user: data.user?.login,
            head: data.head.ref,
            base: data.base.ref,
            draft: data.draft
          },
          null,
          2
        )
      );
    }

    const pullRequest: GitHubPullRequest = {
      id: data.id,
      number: data.number,
      title: data.title,
      body: data.body || null,
      state: data.merged_at ? 'merged' : (data.state as 'open' | 'closed'),
      html_url: data.html_url,
      user: {
        login: data.user?.login || 'unknown',
        html_url: data.user?.html_url || ''
      },
      head: {
        ref: data.head.ref,
        sha: data.head.sha
      },
      base: {
        ref: data.base.ref,
        sha: data.base.sha
      },
      draft: data.draft || false,
      mergeable: (data as any).mergeable,
      created_at: data.created_at,
      updated_at: data.updated_at,
      merged_at: data.merged_at
    };

    debug('Created pull request #' + pullRequest.number + ':', pullRequest.title);
    return pullRequest;
  } catch (error) {
    debug('Error creating GitHub pull request:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to create GitHub pull request: ${error.message}`);
    }
    throw new Error('Failed to create GitHub pull request: Unknown error');
  }
}

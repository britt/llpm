import { tool } from 'ai';
import { z } from 'zod';
import { getCurrentProject } from '../utils/projectConfig';
import { createIssue, listIssues, updateIssue, commentOnIssue, searchIssues } from '../services/github';
import { debug } from '../utils/logger';

async function getProjectRepoInfo() {
  const project = await getCurrentProject();
  if (!project || !project.github_repo) {
    throw new Error('No active project with GitHub repository. Use /project to set an active project first.');
  }
  
  // Parse owner/repo from github_repo (e.g., "owner/repo")
  const [owner, repo] = project.github_repo.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub repository format: ${project.github_repo}. Expected format: owner/repo`);
  }
  
  return { owner, repo, projectName: project.name };
}

export const createGitHubIssueTool = tool({
  description: 'Create a new GitHub issue in the active project\'s repository',
  inputSchema: z.object({
    title: z.string().describe('The issue title'),
    body: z.string().optional().describe('The issue body/description'),
    labels: z.array(z.string()).optional().describe('Array of label names to assign to the issue')
  }),
  execute: async ({ title, body, labels }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Creating issue in ${owner}/${repo} for project ${projectName}`);
      
      const issue = await createIssue(owner, repo, title, body, labels);
      
      return {
        success: true,
        message: `Created issue #${issue.number}: ${issue.title}`,
        issue: {
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error creating GitHub issue:', message);
      return {
        success: false,
        error: message
      };
    }
  }
});

export const listGitHubIssuesTool = tool({
  description: 'List GitHub issues in the active project\'s repository',
  inputSchema: z.object({
    state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Issue state filter'),
    labels: z.string().optional().describe('Comma-separated list of labels to filter by'),
    limit: z.number().optional().default(30).describe('Maximum number of issues to return')
  }),
  execute: async ({ state, labels, limit }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Listing issues in ${owner}/${repo} for project ${projectName}`);
      
      const issues = await listIssues(owner, repo, {
        state,
        labels,
        per_page: limit
      });
      
      return {
        success: true,
        message: `Found ${issues.length} ${state} issues`,
        issues: issues.map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          labels: issue.labels.map(label => label.name),
          created: issue.created_at,
          updated: issue.updated_at
        }))
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error listing GitHub issues:', message);
      return {
        success: false,
        error: message
      };
    }
  }
});

export const updateGitHubIssueTool = tool({
  description: 'Update a GitHub issue in the active project\'s repository',
  inputSchema: z.object({
    issueNumber: z.number().describe('The issue number to update'),
    title: z.string().optional().describe('New issue title'),
    body: z.string().optional().describe('New issue body/description'),
    state: z.enum(['open', 'closed']).optional().describe('New issue state'),
    labels: z.array(z.string()).optional().describe('Array of label names to assign')
  }),
  execute: async ({ issueNumber, title, body, state, labels }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Updating issue #${issueNumber} in ${owner}/${repo} for project ${projectName}`);
      
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (body !== undefined) updates.body = body;
      if (state !== undefined) updates.state = state;
      if (labels !== undefined) updates.labels = labels;
      
      const issue = await updateIssue(owner, repo, issueNumber, updates);
      
      return {
        success: true,
        message: `Updated issue #${issue.number}: ${issue.title}`,
        issue: {
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error updating GitHub issue:', message);
      return {
        success: false,
        error: message
      };
    }
  }
});

export const commentOnGitHubIssueTool = tool({
  description: 'Add a comment to a GitHub issue in the active project\'s repository',
  inputSchema: z.object({
    issueNumber: z.number().describe('The issue number to comment on'),
    body: z.string().describe('The comment body/text')
  }),
  execute: async ({ issueNumber, body }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Adding comment to issue #${issueNumber} in ${owner}/${repo} for project ${projectName}`);
      
      const comment = await commentOnIssue(owner, repo, issueNumber, body);
      
      return {
        success: true,
        message: `Added comment to issue #${issueNumber}`,
        comment: {
          id: comment.id,
          url: comment.html_url,
          created: comment.created_at
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error commenting on GitHub issue:', message);
      return {
        success: false,
        error: message
      };
    }
  }
});

export const searchGitHubIssuesTool = tool({
  description: 'Search GitHub issues in the active project\'s repository',
  inputSchema: z.object({
    query: z.string().describe('Search query (e.g., "bug", "feature request", etc.)'),
    state: z.enum(['open', 'closed', 'all']).optional().default('all').describe('Issue state filter'),
    labels: z.string().optional().describe('Label to filter by'),
    limit: z.number().optional().default(30).describe('Maximum number of issues to return')
  }),
  execute: async ({ query, state, labels, limit }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Searching issues in ${owner}/${repo} for project ${projectName} with query: ${query}`);
      
      const issues = await searchIssues(owner, repo, query, {
        state,
        labels,
        per_page: limit
      });
      
      return {
        success: true,
        message: `Found ${issues.length} issues matching "${query}"`,
        issues: issues.map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          labels: issue.labels.map(label => label.name),
          created: issue.created_at,
          updated: issue.updated_at
        }))
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error searching GitHub issues:', message);
      return {
        success: false,
        error: message
      };
    }
  }
});
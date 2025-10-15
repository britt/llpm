import { tool } from './instrumentedTool';
import * as z from "zod";
import { getCurrentProject, loadProjectConfig } from '../utils/projectConfig';
import {
  createIssue,
  listIssues,
  updateIssue,
  commentOnIssue,
  searchIssues,
  getIssueWithComments
} from '../services/github';
import { autoAddToProjectBoard } from '../services/projectBoardIntegration';
import { uploadFilesToGitHub } from '../services/githubAssets';
import { debug } from '../utils/logger';
import { composeWithSalutation, getSalutationConfig } from '../utils/salutation';

async function getProjectRepoInfo() {
  const project = await getCurrentProject();
  if (!project || !project.github_repo) {
    throw new Error(
      'No active project with GitHub repository. Use /project to set an active project first.'
    );
  }

  // Parse owner/repo from github_repo (e.g., "owner/repo")
  const [owner, repo] = project.github_repo.split('/');
  if (!owner || !repo) {
    throw new Error(
      `Invalid GitHub repository format: ${project.github_repo}. Expected format: owner/repo`
    );
  }

  return { owner, repo, projectName: project.name };
}

export const createGitHubIssueTool = tool({
  description: "Create a new GitHub issue in the active project's repository with optional file attachments",
  inputSchema: z.object({
    title: z.string().describe('The issue title'),
    body: z.string().optional().describe('The issue body/description'),
    labels: z.array(z.string()).optional().describe('Array of label names to assign to the issue'),
    attachments: z.array(z.string()).optional().describe('Array of file paths to upload and attach to the issue')
  }),
  execute: async ({ title, body, labels, attachments }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Creating issue in ${owner}/${repo} for project ${projectName}`);

      // Handle file attachments if provided
      let finalBody = body || '';
      if (attachments && attachments.length > 0) {
        debug(`Uploading ${attachments.length} attachments`);

        try {
          const uploadResults = await uploadFilesToGitHub(attachments);
          const attachmentMarkdown = uploadResults
            .filter(result => result.markdown) // Only include successful uploads
            .map(result => result.markdown)
            .join('\n\n');

          if (attachmentMarkdown) {
            finalBody += (finalBody ? '\n\n---\n\n' : '') + '**Attachments:**\n\n' + attachmentMarkdown;
          }
        } catch (uploadError) {
          debug('Failed to upload some attachments:', uploadError);
          // Continue with issue creation, but note the upload failure
          finalBody += (finalBody ? '\n\n' : '') + '⚠️ Some file attachments failed to upload.';
        }
      }

      // Apply salutation to final body
      const appConfig = await loadProjectConfig();
      const salutationConfig = getSalutationConfig(appConfig);
      finalBody = composeWithSalutation(finalBody, salutationConfig);

      const issue = await createIssue(owner, repo, title, finalBody, labels);

      // Attempt to automatically add the issue to the project board
      try {
        const autoAddResult = await autoAddToProjectBoard(issue.node_id, 'issue');
        debug('Auto-add to project board result:', autoAddResult);
      } catch (error) {
        debug('Failed to auto-add issue to project board:', error);
        // Don't fail the issue creation if project board addition fails
      }

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
  description: "List GitHub issues in the active project's repository",
  inputSchema: z.object({
    state: z
      .enum(['open', 'closed', 'all'])
      .optional()
      .default('open')
      .describe('Issue state filter'),
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
  description: "Update a GitHub issue in the active project's repository",
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
  description: "Add a comment to a GitHub issue in the active project's repository with optional file attachments",
  inputSchema: z.object({
    issueNumber: z.number().describe('The issue number to comment on'),
    body: z.string().describe('The comment body/text'),
    attachments: z.array(z.string()).optional().describe('Array of file paths to upload and attach to the comment')
  }),
  execute: async ({ issueNumber, body, attachments }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(
        `Adding comment to issue #${issueNumber} in ${owner}/${repo} for project ${projectName}`
      );

      // Handle file attachments if provided
      let finalBody = body;
      if (attachments && attachments.length > 0) {
        debug(`Uploading ${attachments.length} attachments for comment`);

        try {
          const uploadResults = await uploadFilesToGitHub(attachments);
          const attachmentMarkdown = uploadResults
            .filter(result => result.markdown) // Only include successful uploads
            .map(result => result.markdown)
            .join('\n\n');

          if (attachmentMarkdown) {
            finalBody += '\n\n**Attachments:**\n\n' + attachmentMarkdown;
          }
        } catch (uploadError) {
          debug('Failed to upload some attachments:', uploadError);
          // Continue with comment creation, but note the upload failure
          finalBody += '\n\n⚠️ Some file attachments failed to upload.';
        }
      }

      // Apply salutation to final body
      const appConfig = await loadProjectConfig();
      const salutationConfig = getSalutationConfig(appConfig);
      finalBody = composeWithSalutation(finalBody, salutationConfig);

      const comment = await commentOnIssue(owner, repo, issueNumber, finalBody);

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
  description: "Search GitHub issues in the active project's repository",
  inputSchema: z.object({
    query: z.string().describe('Search query (e.g., "bug", "feature request", etc.)'),
    state: z
      .enum(['open', 'closed', 'all'])
      .optional()
      .default('all')
      .describe('Issue state filter'),
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

export const getGitHubIssueWithCommentsTool = tool({
  description: "Get a GitHub issue with all its comments from the active project's repository. Returns full issue details including metadata, body, and all comments with pagination support.",
  parameters: z.object({
    issueNumber: z.number().describe('The issue number to fetch'),
    includeComments: z.boolean().optional().default(true).describe('Whether to include comments (default: true)'),
    commentsPerPage: z.number().optional().default(100).describe('Number of comments per page (default: 100, max: 100)'),
    page: z.number().optional().default(1).describe('Page number for comment pagination (default: 1)')
  }),
  execute: async ({ issueNumber, includeComments, commentsPerPage, page }) => {
    try {
      const { owner, repo, projectName } = await getProjectRepoInfo();
      debug(`Fetching issue #${issueNumber} with comments from ${owner}/${repo} for project ${projectName}`);

      const result = await getIssueWithComments(owner, repo, issueNumber, {
        includeComments,
        commentsPerPage,
        page
      });

      return {
        success: true,
        message: `Fetched issue #${issueNumber} with ${result.comments.length} comments (page ${result.pagination.page})`,
        issue: {
          number: result.issue.number,
          title: result.issue.title,
          body: result.issue.body,
          state: result.issue.state,
          url: result.issue.html_url,
          author: result.issue.user.login,
          labels: result.issue.labels.map(label => label.name),
          created: result.issue.created_at,
          updated: result.issue.updated_at
        },
        comments: result.comments.map(comment => ({
          id: comment.id,
          body: comment.body,
          author: comment.user.login,
          url: comment.html_url,
          created: comment.created_at,
          updated: comment.updated_at
        })),
        pagination: {
          page: result.pagination.page,
          per_page: result.pagination.per_page,
          total_comments: result.pagination.total,
          has_next_page: result.pagination.has_next_page
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug('Error fetching GitHub issue with comments:', message);
      return {
        success: false,
        error: message
      };
    }
  }
});

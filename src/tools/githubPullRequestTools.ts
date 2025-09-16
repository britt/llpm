import { tool } from './instrumentedTool';
import { z } from 'zod';
import { listPullRequests, createPullRequest } from '../services/github';
import { uploadFilesToGitHub } from '../services/githubAssets';
import { debug } from '../utils/logger';

export const listGitHubPullRequestsTool = tool({
  description: 'List pull requests for a GitHub repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner/organization name'),
    repo: z.string().describe('Repository name'),
    state: z
      .string()
      .optional()
      .describe('Pull request state: open, closed, or all (default: open)'),
    head: z.string().optional().describe('Filter by head branch (e.g. "myusername:mybranch")'),
    base: z.string().optional().describe('Filter by base branch (e.g. "main")'),
    sort: z
      .string()
      .optional()
      .describe('Sort by: created, updated, popularity, or long-running (default: created)'),
    direction: z.string().optional().describe('Sort direction: asc or desc (default: desc)'),
    limit: z.number().optional().describe('Maximum number of pull requests to return (default: 30)')
  }),
  execute: async ({ 
    owner, 
    repo, 
    state = 'open', 
    head, 
    base, 
    sort = 'created', 
    direction = 'desc', 
    limit = 30 
  }) => {
    debug('Executing list_github_pull_requests tool with params:', { 
      owner, 
      repo, 
      state, 
      head, 
      base, 
      sort, 
      direction, 
      limit 
    });

    try {
      const pullRequests = await listPullRequests(owner, repo, {
        state: state as 'open' | 'closed' | 'all',
        ...(head && { head }),
        ...(base && { base }),
        sort: sort as 'created' | 'updated' | 'popularity' | 'long-running',
        direction: direction as 'asc' | 'desc',
        per_page: Math.min(limit, 100) // GitHub API limit is 100
      });

      const prList = pullRequests.slice(0, limit).map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        html_url: pr.html_url,
        user: pr.user.login,
        head_ref: pr.head.ref,
        base_ref: pr.base.ref,
        draft: pr.draft,
        mergeable: pr.mergeable,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at
      }));

      return {
        success: true,
        pull_requests: prList,
        count: prList.length,
        repository: `${owner}/${repo}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const createGitHubPullRequestTool = tool({
  description: 'Create a new pull request in a GitHub repository with optional file attachments',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner/organization name'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Pull request title'),
    head: z.string().describe('Branch to merge from (source branch)'),
    base: z.string().describe('Branch to merge into (target branch, usually "main" or "master")'),
    body: z.string().optional().describe('Pull request description/body'),
    draft: z.boolean().optional().describe('Create as draft pull request (default: false)'),
    attachments: z.array(z.string()).optional().describe('Array of file paths to upload and attach to the pull request')
  }),
  execute: async ({ owner, repo, title, head, base, body, draft = false, attachments }) => {
    debug('Executing create_github_pull_request tool with params:', { 
      owner, 
      repo, 
      title, 
      head, 
      base, 
      body: body ? `${body.substring(0, 50)}...` : undefined, 
      draft,
      attachments: attachments?.length || 0
    });

    try {
      // Handle file attachments if provided
      let finalBody = body || '';
      if (attachments && attachments.length > 0) {
        debug(`Uploading ${attachments.length} attachments for PR`);
        
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
          // Continue with PR creation, but note the upload failure
          finalBody += (finalBody ? '\n\n' : '') + '⚠️ Some file attachments failed to upload.';
        }
      }

      const pullRequest = await createPullRequest(
        owner, 
        repo, 
        title, 
        head, 
        base, 
        finalBody, 
        draft
      );

      return {
        success: true,
        pull_request: {
          number: pullRequest.number,
          title: pullRequest.title,
          state: pullRequest.state,
          html_url: pullRequest.html_url,
          user: pullRequest.user.login,
          head_ref: pullRequest.head.ref,
          base_ref: pullRequest.base.ref,
          draft: pullRequest.draft,
          mergeable: pullRequest.mergeable,
          created_at: pullRequest.created_at
        },
        repository: `${owner}/${repo}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
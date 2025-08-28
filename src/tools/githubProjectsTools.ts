import { tool } from 'ai';
import { z } from 'zod';
import { credentialManager } from '../utils/credentialManager';
import { 
  listProjectsV2,
  createProjectV2,
  getProjectV2,
  updateProjectV2,
  deleteProjectV2,
  listProjectV2Items,
  addProjectV2Item,
  removeProjectV2Item,
  updateProjectV2ItemFieldValue,
  listProjectV2Fields,
  getOwnerId
} from '../services/githubProjects';
import { debug } from '../utils/logger';

// Project management tools
export const listGitHubProjectsV2Tool = tool({
  description: 'List GitHub Projects v2 for a user or organization',
  inputSchema: z.object({
    owner: z.string().describe('Username or organization name')
  }),
  execute: async ({ owner }) => {
    debug('Executing list_github_projects_v2 tool with params:', { owner });

    try {
      const projects = await listProjectsV2(owner);

      return {
        success: true,
        projects: projects.map(project => ({
          id: project.id,
          number: project.number,
          title: project.title,
          url: project.url,
          public: project.public,
          closed: project.closed,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          owner: project.owner
        })),
        count: projects.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const createGitHubProjectV2Tool = tool({
  description: 'Create a new GitHub Project v2',
  inputSchema: z.object({
    owner: z.string().describe('Username or organization name'),
    title: z.string().describe('Project title')
  }),
  execute: async ({ owner, title }) => {
    debug('Executing create_github_project_v2 tool with params:', { owner, title });

    try {
      const project = await createProjectV2(owner, { title });

      return {
        success: true,
        project: {
          id: project.id,
          number: project.number,
          title: project.title,
          url: project.url,
          public: project.public,
          closed: project.closed,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          owner: project.owner
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

export const getGitHubProjectV2Tool = tool({
  description: 'Get details of a specific GitHub Project v2',
  inputSchema: z.object({
    owner: z.string().describe('Username or organization name'),
    number: z.number().describe('Project number')
  }),
  execute: async ({ owner, number }) => {
    debug('Executing get_github_project_v2 tool with params:', { owner, number });

    try {
      const project = await getProjectV2(owner, number);

      return {
        success: true,
        project: {
          id: project.id,
          number: project.number,
          title: project.title,
          url: project.url,
          public: project.public,
          closed: project.closed,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          owner: project.owner
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

export const updateGitHubProjectV2Tool = tool({
  description: 'Update an existing GitHub Project v2',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    title: z.string().optional().describe('New project title'),
    public: z.boolean().optional().describe('Make project public or private'),
    closed: z.boolean().optional().describe('Close or open the project')
  }),
  execute: async ({ projectId, title, public: isPublic, closed }) => {
    debug('Executing update_github_project_v2 tool with params:', { projectId, title, public: isPublic, closed });

    try {
      const project = await updateProjectV2(projectId, { 
        title, 
        public: isPublic,
        closed
      });

      return {
        success: true,
        project: {
          id: project.id,
          number: project.number,
          title: project.title,
          url: project.url,
          public: project.public,
          closed: project.closed,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          owner: project.owner
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

export const deleteGitHubProjectV2Tool = tool({
  description: 'Delete a GitHub Project v2',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID to delete')
  }),
  execute: async ({ projectId }) => {
    debug('Executing delete_github_project_v2 tool with params:', { projectId });

    try {
      await deleteProjectV2(projectId);

      return {
        success: true,
        message: `Project ${projectId} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Item management tools
export const listGitHubProjectV2ItemsTool = tool({
  description: 'List items in a GitHub Project v2',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID')
  }),
  execute: async ({ projectId }) => {
    debug('Executing list_github_project_v2_items tool with params:', { projectId });

    try {
      const items = await listProjectV2Items(projectId);

      return {
        success: true,
        items: items.map(item => ({
          id: item.id,
          type: item.type,
          content: item.content,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          fieldValues: item.fieldValues.nodes
        })),
        count: items.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const addGitHubProjectV2ItemTool = tool({
  description: 'Add an issue or pull request to a GitHub Project v2',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    contentId: z.string().describe('Issue or Pull Request ID (node ID, not number)')
  }),
  execute: async ({ projectId, contentId }) => {
    debug('Executing add_github_project_v2_item tool with params:', { projectId, contentId });

    try {
      const item = await addProjectV2Item(projectId, contentId);

      return {
        success: true,
        item: {
          id: item.id,
          type: item.type,
          content: item.content,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          fieldValues: item.fieldValues.nodes
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

export const removeGitHubProjectV2ItemTool = tool({
  description: 'Remove an item from a GitHub Project v2',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    itemId: z.string().describe('Item ID to remove')
  }),
  execute: async ({ projectId, itemId }) => {
    debug('Executing remove_github_project_v2_item tool with params:', { projectId, itemId });

    try {
      await removeProjectV2Item(projectId, itemId);

      return {
        success: true,
        message: `Item ${itemId} removed from project ${projectId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Field management tools
export const listGitHubProjectV2FieldsTool = tool({
  description: 'List custom fields in a GitHub Project v2',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID')
  }),
  execute: async ({ projectId }) => {
    debug('Executing list_github_project_v2_fields tool with params:', { projectId });

    try {
      const fields = await listProjectV2Fields(projectId);

      return {
        success: true,
        fields: fields.map(field => ({
          id: field.id,
          name: field.name,
          dataType: field.dataType,
          options: field.options
        })),
        count: fields.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Utility tools
export const getGitHubOwnerIdTool = tool({
  description: 'Get GitHub user or organization ID (needed for Projects v2 operations)',
  inputSchema: z.object({
    login: z.string().describe('Username or organization login')
  }),
  execute: async ({ login }) => {
    debug('Executing get_github_owner_id tool with params:', { login });

    try {
      const ownerId = await getOwnerId(login);

      return {
        success: true,
        ownerId,
        login
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Helper tool to get issue/PR node IDs for adding to projects
export const getGitHubIssueNodeIdTool = tool({
  description: 'Get GitHub issue or pull request node ID (needed for adding to Projects v2)',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    number: z.number().describe('Issue or pull request number'),
    type: z.enum(['issue', 'pullrequest']).describe('Type of content')
  }),
  execute: async ({ owner, repo, number, type }) => {
    debug('Executing get_github_issue_node_id tool with params:', { owner, repo, number, type });

    try {
      // Import here to avoid circular dependency
      const { Octokit } = await import('@octokit/rest');
      const { execSync } = await import('child_process');
      
      // Get token using credential manager
      let token = await credentialManager.getGitHubToken();
      
      if (!token) {
        try {
          const rawToken = execSync('gh auth token', {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['ignore', 'pipe', 'ignore']
          });
          token = rawToken.trim();
        } catch (error: any) {
          throw new Error('GitHub token not found', error);
        }
      }

      const octokit = new Octokit({ auth: token });

      const query = type === 'issue' ? `
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $number) {
              id
              number
              title
              url
            }
          }
        }
      ` : `
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $number) {
              id
              number
              title
              url
            }
          }
        }
      `;

      const result = await octokit.graphql<{
        repository: {
          issue?: { id: string; number: number; title: string; url: string };
          pullRequest?: { id: string; number: number; title: string; url: string };
        };
      }>(query, {
        owner,
        repo,
        number,
        headers: {
          'X-Github-Next-Global-ID': '1'
        }
      });

      const content = type === 'issue' ? result.repository.issue : result.repository.pullRequest;
      if (!content) {
        throw new Error(`${type} #${number} not found in ${owner}/${repo}`);
      }

      return {
        success: true,
        nodeId: content.id,
        number: content.number,
        title: content.title,
        url: content.url,
        type
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const updateGitHubProjectV2ItemFieldValueTool = tool({
  description: 'Update field values for items in a GitHub Project v2 board',
  inputSchema: z.object({
    projectId: z.string().describe('Project ID'),
    itemId: z.string().describe('Project item ID to update'),
    fieldId: z.string().describe('Field ID to update'),
    value: z.object({
      text: z.string().optional().describe('Text value for text fields'),
      number: z.number().optional().describe('Number value for number fields'),
      date: z.string().optional().describe('Date value for date fields (ISO 8601 format)'),
      singleSelectOptionId: z.string().optional().describe('Option ID for single select fields')
    }).describe('Field value to set (provide only one type based on field type)')
  }),
  execute: async ({ projectId, itemId, fieldId, value }) => {
    debug('Executing update_github_project_v2_item_field_value tool with params:', { projectId, itemId, fieldId, value });

    try {
      const updatedItem = await updateProjectV2ItemFieldValue(projectId, itemId, fieldId, value);

      return {
        success: true,
        item: {
          id: updatedItem.id,
          type: updatedItem.type,
          content: updatedItem.content,
          createdAt: updatedItem.createdAt,
          updatedAt: updatedItem.updatedAt,
          fieldValues: updatedItem.fieldValues.nodes
        },
        message: `Successfully updated field ${fieldId} for item ${itemId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
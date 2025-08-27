import { tool } from 'ai';
import { z } from 'zod';
import { 
  listProjects, 
  createProject, 
  getProject, 
  updateProject, 
  deleteProject,
  listProjectColumns,
  createProjectColumn,
  updateProjectColumn,
  deleteProjectColumn,
  moveProjectColumn,
  listProjectCards,
  createProjectCard,
  updateProjectCard,
  deleteProjectCard,
  moveProjectCard
} from '../services/githubProjects';
import { debug } from '../utils/logger';

// Project management tools
export const listGitHubProjectsTool = tool({
  description: 'List GitHub projects for a repository or organization',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner or organization name'),
    repo: z.string().optional().describe('Repository name (omit for organization projects)'),
    state: z.string().optional().describe('Filter by project state: open, closed, or all (default: open)')
  }),
  execute: async ({ owner, repo, state = 'open' }) => {
    debug('Executing list_github_projects tool with params:', { owner, repo, state });

    try {
      const projects = await listProjects(owner, repo, {
        state: state as 'open' | 'closed' | 'all'
      });

      return {
        success: true,
        projects: projects.map(project => ({
          id: project.id,
          name: project.name,
          body: project.body,
          state: project.state,
          html_url: project.html_url,
          created_at: project.created_at,
          updated_at: project.updated_at
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

export const createGitHubProjectTool = tool({
  description: 'Create a new GitHub project board',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner or organization name'),
    repo: z.string().optional().describe('Repository name (omit for organization project)'),
    name: z.string().describe('Project name'),
    body: z.string().optional().describe('Project description')
  }),
  execute: async ({ owner, repo, name, body }) => {
    debug('Executing create_github_project tool with params:', { owner, repo, name, body });

    try {
      const project = await createProject(owner, repo, { name, body });

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          body: project.body,
          state: project.state,
          html_url: project.html_url,
          created_at: project.created_at,
          updated_at: project.updated_at
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

export const updateGitHubProjectTool = tool({
  description: 'Update an existing GitHub project',
  inputSchema: z.object({
    project_id: z.number().describe('Project ID'),
    name: z.string().optional().describe('New project name'),
    body: z.string().optional().describe('New project description'),
    state: z.string().optional().describe('Project state: open or closed')
  }),
  execute: async ({ project_id, name, body, state }) => {
    debug('Executing update_github_project tool with params:', { project_id, name, body, state });

    try {
      const project = await updateProject(project_id, { 
        name, 
        body, 
        state: state as 'open' | 'closed' 
      });

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          body: project.body,
          state: project.state,
          html_url: project.html_url,
          updated_at: project.updated_at
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

export const getGitHubProjectTool = tool({
  description: 'Get details of a specific GitHub project',
  inputSchema: z.object({
    project_id: z.number().describe('Project ID')
  }),
  execute: async ({ project_id }) => {
    debug('Executing get_github_project tool with params:', { project_id });

    try {
      const project = await getProject(project_id);

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          body: project.body,
          state: project.state,
          html_url: project.html_url,
          created_at: project.created_at,
          updated_at: project.updated_at
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

export const deleteGitHubProjectTool = tool({
  description: 'Delete a GitHub project',
  inputSchema: z.object({
    project_id: z.number().describe('Project ID to delete')
  }),
  execute: async ({ project_id }) => {
    debug('Executing delete_github_project tool with params:', { project_id });

    try {
      await deleteProject(project_id);

      return {
        success: true,
        message: `Project ${project_id} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Column management tools
export const listGitHubProjectColumnsTool = tool({
  description: 'List columns in a GitHub project',
  inputSchema: z.object({
    project_id: z.number().describe('Project ID')
  }),
  execute: async ({ project_id }) => {
    debug('Executing list_github_project_columns tool with params:', { project_id });

    try {
      const columns = await listProjectColumns(project_id);

      return {
        success: true,
        columns: columns.map(column => ({
          id: column.id,
          name: column.name,
          created_at: column.created_at,
          updated_at: column.updated_at
        })),
        count: columns.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const createGitHubProjectColumnTool = tool({
  description: 'Create a new column in a GitHub project',
  inputSchema: z.object({
    project_id: z.number().describe('Project ID'),
    name: z.string().describe('Column name')
  }),
  execute: async ({ project_id, name }) => {
    debug('Executing create_github_project_column tool with params:', { project_id, name });

    try {
      const column = await createProjectColumn(project_id, { name });

      return {
        success: true,
        column: {
          id: column.id,
          name: column.name,
          created_at: column.created_at,
          updated_at: column.updated_at
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

export const updateGitHubProjectColumnTool = tool({
  description: 'Update a GitHub project column name',
  inputSchema: z.object({
    column_id: z.number().describe('Column ID'),
    name: z.string().describe('New column name')
  }),
  execute: async ({ column_id, name }) => {
    debug('Executing update_github_project_column tool with params:', { column_id, name });

    try {
      const column = await updateProjectColumn(column_id, { name });

      return {
        success: true,
        column: {
          id: column.id,
          name: column.name,
          updated_at: column.updated_at
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

export const deleteGitHubProjectColumnTool = tool({
  description: 'Delete a column from a GitHub project',
  inputSchema: z.object({
    column_id: z.number().describe('Column ID to delete')
  }),
  execute: async ({ column_id }) => {
    debug('Executing delete_github_project_column tool with params:', { column_id });

    try {
      await deleteProjectColumn(column_id);

      return {
        success: true,
        message: `Column ${column_id} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const moveGitHubProjectColumnTool = tool({
  description: 'Move a column to a different position in the project',
  inputSchema: z.object({
    column_id: z.number().describe('Column ID to move'),
    position: z.string().describe('Position: "first", "last", or "after:column_id"')
  }),
  execute: async ({ column_id, position }) => {
    debug('Executing move_github_project_column tool with params:', { column_id, position });

    try {
      await moveProjectColumn(column_id, { position });

      return {
        success: true,
        message: `Column ${column_id} moved to position: ${position}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

// Card management tools
export const listGitHubProjectCardsTool = tool({
  description: 'List cards in a GitHub project column',
  inputSchema: z.object({
    column_id: z.number().describe('Column ID'),
    archived_state: z.string().optional().describe('Filter by archived state: all, archived, or not_archived (default: not_archived)')
  }),
  execute: async ({ column_id, archived_state = 'not_archived' }) => {
    debug('Executing list_github_project_cards tool with params:', { column_id, archived_state });

    try {
      const cards = await listProjectCards(column_id, {
        archived_state: archived_state as 'all' | 'archived' | 'not_archived'
      });

      return {
        success: true,
        cards: cards.map(card => ({
          id: card.id,
          note: card.note,
          archived: card.archived,
          content_url: card.content_url,
          created_at: card.created_at,
          updated_at: card.updated_at
        })),
        count: cards.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const createGitHubProjectCardTool = tool({
  description: 'Create a new card in a GitHub project column',
  inputSchema: z.object({
    column_id: z.number().describe('Column ID'),
    note: z.string().optional().describe('Card note/content'),
    content_id: z.number().optional().describe('Issue or PR ID to link to this card'),
    content_type: z.string().optional().describe('Content type: "Issue" or "PullRequest" (required if content_id is provided)')
  }),
  execute: async ({ column_id, note, content_id, content_type }) => {
    debug('Executing create_github_project_card tool with params:', { column_id, note, content_id, content_type });

    try {
      const cardData: any = {};
      
      if (note) {
        cardData.note = note;
      } else if (content_id && content_type) {
        cardData.content_id = content_id;
        cardData.content_type = content_type;
      } else {
        throw new Error('Either note or both content_id and content_type must be provided');
      }

      const card = await createProjectCard(column_id, cardData);

      return {
        success: true,
        card: {
          id: card.id,
          note: card.note,
          archived: card.archived,
          content_url: card.content_url,
          created_at: card.created_at,
          updated_at: card.updated_at
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

export const updateGitHubProjectCardTool = tool({
  description: 'Update a GitHub project card',
  inputSchema: z.object({
    card_id: z.number().describe('Card ID'),
    note: z.string().optional().describe('New card note/content'),
    archived: z.boolean().optional().describe('Archive or unarchive the card')
  }),
  execute: async ({ card_id, note, archived }) => {
    debug('Executing update_github_project_card tool with params:', { card_id, note, archived });

    try {
      const card = await updateProjectCard(card_id, { note, archived });

      return {
        success: true,
        card: {
          id: card.id,
          note: card.note,
          archived: card.archived,
          content_url: card.content_url,
          updated_at: card.updated_at
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

export const deleteGitHubProjectCardTool = tool({
  description: 'Delete a card from a GitHub project',
  inputSchema: z.object({
    card_id: z.number().describe('Card ID to delete')
  }),
  execute: async ({ card_id }) => {
    debug('Executing delete_github_project_card tool with params:', { card_id });

    try {
      await deleteProjectCard(card_id);

      return {
        success: true,
        message: `Card ${card_id} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const moveGitHubProjectCardTool = tool({
  description: 'Move a card to a different position or column',
  inputSchema: z.object({
    card_id: z.number().describe('Card ID to move'),
    position: z.string().describe('Position: "top", "bottom", or "after:card_id"'),
    column_id: z.number().optional().describe('Target column ID (if moving to a different column)')
  }),
  execute: async ({ card_id, position, column_id }) => {
    debug('Executing move_github_project_card tool with params:', { card_id, position, column_id });

    try {
      const moveData: any = { position };
      if (column_id) {
        moveData.column_id = column_id;
      }

      await moveProjectCard(card_id, moveData);

      return {
        success: true,
        message: `Card ${card_id} moved to position: ${position}${column_id ? ` in column ${column_id}` : ''}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});
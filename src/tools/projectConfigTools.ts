import { tool } from './instrumentedTool';
import * as z from "zod";
import { 
  getCurrentProject, 
  setProjectBoard, 
  removeProjectBoard, 
  getProjectBoard 
} from '../utils/projectConfig';
import { 
  autoLinkProjectBoard, 
  getCurrentProjectBoard, 
  validateProjectBoardIntegration 
} from '../services/projectBoardIntegration';
import { debug } from '../utils/logger';

export const setProjectBoardTool = tool({
  description: 'Set or link a GitHub Project Board to the current LLPM project for automatic issue/PR assignment',
  parameters: z.object({
    owner: z.string().describe('GitHub username or organization name'),
    projectNumber: z.number().optional().describe('GitHub Project Board number (e.g., 8). If not provided, will auto-detect by name matching'),
    projectBoardId: z.string().optional().describe('Direct GitHub Project Board ID (e.g., gid://Project/123). Use this if you already know the exact project ID')
  }),
  execute: async ({ owner, projectNumber, projectBoardId }) => {
    try {
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return {
          success: false,
          error: 'No active project found. Use the project management tools to set an active project first.'
        };
      }

      debug('Setting project board:', { owner, projectNumber, projectBoardId, currentProjectId: currentProject.id });

      let result;
      if (projectBoardId && projectNumber) {
        // Direct assignment with both ID and number
        const updatedProject = await setProjectBoard(currentProject.id, projectBoardId, projectNumber);
        result = {
          success: true,
          message: `✅ Successfully linked project "${currentProject.name}" to GitHub Project Board (ID: ${projectBoardId}, #${projectNumber})`,
          project: updatedProject
        };
      } else {
        // Auto-link using the integration service
        result = await autoLinkProjectBoard(owner, projectNumber);
      }

      return {
        success: result.success,
        message: result.message,
        projectName: currentProject.name,
        projectBoard: result.project ? {
          id: result.project.id,
          number: result.project.number,
          title: result.project.title,
          url: result.project.url
        } : undefined
      };

    } catch (error) {
      debug('Error setting project board:', error);
      return {
        success: false,
        error: `Failed to set project board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const getProjectBoardInfoTool = tool({
  description: 'Get information about the current project\'s linked GitHub Project Board',
  parameters: z.object({
    validate: z.boolean().optional().default(false).describe('If true, validates that the project board integration is working correctly')
  }),
  execute: async ({ validate }) => {
    try {
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return {
          success: false,
          error: 'No active project found'
        };
      }

      const result = await getCurrentProjectBoard();
      
      if (!result.success) {
        return {
          success: false,
          message: result.message,
          projectName: currentProject.name,
          hasProjectBoard: false
        };
      }

      const response = {
        success: true,
        message: result.message,
        projectName: currentProject.name,
        hasProjectBoard: true,
        projectBoard: result.projectBoard
      };

      // If validation is requested, also validate the integration
      if (validate) {
        const validationResult = await validateProjectBoardIntegration();
        return {
          ...response,
          validation: {
            success: validationResult.success,
            message: validationResult.message,
            details: validationResult.details
          }
        };
      }

      return response;

    } catch (error) {
      debug('Error getting project board info:', error);
      return {
        success: false,
        error: `Failed to get project board info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const removeProjectBoardTool = tool({
  description: 'Remove the GitHub Project Board link from the current LLPM project',
  parameters: z.object({
    confirm: z.boolean().default(false).describe('Set to true to confirm removal of project board link')
  }),
  execute: async ({ confirm }) => {
    try {
      if (!confirm) {
        return {
          success: false,
          error: 'Project board removal requires confirmation. Set confirm parameter to true.'
        };
      }

      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return {
          success: false,
          error: 'No active project found'
        };
      }

      const projectBoard = await getProjectBoard(currentProject.id);
      if (!projectBoard || !projectBoard.projectBoardId) {
        return {
          success: true,
          message: `Project "${currentProject.name}" has no linked project board to remove`,
          projectName: currentProject.name,
          hadProjectBoard: false
        };
      }

      await removeProjectBoard(currentProject.id);

      return {
        success: true,
        message: `✅ Removed project board link from project "${currentProject.name}"`,
        projectName: currentProject.name,
        hadProjectBoard: true,
        previousProjectBoard: {
          projectBoardId: projectBoard.projectBoardId,
          projectBoardNumber: projectBoard.projectBoardNumber
        }
      };

    } catch (error) {
      debug('Error removing project board:', error);
      return {
        success: false,
        error: `Failed to remove project board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const listAvailableProjectBoardsTool = tool({
  description: 'List available GitHub Project Boards for a given owner (user or organization)',
  parameters: z.object({
    owner: z.string().describe('GitHub username or organization name to list project boards for')
  }),
  execute: async ({ owner }) => {
    try {
      // Import here to avoid circular dependency
      const { listProjectsV2 } = await import('../services/githubProjects');
      
      debug('Listing available project boards for owner:', owner);
      
      const projects = await listProjectsV2(owner);
      
      if (projects.length === 0) {
        return {
          success: true,
          message: `No GitHub Project Boards found for ${owner}`,
          owner,
          projectBoards: []
        };
      }

      const projectBoards = projects.map(project => ({
        id: project.id,
        number: project.number,
        title: project.title,
        url: project.url,
        public: project.public,
        closed: project.closed,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));

      return {
        success: true,
        message: `Found ${projectBoards.length} GitHub Project Boards for ${owner}`,
        owner,
        projectBoards
      };

    } catch (error) {
      debug('Error listing project boards:', error);
      return {
        success: false,
        error: `Failed to list project boards: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});
import { tool } from './instrumentedTool';
import { z } from 'zod';
import {
  getCurrentProject,
  setCurrentProject,
  addProject,
  listProjects,
  removeProject,
  updateProject
} from '../utils/projectConfig';
import { debug } from '../utils/logger';

// Helper function to normalize repository format
function normalizeRepository(repository: string): string {
  // If it's already a URL, return as-is
  if (repository.startsWith('http://') || repository.startsWith('https://')) {
    return repository;
  }
  
  // If it's in owner/repo format, convert to GitHub URL
  if (repository.includes('/') && !repository.includes('.')) {
    return `https://github.com/${repository}`;
  }
  
  // If it doesn't look like a URL or owner/repo, assume it's owner/repo
  if (!repository.includes('://')) {
    return `https://github.com/${repository}`;
  }
  
  return repository;
}

export const getCurrentProjectTool = tool({
  description: 'Get information about the currently active project. ALWAYS use this tool when determining the current project.',
  inputSchema: z.object({}),
  execute: async () => {
    debug('Executing get_current_project tool');

    const currentProject = await getCurrentProject();

    if (currentProject) {
      return {
        success: true,
        project: {
          id: currentProject.id,
          name: currentProject.name,
          description: currentProject.description,
          repository: currentProject.repository,
          path: currentProject.path,
          createdAt: currentProject.createdAt,
          updatedAt: currentProject.updatedAt
        }
      };
    } else {
      return {
        success: true,
        project: null,
        message: 'No active project set'
      };
    }
  }
});

export const listProjectsTool = tool({
  description: 'List all available projects',
  inputSchema: z.object({}),
  execute: async () => {
    debug('Executing list_projects tool');

    try {
      const projects = await listProjects();
      const currentProject = await getCurrentProject();

      const projectList = projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        repository: project.repository,
        path: project.path,
        isCurrent: currentProject?.id === project.id,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));

      return {
        success: true,
        projects: projectList,
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

export const addProjectTool = tool({
  description: 'Add a new project to the system. Repository can be a full URL or GitHub owner/repo format (e.g., "user/repo")',
  inputSchema: z.object({
    name: z.string().describe('The name of the project'),
    repository: z.string().describe('The GitHub repository URL or owner/repo format (e.g., "user/repo" or "https://github.com/user/repo")'),
    path: z.string().describe('The local file system path to the project'),
    description: z.string().optional().describe('Optional description of the project')
  }),
  execute: async ({ name, repository, path, description }) => {
    debug('Executing add_project tool with params:', { name, repository, path, description });

    try {
      // Normalize repository format (convert owner/repo to full GitHub URL)
      const normalizedRepository = normalizeRepository(repository);
      const projectData = { name, repository: normalizedRepository, path, ...(description && { description }) };
      const newProject = await addProject(projectData);

      return {
        success: true,
        project: {
          id: newProject.id,
          name: newProject.name,
          description: newProject.description,
          repository: newProject.repository,
          path: newProject.path,
          createdAt: newProject.createdAt,
          updatedAt: newProject.updatedAt
        },
        message: `Successfully added project "${newProject.name}"`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const setCurrentProjectTool = tool({
  description: 'Set the currently active project',
  inputSchema: z.object({
    projectId: z.string().describe('The ID of the project')
  }),
  execute: async ({ projectId }) => {
    debug('Executing set_current_project tool with params:', { projectId });

    try {
      await setCurrentProject(projectId);

      return {
        success: true,
        projectId,
        message: `Successfully set current project to ${projectId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const removeProjectTool = tool({
  description: 'Remove a project from the system',
  inputSchema: z.object({
    projectId: z.string().describe('The ID of the project')
  }),
  execute: async ({ projectId }) => {
    debug('Executing remove_project tool with params:', { projectId });

    try {
      await removeProject(projectId);

      return {
        success: true,
        projectId,
        message: `Successfully removed project ${projectId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

export const updateProjectTool = tool({
  description: 'Update a project\'s information (currently supports updating description)',
  inputSchema: z.object({
    projectId: z.string().describe('The ID of the project to update'),
    description: z.string().describe('The new description for the project')
  }),
  execute: async ({ projectId, description }) => {
    debug('Executing update_project tool with params:', { projectId, description });

    try {
      const updatedProject = await updateProject(projectId, { description });

      return {
        success: true,
        project: {
          id: updatedProject.id,
          name: updatedProject.name,
          description: updatedProject.description,
          repository: updatedProject.repository,
          path: updatedProject.path,
          createdAt: updatedProject.createdAt,
          updatedAt: updatedProject.updatedAt
        },
        message: `Successfully updated project "${updatedProject.name}" description`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

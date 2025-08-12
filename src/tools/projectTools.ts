import { tool } from 'ai';
import { z } from 'zod';
import { getCurrentProject, setCurrentProject, addProject, listProjects, removeProject } from '../utils/projectConfig';
import { debug } from '../utils/logger';

export const getCurrentProjectTool = tool({
  description: 'Get information about the currently active project',
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
  description: 'Add a new project to the system',
  inputSchema: z.object({
    name: z.string().describe('The name of the project'),
    repository: z.string().describe('The GitHub repository URL or identifier'),
    path: z.string().describe('The local file system path to the project')
  }),
  execute: async ({ name, repository, path }) => {
    debug('Executing add_project tool with params:', { name, repository, path });
    
    try {
      const newProject = await addProject({ name, repository, path });
      
      return {
        success: true,
        project: {
          id: newProject.id,
          name: newProject.name,
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
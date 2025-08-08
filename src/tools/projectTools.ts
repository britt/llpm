import type { ToolDefinition } from './types';
import { getCurrentProject, setCurrentProject, addProject, listProjects, removeProject } from '../utils/projectConfig';
import { debug } from '../utils/logger';

export const getCurrentProjectTool: ToolDefinition = {
  name: 'get_current_project',
  description: 'Get information about the currently active project',
  parameters: [],
  execute: async (): Promise<string> => {
    debug('Executing get_current_project tool');
    
    const currentProject = await getCurrentProject();
    
    if (currentProject) {
      return JSON.stringify({
        success: true,
        project: {
          id: currentProject.id,
          name: currentProject.name,
          repository: currentProject.repository,
          path: currentProject.path,
          createdAt: currentProject.createdAt,
          updatedAt: currentProject.updatedAt
        }
      });
    } else {
      return JSON.stringify({
        success: true,
        project: null,
        message: 'No active project set'
      });
    }
  }
};

export const listProjectsTool: ToolDefinition = {
  name: 'list_projects',
  description: 'List all available projects',
  parameters: [],
  execute: async (): Promise<string> => {
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
      
      return JSON.stringify({
        success: true,
        projects: projectList,
        count: projects.length
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export const addProjectTool: ToolDefinition = {
  name: 'add_project',
  description: 'Add a new project to the system',
  parameters: [
    {
      name: 'name',
      type: 'string',
      description: 'The name of the project',
      required: true
    },
    {
      name: 'repository',
      type: 'string', 
      description: 'The GitHub repository URL or identifier',
      required: true
    },
    {
      name: 'path',
      type: 'string',
      description: 'The local file system path to the project',
      required: true
    }
  ],
  execute: async (params: Record<string, any>): Promise<string> => {
    debug('Executing add_project tool with params:', params);
    
    const { name, repository, path } = params;
    
    if (!name || !repository || !path) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameters: name, repository, and path are all required'
      });
    }
    
    try {
      const newProject = await addProject({ name, repository, path });
      
      return JSON.stringify({
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
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export const setCurrentProjectTool: ToolDefinition = {
  name: 'set_current_project',
  description: 'Set the currently active project',
  parameters: [
    {
      name: 'projectId',
      type: 'string',
      description: 'The ID of the project to set as current',
      required: true
    }
  ],
  execute: async (params: Record<string, any>): Promise<string> => {
    debug('Executing set_current_project tool with params:', params);
    
    const { projectId } = params;
    
    if (!projectId) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameter: projectId'
      });
    }
    
    try {
      await setCurrentProject(projectId);
      
      return JSON.stringify({
        success: true,
        projectId,
        message: `Successfully set current project to ${projectId}`
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export const removeProjectTool: ToolDefinition = {
  name: 'remove_project',
  description: 'Remove a project from the system',
  parameters: [
    {
      name: 'projectId',
      type: 'string',
      description: 'The ID of the project to remove',
      required: true
    }
  ],
  execute: async (params: Record<string, any>): Promise<string> => {
    debug('Executing remove_project tool with params:', params);
    
    const { projectId } = params;
    
    if (!projectId) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameter: projectId'
      });
    }
    
    try {
      await removeProject(projectId);
      
      return JSON.stringify({
        success: true,
        projectId,
        message: `Successfully removed project ${projectId}`
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
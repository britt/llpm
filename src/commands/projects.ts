import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { listProjects, getCurrentProject } from '../utils/projectConfig';

export const projectsCommand: Command = {
  name: 'projects',
  description: 'List all available projects',
  execute: async (): Promise<CommandResult> => {
    debug('Executing /projects command');
    
    try {
      const projects = await listProjects();
      const currentProject = await getCurrentProject();
      
      if (projects.length === 0) {
        return {
          content: '📂 No projects configured.\n\n💡 Use /project add <name> <repository> <path> to add your first project',
          success: true
        };
      }
      
      const projectList = projects.map(project => {
        const isCurrent = currentProject?.id === project.id;
        const indicator = isCurrent ? '👉 ' : '   ';
        return `${indicator}${project.name} (${project.id})\n    📂 ${project.repository}\n    📍 ${project.path}`;
      });
      
      const header = `📂 Available Projects (${projects.length}):\n\n`;
      const footer = '\n\n💡 Use /project set <project-id> to switch projects';
      
      return {
        content: header + projectList.join('\n\n') + footer,
        success: true
      };
    } catch (error) {
      return {
        content: `❌ Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
};
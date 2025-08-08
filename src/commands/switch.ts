import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { setCurrentProject, listProjects } from '../utils/projectConfig';

export const switchCommand: Command = {
  name: 'switch',
  description: 'Switch to a different project',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /switch command with args:', args);
    
    if (args.length === 0) {
      // Show available projects for switching
      const projects = await listProjects();
      
      if (projects.length === 0) {
        return {
          content: '📂 No projects available to switch to.\n\n💡 Use /project add <name> <repository> <path> to add projects',
          success: true
        };
      }
      
      const projectList = projects.map(project => 
        `• ${project.name} (${project.id})`
      );
      
      return {
        content: `📂 Available projects to switch to:\n\n${projectList.join('\n')}\n\n💡 Use /switch <project-id> to switch`,
        success: true
      };
    }
    
    const projectId = args[0];
    
    try {
      await setCurrentProject(projectId);
      return {
        content: `✅ Switched to project: ${projectId}`,
        success: true
      };
    } catch (error) {
      return {
        content: `❌ Failed to switch project: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Use /projects to see available project IDs`,
        success: false
      };
    }
  }
};
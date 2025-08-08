import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { getCurrentProject, setCurrentProject, addProject, listProjects, removeProject } from '../utils/projectConfig';

export const projectCommand: Command = {
  name: 'project',
  description: 'Set the current project or manage projects',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /project command with args:', args);
    
    if (args.length === 0) {
      // Show current project
      const currentProject = await getCurrentProject();
      
      if (currentProject) {
        return {
          content: `📁 Current project: ${currentProject.name}\n📂 Repository: ${currentProject.repository}\n📍 Path: ${currentProject.path}`,
          success: true
        };
      } else {
        return {
          content: '📁 No active project set.\n\n💡 Use /project add <name> <repository> <path> to add a new project\n💡 Use /projects to list all available projects',
          success: true
        };
      }
    }
    
    const subCommand = args[0].toLowerCase();
    
    switch (subCommand) {
      case 'add': {
        if (args.length < 4) {
          return {
            content: '❌ Usage: /project add <name> <repository> <path>\n\nExample: /project add "My App" "https://github.com/user/my-app" "/path/to/project"',
            success: false
          };
        }
        
        const [, name, repository, path] = args;
        
        try {
          const newProject = await addProject({ name, repository, path });
          return {
            content: `✅ Added project "${newProject.name}" (ID: ${newProject.id})\n📂 Repository: ${repository}\n📍 Path: ${path}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to add project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }
      
      case 'set': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /project set <project-id>\n\n💡 Use /projects to see available project IDs',
            success: false
          };
        }
        
        const projectId = args[1];
        
        try {
          await setCurrentProject(projectId);
          return {
            content: `✅ Set current project to: ${projectId}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to set project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }
      
      case 'remove': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /project remove <project-id>\n\n💡 Use /projects to see available project IDs',
            success: false
          };
        }
        
        const projectId = args[1];
        
        try {
          await removeProject(projectId);
          return {
            content: `✅ Removed project: ${projectId}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to remove project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }
      
      default:
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nAvailable subcommands:\n• add <name> <repository> <path> - Add a new project\n• set <project-id> - Set current project\n• remove <project-id> - Remove a project`,
          success: false
        };
    }
  }
};
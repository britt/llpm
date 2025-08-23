import type { Command, CommandResult } from './types';
import type { Project } from '../types/project';
import { debug } from '../utils/logger';
import {
  getCurrentProject,
  setCurrentProject,
  addProject,
  listProjects,
  removeProject,
  updateProject
} from '../utils/projectConfig';

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
          content: `📁 Current project: ${currentProject.name}\n📂 Repository: ${currentProject.repository}\n📍 Path: ${currentProject.path}${currentProject.description ? `\n📝 Description: ${currentProject.description}` : ''}`,
          success: true
        };
      } else {
        return {
          content:
            '📁 No active project set.\n\n💡 Use /project add <name> <repository> <path> [description] to add a new project\n💡 Use /project switch to see and switch between projects\n💡 Use /project list to list all available projects\n💡 Press shift+tab for quick project switching',
          success: true
        };
      }
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'help': {
        return {
          content: `📁 Project Management Commands:

/project - Show current project information
/project help - Show this help message

📋 Available Subcommands:
• /project add <name> <repository> <path> [description] - Add a new project
• /project list - List all available projects
• /project switch [project-id] - Switch to a different project (interactive if no ID)
• /project set <project-id> - Set current project (alias for switch)
• /project update <project-id> description "<description>" - Update project description
• /project remove <project-id> - Remove a project

⌨️ Quick Actions:
• Shift+Tab - Interactive project selector

📝 Examples:
• /project add "My App" "https://github.com/user/my-app" "/path/to/project" "Task manager"
• /project switch my-app-123
• /project update my-app-123 description "Updated description"`,
          success: true
        };
      }

      case 'add': {
        if (args.length < 4) {
          return {
            content:
              '❌ Usage: /project add <name> <repository> <path> [description]\n\nExample: /project add "My App" "https://github.com/user/my-app" "/path/to/project" "A web application for managing tasks"',
            success: false
          };
        }

        try {
          const [, name, repository, path, description] = args;
          if (!name || !repository || !path) {
            return {
              content:
                '❌ Usage: /project add <name> <repository> <path> [description]\n\nExample: /project add "My App" "https://github.com/user/my-app" "/path/to/project" "A web application for managing tasks"',
              success: false
            };
          }
          const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = { 
            name, 
            repository, 
            path,
            ...(description && { description })
          };
          const newProject = await addProject(projectData);
          return {
            content: `✅ Added project "${newProject.name}" (ID: ${newProject.id})\n📂 Repository: ${repository}\n📍 Path: ${path}${newProject.description ? `\n📝 Description: ${newProject.description}` : ''}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to add project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }

      case 'set':
      case 'switch': {
        if (args.length < 2) {
          // Show available projects for switching
          const projects = await listProjects();

          if (projects.length === 0) {
            return {
              content:
                '📂 No projects available to switch to.\n\n💡 Use /project add <name> <repository> <path> [description] to add projects',
              success: true
            };
          }

          const projectList = projects.map(project => `• ${project.name} (${project.id})`);

          return {
            content: `📂 Available projects to switch to:\n\n${projectList.join('\n')}\n\n💡 Use /project switch <project-id> to switch\n💡 Or press shift+tab for interactive project selector`,
            success: true
          };
        }

        const projectId = args[1];
        if (!projectId) {
          return {
            content:
              '❌ Usage: /project switch <project-id>\n\n💡 Use /project list to see available project IDs',
            success: false
          };
        }

        try {
          await setCurrentProject(projectId);
          return {
            content: `✅ Switched to project: ${projectId}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to switch project: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Use /project list to see available project IDs`,
            success: false
          };
        }
      }

      case 'list': {
        try {
          const projects = await listProjects();
          const currentProject = await getCurrentProject();

          if (projects.length === 0) {
            return {
              content:
                '📂 No projects configured.\n\n💡 Use /project add <name> <repository> <path> [description] to add your first project',
              success: true
            };
          }

          const projectList = projects.map(project => {
            const isCurrent = currentProject?.id === project.id;
            const indicator = isCurrent ? '👉 ' : '   ';
            const description = project.description ? `\n    📝 ${project.description}` : '';
            return `${indicator}${project.name} (${project.id})\n    📂 ${project.repository}\n    📍 ${project.path}${description}`;
          });

          const header = `📂 Available Projects (${projects.length}):\n\n`;
          const footer = '\n\n💡 Use /project set <project-id> to switch projects\n💡 Or press shift+tab for interactive project selector';

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

      case 'remove': {
        if (args.length < 2) {
          return {
            content:
              '❌ Usage: /project remove <project-id>\n\n💡 Use /project list to see available project IDs',
            success: false
          };
        }

        const projectId = args[1];
        if (!projectId) {
          return {
            content:
              '❌ Usage: /project remove <project-id>\n\n💡 Use /project list to see available project IDs',
            success: false
          };
        }

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

      case 'update': {
        if (args.length < 3) {
          return {
            content:
              '❌ Usage: /project update <project-id> description "<description>"\n\nExample: /project update my-app-123 description "Updated description for my app"',
            success: false
          };
        }

        const projectId = args[1];
        const field = args[2]?.toLowerCase();
        const value = args[3];

        if (!projectId || !field || !value) {
          return {
            content:
              '❌ Usage: /project update <project-id> description "<description>"\n\nExample: /project update my-app-123 description "Updated description for my app"',
            success: false
          };
        }

        if (field !== 'description') {
          return {
            content:
              '❌ Currently only "description" field can be updated\n\nUsage: /project update <project-id> description "<description>"',
            success: false
          };
        }

        try {
          const updatedProject = await updateProject(projectId, { description: value });
          return {
            content: `✅ Updated project "${updatedProject.name}" description\n📝 New description: ${updatedProject.description}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Use /project list to see available project IDs`,
            success: false
          };
        }
      }

      default:
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nAvailable subcommands:\n• add <name> <repository> <path> [description] - Add a new project\n• list - List all available projects\n• switch <project-id> - Switch to a different project\n• set <project-id> - Set current project (alias for switch)\n• update <project-id> description "<description>" - Update project description\n• remove <project-id> - Remove a project`,
          success: false
        };
    }
  }
};

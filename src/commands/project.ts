import type { Command, CommandResult } from './types';
import type { Project } from '../types/project';
import { debug } from '../utils/logger';
import {
  getCurrentProject,
  setCurrentProject,
  addProject,
  listProjects,
  removeProject,
  updateProject,
  getProjectBoard
} from '../utils/projectConfig';

// Import project scan functionality
import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

// Import GitHub Projects functionality  
import {
  listProjectsV2,
  createProjectV2,
  updateProjectV2,
  deleteProjectV2,
  getProjectV2,
  listProjectV2Items,
  addProjectV2Item,
  removeProjectV2Item,
  listProjectV2Fields
} from '../services/githubProjects';
import { getGitHubIssueNodeIdTool } from '../tools/githubProjectsTools';

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

// Project Scan functionality
interface FileAnalysis {
  path: string;
  type: string;
  size: number;
  lines?: number;
  language?: string;
}

interface ProjectAnalysis {
  totalFiles: number;
  totalSize: number;
  totalLines: number;
  filesByType: Record<string, number>;
  filesByLanguage: Record<string, number>;
  largestFiles: FileAnalysis[];
  structure: string[];
}

const LANGUAGE_EXTENSIONS = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript React',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript React',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C Header',
  '.cs': 'C#',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.scala': 'Scala',
  '.clj': 'Clojure',
  '.sh': 'Shell',
  '.bash': 'Bash',
  '.zsh': 'Zsh',
  '.fish': 'Fish',
  '.ps1': 'PowerShell',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.xml': 'XML',
  '.md': 'Markdown',
  '.txt': 'Text',
  '.sql': 'SQL',
  '.dockerfile': 'Dockerfile',
  '.makefile': 'Makefile'
} as const;

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '.next',
  '.nuxt',
  'coverage',
  '.nyc_output',
  '.vscode',
  '.idea',
  '*.log',
  '.DS_Store',
  'Thumbs.db'
];

async function shouldIgnoreFile(filePath: string): Promise<boolean> {
  const fileName = filePath.split('/').pop() || '';
  const dirName = filePath.split('/').slice(-2, -1)[0] || '';
  
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(fileName);
    }
    return fileName === pattern || dirName === pattern || filePath.includes(pattern);
  });
}

async function countLines(filePath: string): Promise<number> {
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

async function analyzeDirectory(projectPath: string, maxFiles: number = 1000): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    totalFiles: 0,
    totalSize: 0,
    totalLines: 0,
    filesByType: {},
    filesByLanguage: {},
    largestFiles: [],
    structure: []
  };

  const files: FileAnalysis[] = [];
  const structureMap = new Map<string, boolean>();

  const scanDirectory = async (dirPath: string, depth: number = 0): Promise<void> => {
    if (analysis.totalFiles >= maxFiles) return;
    if (depth > 10) return; // Prevent infinite recursion

    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        if (analysis.totalFiles >= maxFiles) break;
        
        const fullPath = join(dirPath, entry);
        const relativePath = relative(projectPath, fullPath);
        
        if (await shouldIgnoreFile(relativePath)) continue;

        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          structureMap.set(relativePath, true);
          await scanDirectory(fullPath, depth + 1);
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();
          const language = LANGUAGE_EXTENSIONS[ext as keyof typeof LANGUAGE_EXTENSIONS] || 'Other';
          
          let lines = 0;
          if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.swift', '.cpp', '.c', '.h', '.cs', '.php', '.rb'].includes(ext)) {
            lines = await countLines(fullPath);
            analysis.totalLines += lines;
          }

          const fileAnalysis: FileAnalysis = {
            path: relativePath,
            type: ext || 'no extension',
            size: stats.size,
            lines,
            language
          };

          files.push(fileAnalysis);
          analysis.totalFiles++;
          analysis.totalSize += stats.size;
          
          analysis.filesByType[ext || 'no extension'] = (analysis.filesByType[ext || 'no extension'] || 0) + 1;
          analysis.filesByLanguage[language] = (analysis.filesByLanguage[language] || 0) + 1;
        }
      }
    } catch (error) {
      debug('Error scanning directory:', dirPath, error);
    }
  };

  await scanDirectory(projectPath);

  // Get largest files
  analysis.largestFiles = files
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  // Build structure representation
  const sortedStructure = Array.from(structureMap.keys())
    .sort()
    .slice(0, 50); // Limit structure output

  analysis.structure = sortedStructure.map(path => `📁 ${path}/`);

  return analysis;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatAnalysisResult(analysis: ProjectAnalysis, projectName: string): string {
  const topLanguages = Object.entries(analysis.filesByLanguage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([lang, count]) => `  ${lang}: ${count} files`)
    .join('\n');

  const topFileTypes = Object.entries(analysis.filesByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([ext, count]) => `  ${ext || 'no extension'}: ${count}`)
    .join('\n');

  const largestFiles = analysis.largestFiles
    .slice(0, 5)
    .map(file => `  📄 ${file.path} (${formatBytes(file.size)})${file.lines ? ` - ${file.lines} lines` : ''}`)
    .join('\n');

  const structure = analysis.structure
    .slice(0, 20)
    .join('\n');

  return `🔍 **Project Analysis: ${projectName}**

## 📊 Overview
- **Total Files**: ${analysis.totalFiles}
- **Total Size**: ${formatBytes(analysis.totalSize)}
- **Lines of Code**: ${analysis.totalLines.toLocaleString()}

## 💻 Languages
${topLanguages}

## 📁 File Types
${topFileTypes}

## 📈 Largest Files
${largestFiles}

## 🏗️ Directory Structure
${structure}${analysis.structure.length > 20 ? '\n  ... (truncated)' : ''}

---
*Analysis completed. Use the filesystem tools (read_project_file, list_project_directory, find_project_files) to explore specific files and directories.*`;
}

export const projectCommand: Command = {
  name: 'project',
  description: 'Set the current project or manage projects',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /project command with args:', args);

    if (args.length === 0) {
      // Show current project
      const currentProject = await getCurrentProject();

      if (currentProject) {
        // Check if project has a linked board
        const projectBoard = await getProjectBoard(currentProject.id);
        const boardInfo = projectBoard 
          ? `\n📋 Project Board: Linked (ID: ${projectBoard.projectBoardId}${projectBoard.projectBoardNumber ? `, #${projectBoard.projectBoardNumber}` : ''})`
          : '\n📋 Project Board: Not linked';

        return {
          content: `📁 Current project: ${currentProject.name}\n📂 Repository: ${currentProject.repository}\n📍 Path: ${currentProject.path}${currentProject.description ? `\n📝 Description: ${currentProject.description}` : ''}${boardInfo}`,
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

**Project Management:**
• /project add <name> <repository> <path> [description] - Add a new project
• /project list - List all available projects
• /project switch [project-id] - Switch to a different project (interactive if no ID)
• /project set <project-id> - Set current project (alias for switch)
• /project update <project-id> description "<description>" - Update project description
• /project remove <project-id> - Remove a project

**Project Analysis:**
• /project scan - Analyze the current project codebase and generate a summary

**GitHub Project Boards:**
• /project board <subcommand> - Manage GitHub Projects v2 (new Projects experience)
• /project board list <owner> - List projects for user/organization
• /project board create <owner> <title> [description] - Create a new project
• /project board get <owner> <number> - Get project details by number
• /project board items <project_id> - List items in a project
• /project board add-item <project_id> <content_id> - Add issue/PR to project

⌨️ Quick Actions:
• Shift+Tab - Interactive project selector

📝 Repository Formats:
• GitHub owner/repo: "user/my-app" (converts to https://github.com/user/my-app)
• Full URL: "https://github.com/user/my-app"
• Any git URL: "git@github.com:user/my-app.git"

📝 Examples:
• /project add "My App" "user/my-app" "/path/to/project" "Task manager"
• /project add "Web App" "https://github.com/user/webapp" "/path/to/webapp"
• /project switch my-app-123
• /project scan
• /project board list myorg
• /project board create myorg "My Project"`,
          success: true
        };
      }

      case 'add': {
        if (args.length < 4) {
          return {
            content:
              '❌ Usage: /project add <name> <repository> <path> [description]\n\nExamples:\n• /project add "My App" "user/my-app" "/path/to/project" "A web application for managing tasks"\n• /project add "Web App" "https://github.com/user/webapp" "/path/to/webapp"',
            success: false
          };
        }

        try {
          const [, name, repository, path, description] = args;
          if (!name || !repository || !path) {
            return {
              content:
                '❌ Usage: /project add <name> <repository> <path> [description]\n\nExample: /project add "My App" "user/my-app" "/path/to/project" "A web application for managing tasks"',
              success: false
            };
          }
          
          // Normalize repository format (convert owner/repo to full GitHub URL)
          const normalizedRepository = normalizeRepository(repository);
          
          const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = { 
            name, 
            repository: normalizedRepository, 
            path,
            ...(description && { description })
          };
          const newProject = await addProject(projectData);
          return {
            content: `✅ Added project "${newProject.name}" (ID: ${newProject.id})\n📂 Repository: ${normalizedRepository}\n📍 Path: ${path}${newProject.description ? `\n📝 Description: ${newProject.description}` : ''}`,
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

          const projectList = await Promise.all(projects.map(async project => {
            const isCurrent = currentProject?.id === project.id;
            const indicator = isCurrent ? '👉 ' : '   ';
            const description = project.description ? `\n    📝 ${project.description}` : '';
            
            // Check project board status
            const projectBoard = await getProjectBoard(project.id);
            const boardStatus = projectBoard 
              ? `\n    📋 Project Board: Linked (#${projectBoard.projectBoardNumber || 'Unknown'})`
              : `\n    📋 Project Board: Not linked`;
            
            return `${indicator}${project.name} (${project.id})\n    📂 ${project.repository}\n    📍 ${project.path}${description}${boardStatus}`;
          }));

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

      case 'scan': {
        try {
          const currentProject = await getCurrentProject();
          
          if (!currentProject) {
            return {
              content: '❌ No active project set. Use `/project switch <project-id>` to set an active project first.',
              success: false
            };
          }

          if (!currentProject.path) {
            return {
              content: '❌ Current project does not have a path configured.',
              success: false
            };
          }

          debug('Analyzing project:', currentProject.name, 'at path:', currentProject.path);
          
          const analysis = await analyzeDirectory(currentProject.path);
          const result = formatAnalysisResult(analysis, currentProject.name);
          
          return {
            content: result,
            success: true
          };
        } catch (error) {
          debug('Error analyzing project:', error);
          return {
            content: `❌ Failed to analyze project: ${error instanceof Error ? error.message : String(error)}`,
            success: false
          };
        }
      }

      case 'board': {
        if (args.length < 2) {
          return {
            success: false,
            content: `Usage: /project board <subcommand> [options]

**GitHub Projects v2** (New Projects Experience)

Subcommands:
  list <owner>                           - List projects for user/organization
  create <owner> <title> [description]   - Create a new project
  get <owner> <number>                   - Get project details by number
  update <project_id> [options]          - Update project (--title, --description, --public, --closed)
  delete <project_id>                    - Delete a project
  
  items <project_id>                     - List items in a project
  add-item <project_id> <content_id>     - Add issue/PR to project (use node ID)
  remove-item <project_id> <item_id>     - Remove item from project
  
  fields <project_id>                    - List custom fields in project
  get-issue-id <owner> <repo> <number>   - Get issue node ID for adding to project
  get-pr-id <owner> <repo> <number>      - Get PR node ID for adding to project

Examples:
  /project board list myorg
  /project board create myorg "My Project" "Project description"
  /project board get myorg 1
  /project board items gid://Project/123
  /project board get-issue-id myorg myrepo 42
  /project board add-item gid://Project/123 gid://Issue/456

**Note:** Projects v2 uses GraphQL node IDs (e.g., gid://Project/123) instead of numeric IDs.
Use get-issue-id/get-pr-id to get the node IDs needed for add-item.`
          };
        }

        const boardSubcommand = args[1];
        const boardArgs = args.slice(2);

        try {
          switch (boardSubcommand) {
            case 'list':
              return await handleBoardListProjects(boardArgs);
            case 'create':
              return await handleBoardCreateProject(boardArgs);
            case 'get':
              return await handleBoardGetProject(boardArgs);
            case 'update':
              return await handleBoardUpdateProject(boardArgs);
            case 'delete':
              return await handleBoardDeleteProject(boardArgs);
            case 'items':
              return await handleBoardListItems(boardArgs);
            case 'add-item':
              return await handleBoardAddItem(boardArgs);
            case 'remove-item':
              return await handleBoardRemoveItem(boardArgs);
            case 'fields':
              return await handleBoardListFields(boardArgs);
            case 'get-issue-id':
              return await handleBoardGetIssueId(boardArgs);
            case 'get-pr-id':
              return await handleBoardGetPrId(boardArgs);
            default:
              return {
                success: false,
                content: `Unknown board subcommand: ${boardSubcommand}\nUse /project board without arguments to see available commands.`
              };
          }
        } catch (error) {
          return {
            success: false,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
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

// GitHub Project Board handler functions
async function handleBoardListProjects(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project board list <owner>'
    };
  }

  const owner = args[0];
  if (!owner) {
    return {
      success: false,
      content: 'Usage: /project board list <owner>'
    };
  }
  const projects = await listProjectsV2(owner);

  if (projects.length === 0) {
    return {
      success: true,
      content: `No projects found for ${owner}`
    };
  }

  const projectList = projects.map(project => {
    const status = project.closed ? '🔒 Closed' : (project.public ? '🌐 Public' : '🔒 Private');
    return `• **${project.title}** (#${project.number}) - ${status}\n  ID: \`${project.id}\`\n  🔗 ${project.url}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Projects v2 for ${owner}:**\n\n${projectList}`
  };
}

async function handleBoardCreateProject(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project board create <owner> <title> [description]'
    };
  }

  const owner = args[0];
  const title = args[1];

  if (!owner || !title) {
    return {
      success: false,
      content: 'Usage: /project board create <owner> <title>'
    };
  }

  const project = await createProjectV2(owner, { title });

  const status = project.public ? '🌐 Public' : '🔒 Private';
  return {
    success: true,
    content: `✅ Created project **${project.title}** (#${project.number}) - ${status}\nID: \`${project.id}\`\n🔗 ${project.url}`
  };
}

async function handleBoardGetProject(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project board get <owner> <number>'
    };
  }

  const owner = args[0];
  if (!owner) {
    return {
      success: false,
      content: 'Usage: /project board get <owner> <number>'
    };
  }
  const number = parseInt(args[1] || '0');
  if (isNaN(number)) {
    return {
      success: false,
      content: 'Invalid project number. Must be a number.'
    };
  }

  const project = await getProjectV2(owner, number);

  const status = project.closed ? '🔒 Closed' : (project.public ? '🌐 Public' : '🔒 Private');
  return {
    success: true,
    content: `**${project.title}** (#${project.number}) - ${status}\nID: \`${project.id}\`\nCreated: ${new Date(project.createdAt).toLocaleDateString()}\nUpdated: ${new Date(project.updatedAt).toLocaleDateString()}\n🔗 ${project.url}`
  };
}

async function handleBoardUpdateProject(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project board update <project_id> [--title="New Title"] [--description="New Description"] [--public=true/false] [--closed=true/false]'
    };
  }

  const projectId = args[0];
  if (!projectId) {
    return {
      success: false,
      content: 'Usage: /project board update <project_id> [--title="New Title"] [--description="New Description"] [--public=true/false] [--closed=true/false]'
    };
  }
  const updates: any = {};
  
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--title=')) {
      updates.title = arg.split('=')[1]?.replace(/"/g, '');
    } else if (arg.startsWith('--description=')) {
      // Description updates not supported in Projects v2
      continue;
    } else if (arg.startsWith('--public=')) {
      const value = arg.split('=')[1];
      updates.public = value === 'true';
    } else if (arg.startsWith('--closed=')) {
      const value = arg.split('=')[1];
      updates.closed = value === 'true';
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      content: 'No updates specified. Use --title, --description, --public, or --closed options.'
    };
  }

  const project = await updateProjectV2(projectId, updates);

  const status = project.closed ? '🔒 Closed' : (project.public ? '🌐 Public' : '🔒 Private');
  return {
    success: true,
    content: `✅ Updated project **${project.title}** (#${project.number}) - ${status}\n🔗 ${project.url}`
  };
}

async function handleBoardDeleteProject(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project board delete <project_id>'
    };
  }

  const projectId = args[0];
  if (!projectId) {
    return {
      success: false,
      content: 'Usage: /project board delete <project_id>'
    };
  }
  await deleteProjectV2(projectId);

  return {
    success: true,
    content: `✅ Deleted project ${projectId}`
  };
}

async function handleBoardListItems(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project board items <project_id>'
    };
  }

  const projectId = args[0];
  if (!projectId) {
    return {
      success: false,
      content: 'Usage: /project board items <project_id>'
    };
  }
  const items = await listProjectV2Items(projectId);

  if (items.length === 0) {
    return {
      success: true,
      content: `No items found in project ${projectId}`
    };
  }

  const itemList = items.map((item, index) => {
    const typeIcon = item.type === 'ISSUE' ? '🐛' : item.type === 'PULL_REQUEST' ? '🔀' : '📝';
    const title = item.content?.title || 'Untitled';
    const number = item.content?.number ? `#${item.content.number}` : '';
    const url = item.content?.url || '';
    
    return `${index + 1}. ${typeIcon} **${title}** ${number}\n   ID: \`${item.id}\`\n   ${url ? `🔗 ${url}` : ''}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Items in Project:**\n\n${itemList}`
  };
}

async function handleBoardAddItem(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project board add-item <project_id> <content_id>\n\nTip: Use get-issue-id or get-pr-id to get the content_id first.'
    };
  }

  const projectId = args[0];
  const contentId = args[1];

  if (!projectId || !contentId) {
    return {
      success: false,
      content: 'Usage: /project board add-item <project_id> <content_id>'
    };
  }
  const item = await addProjectV2Item(projectId, contentId);

  const typeIcon = item.type === 'ISSUE' ? '🐛' : item.type === 'PULL_REQUEST' ? '🔀' : '📝';
  const title = item.content?.title || 'Untitled';
  const number = item.content?.number ? `#${item.content.number}` : '';

  return {
    success: true,
    content: `✅ Added ${typeIcon} **${title}** ${number} to project\nItem ID: \`${item.id}\``
  };
}

async function handleBoardRemoveItem(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project board remove-item <project_id> <item_id>'
    };
  }

  const projectId = args[0];
  const itemId = args[1];

  if (!projectId || !itemId) {
    return {
      success: false,
      content: 'Usage: /project board remove-item <project_id> <item_id>'
    };
  }
  await removeProjectV2Item(projectId, itemId);

  return {
    success: true,
    content: `✅ Removed item ${itemId} from project`
  };
}

async function handleBoardListFields(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project board fields <project_id>'
    };
  }

  const projectId = args[0];
  if (!projectId) {
    return {
      success: false,
      content: 'Usage: /project board fields <project_id>'
    };
  }
  const fields = await listProjectV2Fields(projectId);

  if (fields.length === 0) {
    return {
      success: true,
      content: `No custom fields found in project ${projectId}`
    };
  }

  const fieldList = fields.map((field, index) => {
    const typeIcon = field.dataType === 'TEXT' ? '📝' : 
                     field.dataType === 'NUMBER' ? '🔢' : 
                     field.dataType === 'DATE' ? '📅' : 
                     field.dataType === 'SINGLE_SELECT' ? '📋' : 
                     field.dataType === 'ITERATION' ? '🔄' : '❓';
    
    let details = `${typeIcon} **${field.name}** (${field.dataType})`;
    if (field.options && field.options.length > 0) {
      details += `\n   Options: ${field.options.map(opt => opt.name).join(', ')}`;
    }
    details += `\n   ID: \`${field.id}\``;
    
    return `${index + 1}. ${details}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Custom Fields in Project:**\n\n${fieldList}`
  };
}

async function handleBoardGetIssueId(args: string[]): Promise<CommandResult> {
  if (args.length < 3) {
    return {
      success: false,
      content: 'Usage: /project board get-issue-id <owner> <repo> <number>'
    };
  }

  const owner = args[0];
  const repo = args[1];
  const number = parseInt(args[2] || '0');
  if (isNaN(number)) {
    return {
      success: false,
      content: 'Invalid issue number. Must be a number.'
    };
  }

  try {
    if (!getGitHubIssueNodeIdTool) {
      return {
        success: false,
        content: 'GitHub issue tool not available'
      };
    }

    const result = await (getGitHubIssueNodeIdTool as any).execute({
      owner,
      repo,
      number,
      type: 'issue'
    });

    // Handle the union type - check if it's an AsyncIterable (streaming) or direct result
    if (Symbol.asyncIterator in result) {
      return {
        success: false,
        content: 'Tool returned streaming result, expected direct result'
      };
    }

    if (!result.success) {
      return {
        success: false,
        content: result.error || 'Failed to get issue node ID'
      };
    }

    return {
      success: true,
      content: `🐛 **${result.title}** (#${result.number})\nNode ID: \`${result.nodeId}\`\n🔗 ${result.url}\n\nUse this node ID with add-item command.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleBoardGetPrId(args: string[]): Promise<CommandResult> {
  if (args.length < 3) {
    return {
      success: false,
      content: 'Usage: /project board get-pr-id <owner> <repo> <number>'
    };
  }

  const owner = args[0];
  const repo = args[1];
  const number = parseInt(args[2] || '0');
  if (isNaN(number)) {
    return {
      success: false,
      content: 'Invalid pull request number. Must be a number.'
    };
  }

  try {    
    if (!getGitHubIssueNodeIdTool) {
      return {
        success: false,
        content: 'GitHub issue tool not available'
      };
    }

    const result = await (getGitHubIssueNodeIdTool as any).execute({
      owner,
      repo,
      number,
      type: 'pullrequest'
    });

    // Handle the union type - check if it's an AsyncIterable (streaming) or direct result
    if (Symbol.asyncIterator in result) {
      return {
        success: false,
        content: 'Tool returned streaming result, expected direct result'
      };
    }

    if (!result.success) {
      return {
        success: false,
        content: result.error || 'Failed to get pull request node ID'
      };
    }

    return {
      success: true,
      content: `🔀 **${result.title}** (#${result.number})\nNode ID: \`${result.nodeId}\`\n🔗 ${result.url}\n\nUse this node ID with add-item command.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

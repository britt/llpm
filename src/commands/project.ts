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

// Import project scan functionality
import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

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

// Import ProjectScan type for formatting
import type { ProjectScan } from '../types/projectScan';

function formatFullScanResult(scan: ProjectScan): string {
  const lines: string[] = [];

  // Header
  lines.push(`🔍 **Project Analysis: ${scan.projectName}**`);
  lines.push('');

  // Overview
  lines.push('## 📊 Overview');
  if (scan.overview.summary) {
    lines.push(scan.overview.summary);
    lines.push('');
  }
  lines.push(`- **Project Type**: ${scan.overview.projectType}`);
  lines.push(`- **Total Files**: ${scan.overview.totalFiles.toLocaleString()}`);
  lines.push(`- **Lines of Code**: ${scan.overview.totalLines.toLocaleString()}`);
  lines.push('');

  // Languages & Frameworks
  if (scan.overview.primaryLanguages.length > 0) {
    lines.push('## 💻 Languages');
    for (const lang of scan.overview.primaryLanguages) {
      lines.push(`  - ${lang}`);
    }
    lines.push('');
  }

  if (scan.overview.frameworks.length > 0) {
    lines.push('## 🛠️ Frameworks');
    for (const framework of scan.overview.frameworks) {
      lines.push(`  - ${framework}`);
    }
    lines.push('');
  }

  // Key Files
  if (scan.keyFiles.length > 0) {
    lines.push('## 📌 Key Files');
    for (const file of scan.keyFiles.slice(0, 10)) {
      lines.push(`  - **${file.path}** (${file.category}): ${file.reason}`);
    }
    if (scan.keyFiles.length > 10) {
      lines.push(`  ... and ${scan.keyFiles.length - 10} more`);
    }
    lines.push('');
  }

  // Dependencies
  if (scan.dependencies.packageManager || scan.dependencies.runtime.length > 0) {
    lines.push('## 📦 Dependencies');
    if (scan.dependencies.packageManager) {
      lines.push(`  **Package Manager**: ${scan.dependencies.packageManager}`);
    }
    if (scan.dependencies.runtime.length > 0) {
      lines.push(`  **Runtime**: ${scan.dependencies.runtime.length} packages`);
      const topDeps = scan.dependencies.runtime.slice(0, 5);
      for (const dep of topDeps) {
        lines.push(`    - ${dep.name}@${dep.version}${dep.purpose ? ` - ${dep.purpose}` : ''}`);
      }
      if (scan.dependencies.runtime.length > 5) {
        lines.push(`    ... and ${scan.dependencies.runtime.length - 5} more`);
      }
    }
    if (scan.dependencies.development.length > 0) {
      lines.push(`  **Development**: ${scan.dependencies.development.length} packages`);
    }
    lines.push('');
  }

  // Architecture
  if (scan.architecture.description || scan.architecture.components.length > 0) {
    lines.push('## 🏗️ Architecture');
    if (scan.architecture.description) {
      lines.push(scan.architecture.description);
      lines.push('');
    }
    if (scan.architecture.components.length > 0) {
      lines.push('**Components:**');
      for (const component of scan.architecture.components) {
        lines.push(`  - **${component.name}** (${component.type}): ${component.description}`);
      }
      lines.push('');
    }
    if (scan.architecture.mermaidDiagram) {
      lines.push('**Diagram:**');
      lines.push('```mermaid');
      lines.push(scan.architecture.mermaidDiagram);
      lines.push('```');
      lines.push('');
    }
  }

  // Documentation
  if (scan.documentation.hasDocumentation) {
    lines.push('## 📚 Documentation');
    if (scan.documentation.readmeSummary) {
      lines.push(scan.documentation.readmeSummary);
    }
    if (scan.documentation.docFiles.length > 0) {
      lines.push(`  Found ${scan.documentation.docFiles.length} documentation file(s)`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Scan saved to ~/.llpm/projects/${scan.projectId}/project.json*`);
  lines.push('*Use \`/project scan --force\` to rescan, or \`/project scan --no-llm\` for faster scan without architecture analysis.*');

  return lines.join('\n');
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

**Project Management:**
• /project add <name> <repository> <path> [description] - Add a new project
• /project list - List all available projects
• /project switch [project-id] - Switch to a different project (interactive if no ID)
• /project set <project-id> - Set current project (alias for switch)
• /project update <project-id> description "<description>" - Update project description
• /project remove <project-id> - Remove a project

**Project Analysis:**
• /project scan - Analyze the current project codebase and generate a summary

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
• /project scan`,
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

            return `${indicator}${project.name} (${project.id})\n    📂 ${project.repository}\n    📍 ${project.path}${description}`;
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

          // Check for --force and --no-llm flags
          const force = args.includes('--force');
          const skipLLM = args.includes('--no-llm');

          // Import orchestrator dynamically to avoid circular dependencies
          const { ProjectScanOrchestrator } = await import('../services/projectScanOrchestrator');

          const orchestrator = new ProjectScanOrchestrator();

          // Track progress for user feedback
          const progressLines: string[] = [];
          orchestrator.onProgress((progress) => {
            progressLines.push(`[${progress.phase}] ${progress.message}`);
          });

          const scan = await orchestrator.performFullScan({
            projectPath: currentProject.path,
            projectId: currentProject.id,
            projectName: currentProject.name,
            force,
            skipLLM,
          });

          // Format the result
          const result = formatFullScanResult(scan);

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

      default:
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nAvailable subcommands:\n• add <name> <repository> <path> [description] - Add a new project\n• list - List all available projects\n• switch <project-id> - Switch to a different project\n• set <project-id> - Set current project (alias for switch)\n• update <project-id> description "<description>" - Update project description\n• remove <project-id> - Remove a project`,
          success: false
        };
    }
  }
};

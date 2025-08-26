import type { Command, CommandResult } from './types';
import { getCurrentProject } from '../utils/projectConfig';
import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { debug } from '../utils/logger';

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

export const projectScanCommand: Command = {
  name: 'project-scan',
  description: 'Analyze the current project codebase and generate a summary',
  execute: async (args: string[] = []): Promise<CommandResult> => {
    debug('Executing /project-scan command with args:', args);

    // Handle help subcommand
    if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
      return {
        content: `🔍 Project Scan Command:

/project-scan - Analyze the current project codebase
/project-scan help - Show this help message

📝 Description:
Scans the current project directory to analyze:
- File types and languages
- Project structure
- Code metrics (lines of code, file sizes)
- Directory organization

The scan automatically ignores common build artifacts, dependencies, and hidden files.

🚀 Example:
/project-scan`,
        success: true
      };
    }

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
};
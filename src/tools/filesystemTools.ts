import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import * as z from "zod";
import { tool } from './instrumentedTool';
import { getCurrentProject } from '../utils/projectConfig';
import { debug } from '../utils/logger';

/**
 * Validates that a given path is within the current project directory
 */
async function validateProjectPath(requestedPath: string): Promise<string> {
  const currentProject = await getCurrentProject();
  
  if (!currentProject) {
    throw new Error('No active project set. Use /project switch <project-id> to set an active project.');
  }

  if (!currentProject.path) {
    throw new Error('Current project does not have a path configured.');
  }

  // Resolve both paths to prevent directory traversal attacks
  const projectPath = resolve(currentProject.path);
  const targetPath = resolve(requestedPath);
  
  // Check if target path is within project bounds
  const relativePath = relative(projectPath, targetPath);
  if (relativePath.startsWith('..') || relativePath === '..' || targetPath === projectPath.split(sep)[0]) {
    throw new Error(`Access denied: Path '${requestedPath}' is outside the current project directory '${projectPath}'`);
  }

  if (!existsSync(targetPath)) {
    throw new Error(`Path '${requestedPath}' does not exist.`);
  }

  return targetPath;
}

/**
 * Reads the contents of a file within the current project
 */
export const readProjectFile = tool({
  description: 'Read the contents of a file within the current project directory. Useful for understanding code structure, configuration files, documentation, etc.',
  parameters: z.object({
    path: z.string().describe('The file path to read (relative to project root or absolute path within project)'),
    encoding: z.enum(['utf8', 'binary']).default('utf8').describe('File encoding (default: utf8)')
  }),
  execute: async ({ path, encoding }) => {
    try {
      debug('Reading project file:', path);
      
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return 'Error: No active project set. Use /project switch <project-id> to set an active project.';
      }

      // If path is relative, make it relative to project root
      const fullPath = resolve(path.startsWith('/') ? path : join(currentProject.path, path));
      const validatedPath = await validateProjectPath(fullPath);
      
      const content = await readFile(validatedPath, encoding);
      
      if (encoding === 'binary') {
        return `Binary file content (${content.length} bytes): ${validatedPath}`;
      }
      
      return `File: ${relative(currentProject.path, validatedPath)}\n\n${content}`;
    } catch (error) {
      debug('Error reading project file:', error);
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});

/**
 * Lists files and directories within the current project
 */
export const listProjectDirectory = tool({
  description: 'List files and directories within the current project. Useful for exploring project structure and finding relevant files.',
  parameters: z.object({
    path: z.string().default('.').describe('Directory path to list (relative to project root or absolute path within project)'),
    includeHidden: z.boolean().default(false).describe('Include hidden files and directories (starting with .)'),
    recursive: z.boolean().default(false).describe('Recursively list subdirectories'),
    maxDepth: z.number().default(3).describe('Maximum recursion depth when recursive=true')
  }),
  execute: async ({ path, includeHidden, recursive, maxDepth }) => {
    try {
      debug('Listing project directory:', path);
      
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return 'Error: No active project set. Use /project switch <project-id> to set an active project.';
      }

      // If path is relative, make it relative to project root
      const fullPath = resolve(path === '.' ? currentProject.path : 
                              path.startsWith('/') ? path : join(currentProject.path, path));
      const validatedPath = await validateProjectPath(fullPath);
      
      const results: string[] = [];
      
      const listDirectory = async (dirPath: string, currentDepth: number = 0): Promise<void> => {
        if (recursive && currentDepth >= maxDepth) return;
        
        const entries = await readdir(dirPath);
        const filtered = includeHidden ? entries : entries.filter(entry => !entry.startsWith('.'));
        
        for (const entry of filtered.sort()) {
          const entryPath = join(dirPath, entry);
          const stats = await stat(entryPath);
          const relativePath = relative(currentProject.path, entryPath);
          
          if (stats.isDirectory()) {
            results.push(`📁 ${relativePath}/`);
            if (recursive) {
              await listDirectory(entryPath, currentDepth + 1);
            }
          } else {
            const size = stats.size;
            const sizeStr = size > 1024 ? `${Math.round(size / 1024)}KB` : `${size}B`;
            results.push(`📄 ${relativePath} (${sizeStr})`);
          }
        }
      };
      
      await listDirectory(validatedPath);
      
      const relativePath = relative(currentProject.path, validatedPath);
      const displayPath = relativePath === '' ? '.' : relativePath;
      
      return `Directory listing: ${displayPath}\n\n${results.join('\n')}`;
    } catch (error) {
      debug('Error listing project directory:', error);
      return `Error listing directory: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});

/**
 * Gets file information and statistics within the current project
 */
export const getProjectFileInfo = tool({
  description: 'Get detailed information about a file or directory within the current project (size, modification time, type, etc.).',
  parameters: z.object({
    path: z.string().describe('The file or directory path to inspect (relative to project root or absolute path within project)')
  }),
  execute: async ({ path }) => {
    try {
      debug('Getting project file info:', path);
      
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return 'Error: No active project set. Use /project switch <project-id> to set an active project.';
      }

      // If path is relative, make it relative to project root
      const fullPath = resolve(path.startsWith('/') ? path : join(currentProject.path, path));
      const validatedPath = await validateProjectPath(fullPath);
      
      const stats = await stat(validatedPath);
      const relativePath = relative(currentProject.path, validatedPath);
      
      const info = {
        path: relativePath,
        absolutePath: validatedPath,
        type: stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other',
        size: stats.size,
        sizeFormatted: stats.size > 1024 * 1024 
          ? `${Math.round(stats.size / (1024 * 1024))}MB` 
          : stats.size > 1024 
            ? `${Math.round(stats.size / 1024)}KB` 
            : `${stats.size}B`,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: stats.mode.toString(8),
        isReadable: true, // We validated access above
        isWritable: (stats.mode & 0o200) !== 0,
        isExecutable: (stats.mode & 0o100) !== 0
      };
      
      return `File Info: ${info.path}\n\n` +
             `Type: ${info.type}\n` +
             `Size: ${info.sizeFormatted} (${info.size} bytes)\n` +
             `Modified: ${info.modified}\n` +
             `Created: ${info.created}\n` +
             `Permissions: ${info.permissions}\n` +
             `Readable: ${info.isReadable}\n` +
             `Writable: ${info.isWritable}\n` +
             `Executable: ${info.isExecutable}`;
    } catch (error) {
      debug('Error getting project file info:', error);
      return `Error getting file info: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});

/**
 * Searches for files within the current project by name pattern
 */
export const findProjectFiles = tool({
  description: 'Search for files within the current project by name pattern. Useful for finding specific files or file types.',
  parameters: z.object({
    pattern: z.string().describe('File name pattern to search for (supports glob-like patterns: *.js, **/*.ts, etc.)'),
    maxResults: z.number().default(50).describe('Maximum number of results to return'),
    includeHidden: z.boolean().default(false).describe('Include hidden files and directories')
  }),
  execute: async ({ pattern, maxResults, includeHidden }) => {
    try {
      debug('Finding project files with pattern:', pattern);
      
      const currentProject = await getCurrentProject();
      if (!currentProject) {
        return 'Error: No active project set. Use /project switch <project-id> to set an active project.';
      }

      const results: string[] = [];
      
      // Simple pattern matching function
      const matchesPattern = (filePath: string, pattern: string): boolean => {
        // Simple cases
        if (pattern === '*') return true;
        if (pattern === filePath) return true;
        
        // Handle extension patterns like *.ts
        if (pattern.startsWith('*.')) {
          const ext = pattern.slice(2);
          return filePath.endsWith('.' + ext);
        }
        
        // Handle directory patterns like src/*.ts
        if (pattern.includes('/')) {
          const regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '[^/]*')
            .replace(/\*\*/g, '.*');
          return new RegExp(`^${regex}$`).test(filePath);
        }
        
        // Handle simple filename patterns
        const regex = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        return new RegExp(`^${regex}$`).test(filePath.split('/').pop() || '');
      };
      
      // Remove the old regex line since we're using matchesPattern now
      
      const searchDirectory = async (dirPath: string): Promise<void> => {
        if (results.length >= maxResults) return;
        
        const entries = await readdir(dirPath);
        const filtered = includeHidden ? entries : entries.filter(entry => !entry.startsWith('.'));
        
        for (const entry of filtered) {
          if (results.length >= maxResults) break;
          
          const entryPath = join(dirPath, entry);
          const stats = await stat(entryPath);
          const relativePath = relative(currentProject.path, entryPath);
          
          if (stats.isFile() && matchesPattern(relativePath, pattern)) {
            const size = stats.size > 1024 ? `${Math.round(stats.size / 1024)}KB` : `${stats.size}B`;
            results.push(`📄 ${relativePath} (${size})`);
          }
          
          if (stats.isDirectory()) {
            await searchDirectory(entryPath);
          }
        }
      };
      
      await searchDirectory(currentProject.path);
      
      return `Found ${results.length} files matching "${pattern}":\n\n${results.join('\n')}`;
    } catch (error) {
      debug('Error finding project files:', error);
      return `Error finding files: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
});
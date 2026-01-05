/**
 * Gitignore parsing and pattern matching utility
 * Uses the 'ignore' npm package for reliable gitignore-style pattern matching
 */

import ignore from 'ignore';
import { readFile, readdir } from 'fs/promises';
import { join, relative } from 'path';

/**
 * Default ignore patterns for common build artifacts, dependencies, and IDE files
 */
export const DEFAULT_IGNORE_PATTERNS = [
  // Version control
  '.git',
  '.svn',
  '.hg',

  // Dependencies
  'node_modules',
  'bower_components',
  'jspm_packages',
  'venv',
  '.venv',
  'env',
  '.env',
  '__pycache__',
  '*.pyc',
  '.eggs',
  '*.egg-info',
  'vendor',

  // Build outputs
  'dist',
  'build',
  'out',
  'target',
  '.next',
  '.nuxt',
  '.output',
  '.cache',
  '.parcel-cache',
  '.turbo',

  // IDE and editors
  '.idea',
  '.vscode',
  '*.swp',
  '*.swo',
  '*~',

  // Test coverage
  'coverage',
  '.nyc_output',
  'htmlcov',
  '.coverage',

  // OS files
  '.DS_Store',
  'Thumbs.db',
  'Desktop.ini',

  // Logs
  '*.log',
  'logs',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',

  // Lock files (optional - sometimes you want these)
  // 'package-lock.json',
  // 'yarn.lock',
  // 'bun.lockb',

  // Temporary files
  '*.tmp',
  '*.temp',
  '.tmp',
  '.temp',
];

/**
 * Options for creating an ignore filter
 */
export interface IgnoreFilterOptions {
  /** Include default ignore patterns (default: true) */
  includeDefaults?: boolean;
  /** Additional patterns to ignore */
  additionalPatterns?: string[];
  /** Respect nested .gitignore files in subdirectories (default: false) */
  respectNestedGitignore?: boolean;
}

/**
 * Filter function that returns true if a path should be ignored
 */
export type IgnoreFilter = (relativePath: string) => boolean;

/**
 * Load patterns from a .gitignore file
 *
 * @param projectPath - Path to the project root
 * @returns Array of gitignore patterns
 */
export async function loadGitignorePatterns(projectPath: string): Promise<string[]> {
  const gitignorePath = join(projectPath, '.gitignore');

  try {
    const content = await readFile(gitignorePath, 'utf-8');
    return parseGitignoreContent(content);
  } catch {
    // .gitignore doesn't exist or is unreadable
    return [];
  }
}

/**
 * Parse gitignore file content into patterns
 *
 * @param content - Raw content of .gitignore file
 * @returns Array of parsed patterns
 */
export function parseGitignoreContent(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .filter(line => {
      // Filter out any lines with null bytes or other invalid characters
      try {
        return !line.includes('\x00');
      } catch {
        return false;
      }
    });
}

/**
 * Find all .gitignore files in a directory tree
 *
 * @param projectPath - Path to the project root
 * @param maxDepth - Maximum depth to search (default: 5)
 * @returns Array of { path, patterns } objects
 */
export async function findNestedGitignores(
  projectPath: string,
  maxDepth: number = 5
): Promise<Array<{ dir: string; patterns: string[] }>> {
  const results: Array<{ dir: string; patterns: string[] }> = [];

  async function scanDir(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip if this path would be ignored by default patterns
        if (DEFAULT_IGNORE_PATTERNS.some(pattern => {
          const simplePattern = pattern.replace(/\*/g, '');
          return entry.name === simplePattern || entry.name.startsWith('.') && pattern.startsWith('.');
        })) {
          continue;
        }

        if (entry.name === '.gitignore' && entry.isFile()) {
          const patterns = await loadGitignorePatterns(dir);
          if (patterns.length > 0) {
            results.push({ dir: relative(projectPath, dir) || '.', patterns });
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDir(fullPath, depth + 1);
        }
      }
    } catch {
      // Directory unreadable, skip
    }
  }

  await scanDir(projectPath, 0);
  return results;
}

/**
 * Create an ignore filter function for a project
 *
 * @param projectPath - Path to the project root
 * @param options - Filter options
 * @returns Filter function that returns true if path should be ignored
 */
export async function createIgnoreFilter(
  projectPath: string,
  options: IgnoreFilterOptions = {}
): Promise<IgnoreFilter> {
  const {
    includeDefaults = true,
    additionalPatterns = [],
    respectNestedGitignore = false,
  } = options;

  const ig = ignore();

  // Add default patterns if requested
  if (includeDefaults) {
    ig.add(DEFAULT_IGNORE_PATTERNS);
  }

  // Add patterns from root .gitignore
  const rootPatterns = await loadGitignorePatterns(projectPath);
  if (rootPatterns.length > 0) {
    ig.add(rootPatterns);
  }

  // Add nested .gitignore patterns if requested
  if (respectNestedGitignore) {
    const nestedGitignores = await findNestedGitignores(projectPath);
    for (const { dir, patterns } of nestedGitignores) {
      // Prepend directory path to make patterns relative to project root
      const prefixedPatterns = patterns.map(pattern => {
        if (dir === '.') return pattern;
        // Handle negation patterns
        if (pattern.startsWith('!')) {
          return `!${join(dir, pattern.slice(1))}`;
        }
        return join(dir, pattern);
      });
      ig.add(prefixedPatterns);
    }
  }

  // Add additional patterns
  if (additionalPatterns.length > 0) {
    ig.add(additionalPatterns);
  }

  // Return the filter function
  return (relativePath: string): boolean => {
    // Normalize path separators
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return ig.ignores(normalizedPath);
  };
}

/**
 * Check if a single path matches any ignore patterns
 *
 * @param relativePath - Path relative to project root
 * @param patterns - Array of gitignore patterns
 * @returns true if path should be ignored
 */
export function matchesIgnorePatterns(relativePath: string, patterns: string[]): boolean {
  const ig = ignore();
  ig.add(patterns);
  return ig.ignores(relativePath.replace(/\\/g, '/'));
}

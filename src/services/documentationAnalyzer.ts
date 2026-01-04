/**
 * Documentation Analyzer
 * Analyzes project documentation including README files, doc folders, and code comments
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { FileInfo } from './projectAnalyzer';

/**
 * Parsed README content structure
 */
export interface ReadmeContent {
  title: string | null;
  description: string | null;
  sections: string[];
  hasInstallation: boolean;
  hasUsage: boolean;
  hasApiDocs: boolean;
  hasExamples: boolean;
}

/**
 * Code comment statistics
 */
export interface CommentStats {
  jsdocCount: number;
  docstringCount: number;
  inlineCount: number;
  blockCount: number;
  hasJsdoc: boolean;
  hasDocstrings: boolean;
}

/**
 * Documentation coverage assessment
 */
export interface DocumentationCoverage {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  hasReadme: boolean;
  docFileCount: number;
  commentRatio: number;
}

/**
 * Complete documentation analysis result
 */
export interface DocumentationAnalysisResult {
  readmePath: string | null;
  readmeSummary: string | null;
  readmeContent: ReadmeContent | null;
  hasDocumentation: boolean;
  docFiles: string[];
  coverage: DocumentationCoverage;
}

/**
 * README file patterns in order of preference
 */
const README_PATTERNS = [
  /^readme\.md$/i,
  /^readme\.markdown$/i,
  /^readme\.rst$/i,
  /^readme\.txt$/i,
  /^readme$/i,
];

/**
 * Find the README file from a list of files
 *
 * @param files - List of project files
 * @returns Path to README file or null
 */
export function findReadmeFile(files: FileInfo[]): string | null {
  // Try each pattern in order of preference
  for (const pattern of README_PATTERNS) {
    const readme = files.find(f => pattern.test(f.name));
    if (readme) {
      return readme.path;
    }
  }
  return null;
}

/**
 * Find documentation files in the project
 *
 * @param files - List of project files
 * @returns Array of documentation file paths
 */
export function findDocumentationFiles(files: FileInfo[]): string[] {
  const docFiles: string[] = [];

  for (const file of files) {
    // Skip README files
    if (/^readme/i.test(file.name)) {
      continue;
    }

    // Check if file is in docs/ or documentation/ directory
    const isInDocsDir =
      file.path.startsWith('docs/') ||
      file.path.startsWith('documentation/') ||
      file.path.includes('/docs/') ||
      file.path.includes('/documentation/');

    // Check if it's a documentation file type
    const isDocFile =
      file.extension === '.md' ||
      file.extension === '.markdown' ||
      file.extension === '.rst' ||
      file.extension === '.txt';

    // Include if in docs directory or is a root-level markdown file
    if (isInDocsDir && isDocFile) {
      docFiles.push(file.path);
    } else if (isDocFile && !file.path.includes('/')) {
      // Root-level documentation files (CONTRIBUTING.md, CHANGELOG.md, etc.)
      docFiles.push(file.path);
    }
  }

  return docFiles;
}

/**
 * Parse README content and extract structure
 *
 * @param content - Raw README content
 * @returns Parsed README structure
 */
export function parseReadmeContent(content: string): ReadmeContent {
  const result: ReadmeContent = {
    title: null,
    description: null,
    sections: [],
    hasInstallation: false,
    hasUsage: false,
    hasApiDocs: false,
    hasExamples: false,
  };

  if (!content || content.trim().length === 0) {
    return result;
  }

  const lines = content.split('\n');

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Extract sections (H2 headers)
  const sectionMatches = content.matchAll(/^##\s+(.+)$/gm);
  for (const match of sectionMatches) {
    result.sections.push(match[1].trim());
  }

  // Check for specific sections
  const lowerContent = content.toLowerCase();
  result.hasInstallation =
    lowerContent.includes('## installation') ||
    lowerContent.includes('## install') ||
    lowerContent.includes('## getting started') ||
    lowerContent.includes('## setup');

  result.hasUsage =
    lowerContent.includes('## usage') ||
    lowerContent.includes('## how to use') ||
    lowerContent.includes('## quick start');

  result.hasApiDocs =
    lowerContent.includes('## api') ||
    lowerContent.includes('## reference') ||
    lowerContent.includes('## documentation');

  result.hasExamples =
    lowerContent.includes('## example') ||
    lowerContent.includes('## examples') ||
    lowerContent.includes('## demo');

  // Extract description (first paragraph after title)
  let foundTitle = false;
  const descriptionLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!foundTitle) {
      if (trimmedLine.startsWith('# ')) {
        foundTitle = true;
      } else if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
        // No title, first paragraph is description
        result.description = trimmedLine;
        break;
      }
      continue;
    }

    // After title, collect description
    if (trimmedLine.length === 0) {
      if (descriptionLines.length > 0) {
        // End of paragraph
        break;
      }
      continue;
    }

    if (trimmedLine.startsWith('#')) {
      // Hit next header
      break;
    }

    descriptionLines.push(trimmedLine);
  }

  if (descriptionLines.length > 0) {
    result.description = descriptionLines.join(' ');
  }

  return result;
}

/**
 * Extract comment statistics from code content
 *
 * @param content - Source code content
 * @param extension - File extension
 * @returns Comment statistics
 */
export function extractCodeComments(content: string, extension: string): CommentStats {
  const stats: CommentStats = {
    jsdocCount: 0,
    docstringCount: 0,
    inlineCount: 0,
    blockCount: 0,
    hasJsdoc: false,
    hasDocstrings: false,
  };

  const isJsTs = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(extension);
  const isPython = extension === '.py';

  if (isJsTs) {
    // Count JSDoc comments (/** ... */)
    const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g);
    if (jsdocMatches) {
      stats.jsdocCount = jsdocMatches.length;
      stats.hasJsdoc = true;
    }

    // Count regular block comments (/* ... */ but not JSDoc)
    const blockMatches = content.match(/\/\*(?!\*)[\s\S]*?\*\//g);
    if (blockMatches) {
      stats.blockCount = blockMatches.length;
    }

    // Count inline comments (// ...)
    const inlineMatches = content.match(/\/\/.*$/gm);
    if (inlineMatches) {
      stats.inlineCount = inlineMatches.length;
    }
  } else if (isPython) {
    // Count docstrings (""" ... """ or ''' ... ''')
    const docstringMatches = content.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g);
    if (docstringMatches) {
      stats.docstringCount = docstringMatches.length;
      stats.hasDocstrings = true;
    }

    // Count hash comments
    const inlineMatches = content.match(/^[\t ]*#.*$/gm);
    if (inlineMatches) {
      stats.inlineCount = inlineMatches.length;
    }
  }

  return stats;
}

/**
 * Assess overall documentation coverage
 *
 * @param files - List of project files
 * @param hasReadme - Whether README exists
 * @param docFileCount - Number of documentation files
 * @param commentRatio - Ratio of comment lines to code lines
 * @returns Coverage assessment
 */
export function assessDocumentationCoverage(
  files: FileInfo[],
  hasReadme: boolean,
  docFileCount: number,
  commentRatio: number
): DocumentationCoverage {
  // Calculate score (0-100)
  let score = 0;

  // README is worth 30 points
  if (hasReadme) {
    score += 30;
  }

  // Doc files worth up to 30 points (3 points each, max 10 files)
  score += Math.min(docFileCount * 3, 30);

  // Comment ratio worth up to 40 points
  score += Math.min(commentRatio * 100, 40);

  // Determine level
  let level: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 80) {
    level = 'excellent';
  } else if (score >= 60) {
    level = 'good';
  } else if (score >= 30) {
    level = 'fair';
  } else {
    level = 'poor';
  }

  return {
    score,
    level,
    hasReadme,
    docFileCount,
    commentRatio,
  };
}

/**
 * Analyze project documentation
 *
 * @param projectPath - Path to project root
 * @param files - List of project files
 * @returns Documentation analysis result
 */
export async function analyzeDocumentation(
  projectPath: string,
  files: FileInfo[]
): Promise<DocumentationAnalysisResult> {
  // Find README
  const readmePath = findReadmeFile(files);
  let readmeContent: ReadmeContent | null = null;
  let readmeSummary: string | null = null;

  if (readmePath) {
    const fullReadmePath = join(projectPath, readmePath);
    if (existsSync(fullReadmePath)) {
      try {
        const content = await readFile(fullReadmePath, 'utf-8');
        readmeContent = parseReadmeContent(content);
        if (readmeContent.title || readmeContent.description) {
          readmeSummary = [readmeContent.title, readmeContent.description]
            .filter(Boolean)
            .join(': ');
        }
      } catch {
        // Failed to read README
      }
    }
  }

  // Find documentation files
  const docFiles = findDocumentationFiles(files);

  // Assess coverage (simplified - no code comment analysis yet)
  const coverage = assessDocumentationCoverage(
    files,
    readmePath !== null,
    docFiles.length,
    0 // Comment ratio would require reading all source files
  );

  return {
    readmePath,
    readmeSummary,
    readmeContent,
    hasDocumentation: readmePath !== null || docFiles.length > 0,
    docFiles,
    coverage,
  };
}

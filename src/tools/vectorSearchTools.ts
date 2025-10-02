import { tool } from './instrumentedTool';
import { z } from 'zod';
import { getCurrentProjectDatabase } from '../utils/projectDatabase';
import { debug } from '../utils/logger';
import type { Project } from '../types/project';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';

/**
 * AI Tools for semantic vector search across project files and notes
 * These tools allow the LLM to perform semantic search across:
 * - Project notes (stored in database)
 * - Project files (indexed with vector embeddings)
 */

export const indexProjectFiles = tool({
  description: 'Index project files for semantic vector search. This scans the project directory and creates vector embeddings for searchable files.',
  parameters: z.object({
    patterns: z.array(z.string()).optional().describe('Glob patterns for files to index (default: common code files)'),
    maxFileSize: z.number().optional().describe('Maximum file size in bytes to index (default: 100KB)'),
    forceReindex: z.boolean().optional().describe('Force re-indexing of all files even if already indexed')
  }),
  execute: async ({ patterns = ['**/*.{ts,tsx,js,jsx,py,md,txt,json}'], maxFileSize = 100000, forceReindex = false }) => {
    try {
      debug('Starting project file indexing with patterns:', patterns);
      
      const db = await getCurrentProjectDatabase();
      if (!db) {
        return { success: false, error: 'No current project database available' };
      }

      let indexedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Get current working directory as project root
      const projectRoot = process.cwd();
      
      for (const pattern of patterns) {
        try {
          const files = await glob(pattern, {
            cwd: projectRoot,
            ignore: [
              'node_modules/**',
              '.git/**',
              'dist/**',
              'build/**',
              '.next/**',
              'coverage/**',
              '**/*.log',
              '**/*.lock',
              'bun.lockb'
            ]
          });

          for (const filePath of files) {
            try {
              const fullPath = join(projectRoot, filePath);
              const relativePath = relative(projectRoot, fullPath);
              
              // Check file size
              const stats = await import('fs/promises').then(fs => fs.stat(fullPath));
              if (stats.size > maxFileSize) {
                debug(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
                skippedCount++;
                continue;
              }

              // Check if already indexed (unless force reindex)
              if (!forceReindex) {
                const existingFile = db.getFile(relativePath);
                if (existingFile && existingFile.updatedAt >= stats.mtime.toISOString()) {
                  debug(`File already indexed and up to date: ${relativePath}`);
                  skippedCount++;
                  continue;
                }
              }

              // Read file content
              const content = readFileSync(fullPath, 'utf-8');
              const fileType = filePath.split('.').pop() || 'unknown';

              // Add to database with vector embedding
              await db.addFile(relativePath, content, fileType);
              indexedCount++;
              
              debug(`Indexed file: ${relativePath}`);
            } catch (error) {
              debug(`Error indexing file ${filePath}:`, error);
              errorCount++;
            }
          }
        } catch (error) {
          debug(`Error with pattern ${pattern}:`, error);
          errorCount++;
        }
      }

      const stats = db.getStats();
      
      return {
        success: true,
        indexed: indexedCount,
        skipped: skippedCount,
        errors: errorCount,
        totalFiles: stats.filesCount,
        totalNotes: stats.notesCount
      };
    } catch (error) {
      debug('Error in indexProjectFiles:', error);
      return { success: false, error: String(error) };
    }
  }
});

export const semanticSearchProject = tool({
  description: 'Perform semantic search across project files and notes using vector embeddings. This finds content similar in meaning to the query, not just keyword matches.',
  parameters: z.object({
    query: z.string().describe('The search query to find semantically similar content'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return'),
    includeFiles: z.boolean().optional().default(true).describe('Include project files in search results'),
    includeNotes: z.boolean().optional().default(true).describe('Include project notes in search results'),
    minSimilarity: z.number().optional().default(0.1).describe('Minimum similarity score (0-1) for results')
  }),
  execute: async ({ query, limit = 10, includeFiles = true, includeNotes = true, minSimilarity = 0.1 }) => {
    try {
      debug('Starting semantic search for query:', query);
      
      const db = await getCurrentProjectDatabase();
      if (!db) {
        return { success: false, error: 'No current project database available' };
      }

      const results: Array<{
        type: 'file' | 'note';
        path?: string;
        title?: string;
        content: string;
        similarity: number;
        fileType?: string;
        size?: number;
      }> = [];

      // Search files if requested
      if (includeFiles) {
        const fileResults = await db.searchFilesSemantic(query, limit);
        for (const file of fileResults) {
          if (file.similarity >= minSimilarity) {
            results.push({
              type: 'file',
              path: file.path,
              content: file.content.substring(0, 1000) + (file.content.length > 1000 ? '...' : ''), // Truncate long content
              similarity: file.similarity,
              fileType: file.fileType,
              size: file.size
            });
          }
        }
      }

      // Search notes if requested
      if (includeNotes) {
        const noteResults = await db.searchNotesSemantica(query, limit);
        for (const note of noteResults) {
          if (note.similarity >= minSimilarity) {
            results.push({
              type: 'note',
              title: note.title,
              content: note.content,
              similarity: note.similarity
            });
          }
        }
      }

      // Sort all results by similarity
      results.sort((a, b) => b.similarity - a.similarity);
      
      // Limit final results
      const finalResults = results.slice(0, limit);

      return {
        success: true,
        query,
        results: finalResults,
        totalFound: results.length
      };
    } catch (error) {
      debug('Error in semanticSearchProject:', error);
      return { success: false, error: String(error) };
    }
  }
});

export const addProjectNote = tool({
  description: 'Add a note to the current project with vector embedding for semantic search.',
  parameters: z.object({
    title: z.string().describe('Title of the note'),
    content: z.string().describe('Content of the note'),
    tags: z.array(z.string()).optional().describe('Optional tags for the note')
  }),
  execute: async ({ title, content, tags }) => {
    try {
      const db = await getCurrentProjectDatabase();
      if (!db) {
        return { success: false, error: 'No current project database available' };
      }

      const note = await db.addNote(title, content, tags);
      
      return {
        success: true,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt
        }
      };
    } catch (error) {
      debug('Error in addProjectNote:', error);
      return { success: false, error: String(error) };
    }
  }
});

export const searchProjectNotes = tool({
  description: 'Search project notes using semantic vector search.',
  parameters: z.object({
    query: z.string().describe('Search query for finding relevant notes'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return')
  }),
  execute: async ({ query, limit = 10 }) => {
    try {
      const db = await getCurrentProjectDatabase();
      if (!db) {
        return { success: false, error: 'No current project database available' };
      }

      const results = await db.searchNotesSemantica(query, limit);
      
      return {
        success: true,
        query,
        notes: results.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          similarity: note.similarity,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }))
      };
    } catch (error) {
      debug('Error in searchProjectNotes:', error);
      return { success: false, error: String(error) };
    }
  }
});

export const getProjectVectorStats = tool({
  description: 'Get statistics about the project vector database including indexed files, notes, and search capabilities.',
  execute: async () => {
    try {
      const db = await getCurrentProjectDatabase();
      if (!db) {
        return { success: false, error: 'No current project database available' };
      }

      const stats = db.getStats();
      
      // Get sample files to show what's indexed
      const sampleFiles = db.getFiles().slice(0, 5);
      const sampleNotes = db.getNotes().slice(0, 5);
      
      return {
        success: true,
        stats: {
          totalFiles: stats.filesCount,
          totalNotes: stats.notesCount,
          totalMetadata: stats.metadataCount
        },
        sampleFiles: sampleFiles.map(f => ({
          path: f.path,
          fileType: f.fileType,
          size: f.size,
          hasEmbedding: !!f.embedding
        })),
        sampleNotes: sampleNotes.map(n => ({
          id: n.id,
          title: n.title,
          hasEmbedding: !!n.embedding,
          createdAt: n.createdAt
        }))
      };
    } catch (error) {
      debug('Error in getProjectVectorStats:', error);
      return { success: false, error: String(error) };
    }
  }
});